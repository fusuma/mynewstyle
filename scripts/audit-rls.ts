/**
 * RLS Audit Script — Story 11.5
 *
 * Static analysis of SQL migration files and schema files to verify:
 *   1. Every public-schema table has RLS enabled.
 *   2. Every public-schema table has REVOKE ALL before any GRANT
 *      (or a deny-all policy, or no GRANTs at all).
 *
 * Run via: npm run audit:rls
 * Exit 0 on success, exit 1 on failure.
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export interface SqlFile {
  /** Base filename (used for ordering and reporting) */
  name: string;
  /** Full SQL content */
  content: string;
}

export interface TableInfo {
  /** Unqualified table name (e.g. "favorites", not "public.favorites") */
  name: string;
  /** Index into the files array where this table was first created */
  createdAtFileIndex: number;
}

export type ViolationType =
  | 'missing-rls'
  | 'missing-revoke'
  | 'grant-before-revoke';

export interface Violation {
  table: string;
  type: ViolationType;
  message: string;
}

export interface AuditResult {
  passed: boolean;
  tables: string[];
  violations: Violation[];
}

// ---------------------------------------------------------------------------
// Regex helpers
// ---------------------------------------------------------------------------

/**
 * Normalises an identifier: strips optional "public." prefix and lowercases.
 */
function normaliseName(raw: string): string {
  return raw.replace(/^public\./i, '').toLowerCase().trim();
}

/**
 * Strips SQL line comments (-- ...) and block comments (/* ... *\/) so they
 * do not interfere with pattern matching.
 */
function stripComments(sql: string): string {
  // Remove block comments first (non-greedy)
  let out = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Remove line comments
  out = out.replace(/--[^\n]*/g, ' ');
  return out;
}

/**
 * Removes content inside DO $$ ... $$ blocks so dynamic DDL is not
 * accidentally matched by the table-extraction regex.
 */
function stripDollarBlocks(sql: string): string {
  // Match DO $$ ... $$; or DO $sql$ ... $sql$; style blocks
  return sql.replace(/DO\s+\$[^$]*\$[\s\S]*?\$[^$]*\$/gi, '/* DO_BLOCK_REMOVED */');
}

// ---------------------------------------------------------------------------
// parseSqlFiles
// ---------------------------------------------------------------------------

/**
 * Parses an ordered list of SQL files and returns the set of public-schema
 * tables discovered (first occurrence).
 *
 * Tables inside DO $$ ... $$ dynamic blocks are intentionally ignored
 * (cannot be reliably detected by regex).
 */
export function parseSqlFiles(files: SqlFile[]): TableInfo[] {
  const seen = new Map<string, number>(); // name → file index

  for (let i = 0; i < files.length; i++) {
    const cleaned = stripDollarBlocks(stripComments(files[i].content));

    // Match:
    //   CREATE [TEMPORARY] TABLE [IF NOT EXISTS] [public.]<name>
    // Capture the optional schema qualifier + table name.
    // We exclude names that start with a known non-public schema.
    // TEMPORARY tables are session-scoped and do not need RLS — skip them.
    const pattern =
      /CREATE\s+(TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_.]*)/gi;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(cleaned)) !== null) {
      // Skip TEMPORARY tables — they are session-scoped and do not use RLS
      if (match[1]) {
        continue;
      }

      const rawName = match[2].trim();

      // Determine schema
      const dotIdx = rawName.indexOf('.');
      if (dotIdx !== -1) {
        const schema = rawName.substring(0, dotIdx).toLowerCase();
        if (schema !== 'public') {
          // Non-public schema (e.g. auth, private) — skip
          continue;
        }
      }
      // Unqualified OR public-qualified → public schema table
      const name = normaliseName(rawName);

      if (!seen.has(name)) {
        seen.set(name, i);
      }
    }
  }

  return Array.from(seen.entries()).map(([name, createdAtFileIndex]) => ({
    name,
    createdAtFileIndex,
  }));
}

// ---------------------------------------------------------------------------
// checkRlsCompliance
// ---------------------------------------------------------------------------

/**
 * Performs the full RLS audit against an ordered list of SQL files.
 *
 * Rules per table:
 *   1. `ALTER TABLE [public.]<name> ENABLE ROW LEVEL SECURITY` must appear
 *      in the same or a later file than the CREATE TABLE.
 *   2. `REVOKE ALL ON [public.]<name> FROM anon[, authenticated]` must
 *      appear before any `GRANT ... ON [public.]<name> TO ...`.
 *      OR a deny-all policy `USING (false) WITH CHECK (false)` is present.
 *      OR `REVOKE ALL ON ALL TABLES IN SCHEMA public` appears at any point.
 *      OR no GRANT exists at all (REVOKE-only is fine for service-role tables).
 */
export function checkRlsCompliance(files: SqlFile[]): AuditResult {
  const tables = parseSqlFiles(files);
  const violations: Violation[] = [];

  // Build per-file cleaned content for event extraction
  const cleaned = files.map((f) => ({
    name: f.name,
    content: stripComments(f.content),
  }));

  // Check for blanket REVOKE ALL ON ALL TABLES IN SCHEMA public at any file
  const blanketRevokeFileIndex = (() => {
    for (let i = 0; i < cleaned.length; i++) {
      if (
        /REVOKE\s+ALL\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+FROM\s+(?:anon|authenticated)/i.test(
          cleaned[i].content
        )
      ) {
        return i;
      }
    }
    return -1;
  })();

  for (const table of tables) {
    const name = table.name;

    // ----- AC-1: RLS enabled -----
    let rlsEnabled = false;
    for (let i = table.createdAtFileIndex; i < cleaned.length; i++) {
      // Match: ALTER TABLE [public.]<name> ENABLE ROW LEVEL SECURITY
      const rlsPattern = new RegExp(
        `ALTER\\s+TABLE\\s+(?:public\\.)?${escapeRegex(name)}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i'
      );
      if (rlsPattern.test(cleaned[i].content)) {
        rlsEnabled = true;
        break;
      }
    }

    if (!rlsEnabled) {
      violations.push({
        table: name,
        type: 'missing-rls',
        message: `Table "public.${name}" does not have RLS enabled (ALTER TABLE ... ENABLE ROW LEVEL SECURITY not found).`,
      });
      // Still check REVOKE/GRANT to collect all violations
    }

    // ----- AC-2: REVOKE before GRANT -----
    // Collect all REVOKE and GRANT events across all files (global order)
    // We model each as { type: 'revoke' | 'grant', position: global_char_position }

    // Build a flat ordered list of events for this table
    type Event = { kind: 'revoke' | 'grant' | 'deny-all-policy'; fileIndex: number; offset: number };
    const events: Event[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i].content;

      // REVOKE ALL ON [public.]<name> FROM ...
      const revokePattern = new RegExp(
        `REVOKE\\s+ALL\\s+ON\\s+(?:public\\.)?${escapeRegex(name)}\\s+FROM\\s+(?:anon|authenticated)`,
        'gi'
      );
      let m: RegExpExecArray | null;
      while ((m = revokePattern.exec(c)) !== null) {
        events.push({ kind: 'revoke', fileIndex: i, offset: m.index });
      }

      // GRANT ... ON [public.]<name> TO ...
      const grantPattern = new RegExp(
        `GRANT\\s+[A-Z,\\s*]+ON\\s+(?:public\\.)?${escapeRegex(name)}\\s+TO\\s+`,
        'gi'
      );
      while ((m = grantPattern.exec(c)) !== null) {
        events.push({ kind: 'grant', fileIndex: i, offset: m.index });
      }

      // Deny-all policy: USING (false) WITH CHECK (false) on this table
      // This pattern: ON [public.]<name> ... USING (false)
      const denyAllPattern = new RegExp(
        `ON\\s+(?:public\\.)?${escapeRegex(name)}\\s[\\s\\S]{0,200}?USING\\s*\\(\\s*false\\s*\\)`,
        'gi'
      );
      while ((m = denyAllPattern.exec(c)) !== null) {
        events.push({ kind: 'deny-all-policy', fileIndex: i, offset: m.index });
      }
    }

    // Sort events by file index, then offset within file
    events.sort((a, b) =>
      a.fileIndex !== b.fileIndex ? a.fileIndex - b.fileIndex : a.offset - b.offset
    );

    const grants = events.filter((e) => e.kind === 'grant');
    const revokes = events.filter((e) => e.kind === 'revoke');
    const hasDenyAll = events.some((e) => e.kind === 'deny-all-policy');

    // Blanket REVOKE satisfies the REVOKE requirement for this table,
    // but ordering still applies: any GRANT before the blanket REVOKE file is a violation.
    const hasBlanketRevoke = blanketRevokeFileIndex >= 0;

    // A GRANT that comes before the blanket REVOKE is still a grant-before-revoke violation.
    const hasGrantBeforeBlanketRevoke =
      hasBlanketRevoke &&
      grants.some(
        (g) =>
          g.fileIndex < blanketRevokeFileIndex ||
          (g.fileIndex === blanketRevokeFileIndex && g.offset < 0) // offset not tracked for blanket
      );

    const hasRevoke = revokes.length > 0 || hasBlanketRevoke || hasDenyAll;
    const hasGrant = grants.length > 0;

    if (!hasGrant && !hasRevoke) {
      // No grants and no revokes → missing-revoke violation
      // (table should explicitly REVOKE or have a deny-all policy)
      violations.push({
        table: name,
        type: 'missing-revoke',
        message: `Table "public.${name}" has no REVOKE ALL statement and no deny-all policy. Add REVOKE ALL ON public.${name} FROM anon, authenticated.`,
      });
    } else if (hasGrant && !hasRevoke) {
      // GRANT exists but no REVOKE
      violations.push({
        table: name,
        type: 'missing-revoke',
        message: `Table "public.${name}" has GRANT statements but no REVOKE ALL before them. Add REVOKE ALL ON public.${name} FROM anon, authenticated before the first GRANT.`,
      });
    } else if (hasGrant && hasBlanketRevoke && !hasDenyAll && hasGrantBeforeBlanketRevoke) {
      // GRANT exists before the blanket REVOKE file — ordering violation
      violations.push({
        table: name,
        type: 'grant-before-revoke',
        message: `Table "public.${name}" has a GRANT before REVOKE ALL ON ALL TABLES IN SCHEMA public. Move the blanket REVOKE before all GRANT statements.`,
      });
    } else if (hasGrant && hasRevoke && !hasDenyAll && !hasBlanketRevoke) {
      // Both specific REVOKE and GRANT exist — check ordering: first revoke must come before first grant
      const firstRevoke = revokes[0];
      const firstGrant = grants[0];
      const revokeComesFirst =
        firstRevoke.fileIndex < firstGrant.fileIndex ||
        (firstRevoke.fileIndex === firstGrant.fileIndex &&
          firstRevoke.offset < firstGrant.offset);

      if (!revokeComesFirst) {
        violations.push({
          table: name,
          type: 'grant-before-revoke',
          message: `Table "public.${name}" has a GRANT before REVOKE ALL. Move REVOKE ALL before all GRANT statements.`,
        });
      }
    }
    // If hasDenyAll: accept as compliant (deny-all policy is equivalent to REVOKE for audit purposes)
  }

  return {
    passed: violations.length === 0,
    tables: tables.map((t) => t.name),
    violations,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// File discovery and main entry point
// ---------------------------------------------------------------------------

/**
 * Loads SQL files from both migration directories in lexicographic order.
 * Schema files come after migration files in the combined ordering.
 */
export function loadSqlFiles(projectRoot: string): SqlFile[] {
  const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
  const schemaDir = path.join(projectRoot, 'src', 'lib', 'supabase', 'schema');

  const files: SqlFile[] = [];

  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexicographic = chronological for timestamp-prefixed files

    for (const f of migrationFiles) {
      files.push({
        name: f,
        content: fs.readFileSync(path.join(migrationsDir, f), 'utf-8'),
      });
    }
  }

  if (fs.existsSync(schemaDir)) {
    const schemaFiles = fs
      .readdirSync(schemaDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const f of schemaFiles) {
      files.push({
        name: f,
        content: fs.readFileSync(path.join(schemaDir, f), 'utf-8'),
      });
    }
  }

  return files;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(): void {
  const projectRoot = path.resolve(process.cwd());
  const files = loadSqlFiles(projectRoot);

  if (files.length === 0) {
    console.error('ERROR: No SQL files found in supabase/migrations/ or src/lib/supabase/schema/');
    process.exit(1);
  }

  console.log(`\nRLS Audit — scanning ${files.length} SQL file(s)...\n`);
  files.forEach((f) => console.log(`  [+] ${f.name}`));
  console.log();

  const result = checkRlsCompliance(files);

  if (result.passed) {
    console.log(`✅  All ${result.tables.length} public-schema table(s) pass RLS audit.\n`);
    console.log('Tables checked:');
    result.tables.forEach((t) => console.log(`  ✓ ${t}`));
    console.log();
    process.exit(0);
  } else {
    console.error(`❌  RLS audit FAILED — ${result.violations.length} violation(s) found:\n`);
    for (const v of result.violations) {
      console.error(`  [${v.type.toUpperCase()}] ${v.message}`);
    }
    console.error();
    process.exit(1);
  }
}

// Run only when executed directly (not when imported by tests)
if (
  process.argv[1] &&
  (process.argv[1].endsWith('audit-rls.ts') || process.argv[1].endsWith('audit-rls.js'))
) {
  main();
}
