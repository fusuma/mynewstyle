/**
 * Tests for the RLS audit script (scripts/audit-rls.ts)
 * Story 11.5: RLS Audit in CI/CD
 *
 * The audit script performs static analysis on SQL migration files and schema
 * files to verify every public-schema table has:
 *   1. RLS enabled (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
 *   2. REVOKE ALL before any GRANT (SOSLeiria pattern)
 */

import { describe, it, expect } from 'vitest';
import {
  parseSqlFiles,
  checkRlsCompliance,
  type SqlFile,
} from '../../scripts/audit-rls';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, content: string): SqlFile {
  return { name, content };
}

// ---------------------------------------------------------------------------
// Unit: parseSqlFiles
// ---------------------------------------------------------------------------

describe('parseSqlFiles – table extraction', () => {
  it('extracts a schema-qualified CREATE TABLE', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE IF NOT EXISTS public.my_table (id UUID);'),
    ];
    const tables = parseSqlFiles(files);
    expect(tables.map((t) => t.name)).toContain('my_table');
  });

  it('extracts an unqualified CREATE TABLE (defaults to public schema)', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE IF NOT EXISTS favorites (id UUID);'),
    ];
    const tables = parseSqlFiles(files);
    expect(tables.map((t) => t.name)).toContain('favorites');
  });

  it('ignores CREATE VIEW and CREATE OR REPLACE VIEW', () => {
    const sql = `
      CREATE VIEW public.my_view AS SELECT 1;
      CREATE OR REPLACE VIEW public.another_view AS SELECT 2;
      CREATE TABLE public.real_table (id UUID);
    `;
    const files: SqlFile[] = [makeFile('001.sql', sql)];
    const tables = parseSqlFiles(files);
    const names = tables.map((t) => t.name);
    expect(names).not.toContain('my_view');
    expect(names).not.toContain('another_view');
    expect(names).toContain('real_table');
  });

  it('ignores tables in non-public schemas', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE auth.users (id UUID);'),
    ];
    const tables = parseSqlFiles(files);
    expect(tables.map((t) => t.name)).not.toContain('users');
  });

  it('handles IF NOT EXISTS clause', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE IF NOT EXISTS public.tbl (id UUID);'),
    ];
    const tables = parseSqlFiles(files);
    expect(tables.map((t) => t.name)).toContain('tbl');
  });

  it('does not duplicate a table that appears in multiple files', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE public.tbl (id UUID);'),
      makeFile('002.sql', 'ALTER TABLE public.tbl ADD COLUMN foo TEXT;'),
    ];
    const tables = parseSqlFiles(files);
    const names = tables.map((t) => t.name);
    expect(names.filter((n) => n === 'tbl').length).toBe(1);
  });

  it('records the file index where the table was first created', () => {
    const files: SqlFile[] = [
      makeFile('000.sql', '-- empty'),
      makeFile('001.sql', 'CREATE TABLE public.tbl (id UUID);'),
    ];
    const tables = parseSqlFiles(files);
    const tbl = tables.find((t) => t.name === 'tbl');
    expect(tbl?.createdAtFileIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Unit: checkRlsCompliance – RLS detection
// ---------------------------------------------------------------------------

describe('checkRlsCompliance – RLS enabled check', () => {
  it('passes a table that has RLS enabled in the same file', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.tbl FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'tbl' && v.type === 'missing-rls')).toHaveLength(0);
  });

  it('passes a table that has RLS enabled in a later file', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE public.tbl (id UUID);'),
      makeFile('002.sql', `
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.tbl FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'tbl' && v.type === 'missing-rls')).toHaveLength(0);
  });

  it('fails a table that never gets RLS enabled', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        REVOKE ALL ON public.tbl FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.some((v) => v.table === 'tbl' && v.type === 'missing-rls')).toBe(true);
  });

  it('accepts unqualified ALTER TABLE for an unqualified CREATE TABLE', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE favorites (id UUID);
        ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON favorites FROM anon;
        REVOKE ALL ON favorites FROM authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'favorites' && v.type === 'missing-rls')).toHaveLength(0);
  });

  it('accepts schema-qualified ALTER TABLE for an unqualified CREATE TABLE', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE favorites (id UUID);
        ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.favorites FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'favorites' && v.type === 'missing-rls')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unit: checkRlsCompliance – REVOKE before GRANT check
// ---------------------------------------------------------------------------

describe('checkRlsCompliance – REVOKE before GRANT check', () => {
  it('passes when REVOKE ALL precedes GRANT (combined FROM anon, authenticated)', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.tbl FROM anon, authenticated;
        GRANT SELECT ON public.tbl TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    const violations = result.violations.filter((v) => v.table === 'tbl');
    expect(violations).toHaveLength(0);
  });

  it('passes when REVOKE ALL FROM anon and REVOKE ALL FROM authenticated are separate', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE favorites (id UUID);
        ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON favorites FROM anon;
        REVOKE ALL ON favorites FROM authenticated;
        GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'favorites')).toHaveLength(0);
  });

  it('fails when GRANT appears before REVOKE', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.tbl TO authenticated;
        REVOKE ALL ON public.tbl FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.some((v) => v.table === 'tbl' && v.type === 'grant-before-revoke')).toBe(true);
  });

  it('fails when GRANT exists but REVOKE is missing', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.tbl TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.some((v) => v.table === 'tbl' && v.type === 'missing-revoke')).toBe(true);
  });

  it('passes when table has no GRANT (REVOKE-only is fine for service-role-only tables)', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE alert_history (id UUID);
        ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON alert_history FROM anon;
        REVOKE ALL ON alert_history FROM authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'alert_history')).toHaveLength(0);
  });

  it('passes when table has a deny-all policy (USING false) as equivalent to REVOKE', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.monitoring_daily_summaries (id UUID);
        ALTER TABLE public.monitoring_daily_summaries ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "service_role_only" ON public.monitoring_daily_summaries FOR ALL USING (false) WITH CHECK (false);
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'monitoring_daily_summaries')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unit: Blanket REVOKE ALL ON ALL TABLES IN SCHEMA public
// ---------------------------------------------------------------------------

describe('checkRlsCompliance – blanket REVOKE', () => {
  it('counts REVOKE ALL ON ALL TABLES IN SCHEMA public as satisfying REVOKE for all tables', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl_a (id UUID);
        CREATE TABLE public.tbl_b (id UUID);
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
        ALTER TABLE public.tbl_a ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.tbl_b ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.tbl_a TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => ['tbl_a', 'tbl_b'].includes(v.table))).toHaveLength(0);
  });

  it('still requires RLS even if blanket REVOKE is present', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl_a (id UUID);
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.some((v) => v.table === 'tbl_a' && v.type === 'missing-rls')).toBe(true);
  });

  it('fails when a GRANT appears in a file before the blanket REVOKE file', () => {
    // Security regression: a GRANT in an earlier migration before the blanket REVOKE
    // must be flagged as grant-before-revoke, not silently accepted.
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.tbl TO anon;
      `),
      makeFile('002.sql', `
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.some((v) => v.table === 'tbl' && v.type === 'grant-before-revoke')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit: Non-public schema tables are ignored
// ---------------------------------------------------------------------------

describe('checkRlsCompliance – non-public schema tables ignored', () => {
  it('ignores tables in the auth schema', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE auth.users (id UUID);'),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations).toHaveLength(0);
  });

  it('ignores tables in a custom schema', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE private.secret_table (id UUID);'),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unit: Overall audit result structure
// ---------------------------------------------------------------------------

describe('checkRlsCompliance – audit result', () => {
  it('returns passed=true and no violations when all tables are compliant', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.tbl FROM anon, authenticated;
        GRANT SELECT ON public.tbl TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('returns passed=false when there are violations', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE public.tbl (id UUID);'),
    ];
    const result = checkRlsCompliance(files);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('includes violation details with table name, type, and message', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', 'CREATE TABLE public.tbl (id UUID);'),
    ];
    const result = checkRlsCompliance(files);
    const violation = result.violations[0];
    expect(violation).toHaveProperty('table');
    expect(violation).toHaveProperty('type');
    expect(violation).toHaveProperty('message');
  });
});

// ---------------------------------------------------------------------------
// Integration: Correct handling of existing migrations (all should pass)
// ---------------------------------------------------------------------------

describe('checkRlsCompliance – existing migration patterns', () => {
  it('passes the analytics_events pattern (combined REVOKE FROM anon, authenticated)', () => {
    const files: SqlFile[] = [
      makeFile('20260302400000.sql', `
        CREATE TABLE IF NOT EXISTS public.analytics_events (id UUID);
        ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.analytics_events FROM anon, authenticated;
        GRANT INSERT ON public.analytics_events TO anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'analytics_events')).toHaveLength(0);
  });

  it('passes the favorites pattern (separate REVOKE FROM anon; REVOKE FROM authenticated)', () => {
    const files: SqlFile[] = [
      makeFile('20260302200000.sql', `
        CREATE TABLE IF NOT EXISTS favorites (id UUID);
        ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON favorites FROM anon;
        REVOKE ALL ON favorites FROM authenticated;
        GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'favorites')).toHaveLength(0);
  });

  it('passes the referral_codes pattern', () => {
    const files: SqlFile[] = [
      makeFile('20260302300000.sql', `
        CREATE TABLE IF NOT EXISTS referral_codes (id UUID);
        ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON referral_codes FROM anon;
        REVOKE ALL ON referral_codes FROM authenticated;
        GRANT SELECT ON referral_codes TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'referral_codes')).toHaveLength(0);
  });

  it('passes the alert_history pattern (REVOKE-only, no GRANT needed)', () => {
    const files: SqlFile[] = [
      makeFile('20260302600000.sql', `
        CREATE TABLE IF NOT EXISTS alert_history (id UUID);
        ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON alert_history FROM anon;
        REVOKE ALL ON alert_history FROM authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'alert_history')).toHaveLength(0);
  });

  it('passes the monitoring_daily_summaries pattern (deny-all RLS policy, no REVOKE)', () => {
    const files: SqlFile[] = [
      makeFile('20260302500000.sql', `
        CREATE TABLE IF NOT EXISTS public.monitoring_daily_summaries (id UUID);
        ALTER TABLE public.monitoring_daily_summaries ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "service_role_only_monitoring_summaries"
          ON public.monitoring_daily_summaries
          FOR ALL
          USING (false)
          WITH CHECK (false);
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'monitoring_daily_summaries')).toHaveLength(0);
  });

  it('passes the profiles pattern (REVOKE FROM anon, authenticated combined)', () => {
    const files: SqlFile[] = [
      makeFile('profiles.sql', `
        CREATE TABLE IF NOT EXISTS profiles (id UUID);
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON profiles FROM anon, authenticated;
        GRANT SELECT, UPDATE, INSERT ON profiles TO authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'profiles')).toHaveLength(0);
  });

  it('passes the ai_calls pattern (RLS + REVOKE, service-role-only)', () => {
    const files: SqlFile[] = [
      makeFile('ai-calls.sql', `
        CREATE TABLE IF NOT EXISTS ai_calls (id UUID);
        ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON ai_calls FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'ai_calls')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: Edge cases
// ---------------------------------------------------------------------------

describe('checkRlsCompliance – edge cases', () => {
  it('handles tables created in DO $$ EXECUTE $$ blocks (skips them, no false positive)', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        DO $$
        BEGIN
          EXECUTE $sql$
            CREATE TABLE IF NOT EXISTS public.dynamic_table (id UUID);
          $sql$;
        END $$;
        CREATE TABLE public.real_table (id UUID);
        ALTER TABLE public.real_table ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.real_table FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    // dynamic_table inside DO block should be ignored (not detectable by regex)
    // real_table should pass
    expect(result.violations.filter((v) => v.table === 'real_table')).toHaveLength(0);
  });

  it('handles multiple tables in lexicographic file order', () => {
    const files: SqlFile[] = [
      makeFile('001_create.sql', `
        CREATE TABLE public.tbl_a (id UUID);
        CREATE TABLE public.tbl_b (id UUID);
      `),
      makeFile('002_rls.sql', `
        ALTER TABLE public.tbl_a ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.tbl_b ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.tbl_a FROM anon, authenticated;
        REVOKE ALL ON public.tbl_b FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations).toHaveLength(0);
  });

  it('ignores ALTER TABLE in a later migration that re-enables RLS (counts as pass)', () => {
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.tbl (id UUID);
        REVOKE ALL ON public.tbl FROM anon, authenticated;
      `),
      makeFile('002.sql', `
        ALTER TABLE public.tbl ENABLE ROW LEVEL SECURITY;
      `),
    ];
    const result = checkRlsCompliance(files);
    expect(result.violations.filter((v) => v.table === 'tbl' && v.type === 'missing-rls')).toHaveLength(0);
  });

  it('skips TEMPORARY tables — they are session-scoped and do not need RLS', () => {
    // TEMPORARY tables should not appear in audit results or generate violations.
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TEMPORARY TABLE tmp_work (id UUID);
        CREATE TABLE public.real_table (id UUID);
        ALTER TABLE public.real_table ENABLE ROW LEVEL SECURITY;
        REVOKE ALL ON public.real_table FROM anon, authenticated;
      `),
    ];
    const result = checkRlsCompliance(files);
    // tmp_work must not appear in tables list or violations
    expect(result.tables).not.toContain('tmp_work');
    expect(result.violations.filter((v) => v.table === 'tmp_work')).toHaveLength(0);
    // real_table must pass
    expect(result.violations.filter((v) => v.table === 'real_table')).toHaveLength(0);
  });

  it('raises both missing-rls and missing-revoke for a completely unprotected table', () => {
    // A table with neither RLS nor REVOKE should produce two separate violations.
    const files: SqlFile[] = [
      makeFile('001.sql', `
        CREATE TABLE public.naked_table (id UUID);
      `),
    ];
    const result = checkRlsCompliance(files);
    const violations = result.violations.filter((v) => v.table === 'naked_table');
    const types = violations.map((v) => v.type).sort();
    expect(types).toContain('missing-rls');
    expect(types).toContain('missing-revoke');
  });
});
