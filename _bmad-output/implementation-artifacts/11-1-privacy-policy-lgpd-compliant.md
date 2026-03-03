# Story 11.1: Privacy Policy (LGPD Compliant)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **a clear, comprehensive privacy policy in Portuguese that fully explains how my data is handled, including biometric (facial) data processing**,
so that **I understand my rights under the LGPD and can make informed decisions about sharing my personal information with the platform**.

## Acceptance Criteria

1. **Portuguese language** — The entire privacy policy page MUST be written in Portuguese (PT-PT/PT-BR as used across the app).
2. **Comprehensive coverage** — The policy MUST cover: data collected, purpose of processing, data retention periods, user rights, and third-party sharing (specifically AI providers: Google Gemini, OpenAI, Kie.ai).
3. **Biometric data disclosure** — The policy MUST specifically mention that facial photo analysis constitutes biometric data processing under the LGPD and explain the legal basis (explicit consent).
4. **Contact for data requests** — The policy MUST include a contact email (`privacidade@mynewstyle.com.br`) for exercising LGPD rights, with a response SLA (15 business days).
5. **Accessible from landing page footer and registration** — The privacy policy link MUST be reachable from:
   - The site footer (`/privacidade` link already exists in `Footer.tsx`)
   - The registration page consent checkbox (link already exists in registration form)

## Tasks / Subtasks

- [x] Task 1: Audit and enhance existing privacy policy page content (AC: #1, #2, #3, #4)
  - [x] 1.1 Review existing `/privacidade` page content for LGPD compliance gaps
  - [x] 1.2 Enhance Section 2 (Dados Coletados) — add explicit mention of: email, name, display_name, gender_preference, guest_session_id, device_info, analytics_events. List ALL data per the DB schema.
  - [x] 1.3 Enhance Section 3 (Finalidade) — expand to cover each purpose: visagism consultation, payment processing, analytics/funnel optimization, share card generation, user profile management.
  - [x] 1.4 Enhance Section 4 (Dados Biometricos) — add explicit legal basis reference (LGPD Art. 11, II, "a"), mention that biometric analysis is performed by external AI providers, and clarify that no biometric templates/embeddings are stored long-term (face_analysis JSON is derived data, not raw biometric).
  - [x] 1.5 Enhance Section 5 (Retencao) — add specific retention periods per data type: photos (90 days inactive auto-delete), consultation results (while account active), share cards (30 days), analytics events (aggregated after 12 months), account data (until deletion requested).
  - [x] 1.6 Enhance Section 6 (Direitos) — ensure ALL LGPD rights listed: access, correction, deletion, portability, consent revocation, anonymization, information about sharing, opposition to processing. Reference the future data export (Story 11-4) and deletion (Story 11-3) features.
  - [x] 1.7 Enhance Section 8 (Terceiros) — explicitly list ALL third-party processors: Google (Gemini AI for face analysis and consultation), OpenAI (fallback AI provider), Kie.ai (preview generation via Nano Banana 2), Stripe (payment processing), Supabase (database/storage/auth), Vercel (hosting). For each, state what data is shared and link to their privacy policies.
  - [x] 1.8 Add new section: Data Controller identity and DPO contact information
  - [x] 1.9 Add new section: International data transfers (AI providers may process data outside Brazil/EU)
  - [x] 1.10 Add new section: Data security measures (encryption at rest/transit, RLS, signed URLs, server-side API keys)
  - [x] 1.11 Add new section: Children's data (service not intended for under-18)
  - [x] 1.12 Add new section: Automated decision-making disclosure (AI-based face analysis and style recommendations)
  - [x] 1.13 Verify cookie policy section covers: essential cookies, Vercel Analytics, Zustand sessionStorage persistence, localStorage guest session IDs

- [x] Task 2: Verify accessibility and linking (AC: #5)
  - [x] 2.1 Verify Footer.tsx `/privacidade` link renders correctly and is accessible
  - [x] 2.2 Verify registration page consent checkbox links to `/privacidade`
  - [x] 2.3 Ensure the page has proper metadata for SEO (existing `Metadata` export)
  - [x] 2.4 Verify the page is navigable and the back link works

- [x] Task 3: Write tests
  - [x] 3.1 Write unit test: privacy policy page renders all required LGPD sections
  - [x] 3.2 Write unit test: all section headings present (data collected, purpose, biometric, retention, rights, third-parties, security, transfers, automated decisions, children, controller, cookies, updates)
  - [x] 3.3 Write unit test: contact email `privacidade@mynewstyle.com.br` is present and linked
  - [x] 3.4 Write unit test: "Voltar para a pagina inicial" link renders and points to "/"
  - [x] 3.5 Write unit test: metadata title and description are set correctly

## Dev Notes

### Existing Implementation Analysis

The privacy policy page **already exists** at `src/app/privacidade/page.tsx` with 10 sections covering basic LGPD requirements. This story is about **enhancing** the existing page to be fully LGPD-compliant, NOT creating it from scratch.

**Current state (what exists):**
- 10 sections: Controller, Data Collected, Purpose, Biometric Data, Retention, Rights, How to Exercise Rights, Third-Party Sharing, Cookies, Policy Updates
- Portuguese language throughout
- Proper Next.js Metadata export for SEO
- Link back to home page
- Contact email: `privacidade@mynewstyle.com.br`
- Footer already links to `/privacidade`
- Registration page already has LGPD consent checkbox linking to `/privacidade`

**Gaps to address (what needs enhancement):**
1. Data collected section is too generic — must list ALL data types per DB schema
2. Purpose section is vague — must be specific per data type
3. Biometric section lacks LGPD article references and external processor disclosure
4. Retention section lacks per-type retention periods
5. Third-party section only mentions Google Gemini and OpenAI — must add Kie.ai, Stripe, Supabase, Vercel
6. Missing sections: international transfers, data security, children, automated decisions, DPO/controller identity
7. Rights section should mention future self-service features (data export, account deletion)

### Architecture Constraints

- **Page type:** Static server component (no `'use client'` needed) — uses Next.js App Router SSR
- **Styling:** Tailwind CSS utility classes with `font-display` (Space Grotesk) for headings and `font-body` for text. Uses `text-foreground`, `text-muted-foreground`, `text-accent` design tokens.
- **Layout pattern:** `<article>` wrapper with `max-w-[800px]`, sections with `<h2>` headings, `<ul>` lists. Follow the EXACT same pattern as the existing page.
- **No client-side state needed** — this is a purely informational page
- **Link component:** Use `next/link` for internal links (already imported)
- **External links:** Use `<a>` tags with `target="_blank" rel="noopener noreferrer"` for third-party privacy policy links

### Technology Versions

- Next.js 16.1.6 (App Router)
- React 19.2.3
- Tailwind CSS v4
- TypeScript 5.x
- Vitest 4.0.18 + @testing-library/react 16.3.2 + jsdom 28.1.0

### Testing Standards

- Test file location: `src/test/privacy-policy-page.test.tsx`
- Framework: Vitest + React Testing Library
- Pattern: Follow existing test patterns in `src/test/` (e.g., `results-page-animated-reveal.test.tsx`)
- Test the rendered output of the server component
- Use `screen.getByText()`, `screen.getByRole()` for assertions
- Test for presence of all required sections and content

### Project Structure Notes

- Privacy policy page: `src/app/privacidade/page.tsx` (EXISTS — MODIFY, do NOT create new file)
- Footer component: `src/components/layout/Footer.tsx` (EXISTS — verify link, do NOT modify)
- Registration page: `src/app/register/page.tsx` (EXISTS — verify consent link, do NOT modify)
- Test file: `src/test/privacy-policy-page.test.tsx` (NEW — create)
- No database migrations needed
- No API routes needed
- No new components needed

### LGPD Compliance Specifics

**Key LGPD Articles to reference in the policy:**
- Art. 5, II — Definition of sensitive personal data (biometric data)
- Art. 7 — Legal bases for processing (consent)
- Art. 11, II, "a" — Processing of sensitive data with explicit consent
- Art. 18 — Data subject rights (access, correction, deletion, portability, etc.)
- Art. 33 — International data transfers
- Art. 20 — Right to review automated decisions

**Data flow per third-party:**
| Provider | Data Shared | Purpose |
|----------|------------|---------|
| Google Gemini | Photo (base64), questionnaire JSON | Face analysis, consultation generation |
| OpenAI | Photo (base64), questionnaire JSON | Fallback AI provider |
| Kie.ai (Nano Banana 2) | Photo URL, style description | Preview image generation |
| Stripe | Payment intent, amount | Payment processing (no card data touches our servers) |
| Supabase | All user data | Database, auth, file storage |
| Vercel | Request logs, analytics | Hosting, serverless functions, web analytics |

**Storage bucket retention per architecture:**
| Bucket | Lifecycle |
|--------|-----------|
| `consultation-photos` | Delete after 90 days inactive |
| `preview-images` | Delete after 90 days inactive |
| `share-cards` | Delete after 30 days |

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E11 — Story S11.1 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 7.2 — Data Protection (LGPD)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3 — Data Model, schemas and RLS]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.3 — Storage Buckets and retention]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 7.3 — API Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 14 — Kie.ai Integration]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.1 — Footer links to privacy policy]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.9 — Auth consent checkbox (LGPD)]
- [Source: src/app/privacidade/page.tsx — Existing privacy policy page implementation]
- [Source: src/components/layout/Footer.tsx — Footer with /privacidade link]
- [Source: src/app/register/page.tsx — Registration page with LGPD consent checkbox]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed regression in `src/test/footer-and-legal.test.tsx`: existing test used `getByText(/90 dias/i)` which broke when the enhanced page added a second "90 dias" reference. Updated to `getAllByText`.
- Code review fix: added `_bmad-output/implementation-artifacts/sprint-status.yaml` to File List (was modified but undocumented).
- Code review fix: added 6 tests to `src/test/privacy-policy-page.test.tsx` — external link security (target=_blank, rel=noopener noreferrer, all 6 privacy policy URLs), all 9 LGPD Art. 18 rights, and Art. 5 II / Art. 33 / Art. 20 article references.

### Completion Notes List

- Enhanced `src/app/privacidade/page.tsx` from 10 to 14 sections to achieve full LGPD compliance.
- Section 1 (Controlador): Added DPO identity and contact, 15-day response SLA.
- Section 2 (Dados Coletados): Explicitly lists all data types: email, nome, display_name, gender_preference, guest_session_id, device_info, analytics_events, photos, questionnaire responses, payment data.
- Section 3 (Finalidade): Expanded to 6 specific purposes per data type.
- Section 4 (Dados Biometricos): Added LGPD Art. 5, II + Art. 11, II, "a" references; disclosed external AI providers for biometric processing; clarified no biometric templates/embeddings stored.
- Section 5 (Retencao): Per-type retention: photos/previews 90 days, share-cards 30 days, results while active, analytics aggregated after 12 months.
- Section 6 (Direitos): All 9 LGPD Art. 18 rights listed including anonymization, opposition, automated decision review.
- Section 7 (Como Exercer): Unchanged, 15-day SLA re-confirmed.
- Section 8 (Terceiros): All 6 processors listed with data shared and external privacy policy links.
- Section 9 (NEW - Transferencias Internacionais): LGPD Art. 33 disclosure.
- Section 10 (NEW - Seguranca): TLS/SSL, encryption at rest, RLS, signed URLs, server-side API keys.
- Section 11 (NEW - Menores): Under-18 prohibition.
- Section 12 (NEW - Decisoes Automatizadas): LGPD Art. 20 disclosure; right to review automated decisions.
- Section 13 (Cookies): Enhanced to cover essential cookies, Vercel Analytics, sessionStorage, localStorage.
- Section 14 (Atualizacoes): Unchanged.
- Created `src/test/privacy-policy-page.test.tsx` with 49 tests covering all ACs (initial 43 + 6 added in code review: external link security, remaining LGPD rights, Art. 5 II / Art. 33 / Art. 20 references).
- All 2241 tests pass (171 test files, 0 regressions).

### File List

- src/app/privacidade/page.tsx (modified)
- src/test/privacy-policy-page.test.tsx (created)
- src/test/footer-and-legal.test.tsx (modified — fixed regression: getByText → getAllByText for "90 dias")
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — updated epic-11 and all E11 stories from backlog → in-progress/review/ready-for-dev)

## Change Log

- 2026-03-03: Story 11.1 implemented — enhanced privacy policy page for full LGPD compliance. Added 4 new sections (international transfers, security, minors, automated decisions), expanded all existing sections with specific data types, retention periods, third-party processor list (Kie.ai, Stripe, Supabase, Vercel), LGPD article references. Created comprehensive test suite (43 tests).
- 2026-03-03: Code review fixes — added sprint-status.yaml to File List; added 6 new tests covering external link security (target=_blank + rel=noopener noreferrer for all 6 third-party links), all 9 LGPD Art. 18 rights, and LGPD Art. 5 II / Art. 33 / Art. 20 references. Test count: 43 → 49.
