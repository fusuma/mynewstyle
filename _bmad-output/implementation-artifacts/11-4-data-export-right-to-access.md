# Story 11.4: Data Export (Right to Access)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want to export all my personal data in a structured JSON file,
so that I can exercise my LGPD right to access (direito de acesso) and verify what data the platform holds about me.

## Acceptance Criteria

1. **API endpoint exists**: `GET /api/profile/export` returns a JSON file containing all user data.
2. **Authentication required**: The endpoint returns 401 for unauthenticated requests.
3. **Complete data inclusion**: The export includes: profile data, all consultations (with face_analysis, questionnaire_responses, status, payment_status, rating, rating_details), all recommendations (with style_name, justification, match_score, difficulty_level, preview_status), all styles_to_avoid, all grooming_tips, all favorites, and photo URLs (as signed Supabase Storage URLs).
4. **Downloadable from profile settings**: A "Exportar os meus dados" button is visible on the profile page settings section that triggers the download.
5. **JSON format**: The response Content-Type is `application/json` with `Content-Disposition: attachment; filename="mynewstyle-data-export-{userId-prefix}.json"`.
6. **Rate limiting**: The endpoint is rate-limited to 3 requests per hour per user to prevent abuse.
7. **Photo URLs are signed**: Photo URLs in the export are temporary signed URLs (15-min expiry) so the user can download photos within a reasonable window.
8. **No sensitive internal data**: The export excludes internal fields: ai_cost_cents, ai_model_versions, guest_session_id, payment_intent_id, and any Stripe-internal identifiers.
9. **Analytics event emitted**: A `data_export_requested` analytics event is emitted when the export is triggered.

## Tasks / Subtasks

- [x] Task 1: Create API route `GET /api/profile/export` (AC: #1, #2, #3, #5, #7, #8)
  - [x] 1.1 Create `src/app/api/profile/export/route.ts`
  - [x] 1.2 Authenticate user via `createAuthenticatedSupabaseClient` (same pattern as `/api/profile/consultations`)
  - [x] 1.3 Query `profiles` table for user profile data
  - [x] 1.4 Query `consultations` table with nested joins: recommendations, styles_to_avoid, grooming_tips
  - [x] 1.5 Query `favorites` table
  - [x] 1.6 Generate signed URLs for photo_url and preview_url fields via Supabase Storage
  - [x] 1.7 Strip internal fields (ai_cost_cents, ai_model_versions, guest_session_id, payment_intent_id)
  - [x] 1.8 Return JSON with Content-Disposition attachment header
- [x] Task 2: Add rate limiting (AC: #6)
  - [x] 2.1 Implement per-user rate limiting (3 req/hr) using in-memory Map or Supabase query count
- [x] Task 3: Add export button to profile page (AC: #4)
  - [x] 3.1 Create `DataExportButton` component in `src/components/profile/DataExportButton.tsx`
  - [x] 3.2 Integrate into `ProfilePage.tsx` in the settings/actions section below tabs
  - [x] 3.3 Show loading state while export is generating
  - [x] 3.4 Trigger browser download of the JSON file on success
  - [x] 3.5 Show error toast on failure
- [x] Task 4: Analytics event (AC: #9)
  - [x] 4.1 Add `data_export_requested` event type to analytics system
  - [x] 4.2 Emit event from the API route on successful export
- [x] Task 5: Tests
  - [x] 5.1 API route tests: auth guard, data completeness, field exclusion, response headers, rate limiting
  - [x] 5.2 Component tests: button rendering, loading state, download trigger, error handling

## Dev Notes

### Architecture Patterns (MUST follow)

- **API route pattern**: Follow the exact pattern from `src/app/api/profile/consultations/route.ts` and `src/app/api/profile/favorites/route.ts` — use `createAuthenticatedSupabaseClient(request)` from `@/lib/supabase/auth-server`, verify user with `supabase.auth.getUser()`, return 401 on auth failure.
- **Database access**: Use the RLS-aware authenticated client (NOT the service role client). This ensures the user can only export their own data. The RLS policies on consultations, recommendations, favorites already enforce user-scoped access.
- **Supabase Storage signed URLs**: Use `supabase.storage.from('bucket-name').createSignedUrl(path, 900)` (15-min = 900 seconds). Bucket names per architecture: `consultation-photos` for user photos, `preview-images` for AI previews, `share-cards` for share images.
- **Error handling**: Follow existing patterns — `console.error('[GET /api/profile/export] ...')` for logging, Portuguese error messages in responses (`"Erro ao exportar dados"`).
- **Analytics**: Use the existing analytics system from `src/lib/utils/analytics.ts` — follow the pattern established in Story 10-1.
- **Zod validation**: Not needed for this endpoint (GET with no body), but rate limiting validation can use simple logic.

### Data Model Reference

The export must traverse these tables (see architecture.md Section 3.1):

```
profiles → consultations → recommendations → styles_to_avoid → grooming_tips
                                           → favorites
```

**Key columns per table to include:**

- **profiles**: id, display_name, gender_preference, created_at, updated_at
- **consultations**: id, gender, photo_url (signed), questionnaire_responses, face_analysis, status, payment_status, created_at, completed_at, rating, rating_details
- **recommendations**: id, consultation_id, rank, style_name, justification, match_score, difficulty_level, preview_url (signed), preview_status, created_at
- **styles_to_avoid**: id, consultation_id, style_name, reason
- **grooming_tips**: id, consultation_id, category, tip_text, icon
- **favorites**: id, recommendation_id, created_at

**Columns to EXCLUDE** (internal/sensitive):
- consultations: ai_cost_cents, ai_model_versions, guest_session_id, payment_intent_id, photo_quality_score
- recommendations: preview_generation_params

### Signed URL Generation Strategy

For each consultation, the photo_url is a Supabase Storage path (e.g., `consultation-photos/{userId}/{filename}`). The export API must:
1. Extract the storage path from the `photo_url` column.
2. Call `supabase.storage.from('consultation-photos').createSignedUrl(path, 900)` to get a temporary downloadable URL.
3. Do the same for `preview_url` in recommendations (bucket: `preview-images`).
4. If the URL generation fails (e.g., file deleted), include `null` instead of failing the entire export.

### Rate Limiting Approach

Use a simple in-memory Map with TTL for MVP (acceptable since we run on serverless — each instance is short-lived):
```typescript
const exportRateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const timestamps = (exportRateLimits.get(userId) ?? []).filter(t => t > hourAgo);
  if (timestamps.length >= 3) return false;
  timestamps.push(now);
  exportRateLimits.set(userId, timestamps);
  return true;
}
```

Note: On Vercel serverless, in-memory state resets between cold starts. This is acceptable for MVP — the rate limit provides basic abuse protection, not strict enforcement. For stricter enforcement, query `analytics_events` table for recent `data_export_requested` events, but this adds latency.

### Export JSON Structure

```json
{
  "exportedAt": "2026-03-03T12:00:00.000Z",
  "platform": "mynewstyle",
  "userId": "uuid",
  "profile": {
    "displayName": "...",
    "email": "...",
    "genderPreference": "male",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "consultations": [
    {
      "id": "uuid",
      "gender": "male",
      "photoUrl": "https://signed-url...",
      "questionnaireResponses": { ... },
      "faceAnalysis": { ... },
      "status": "complete",
      "paymentStatus": "paid",
      "rating": 4,
      "ratingDetails": { ... },
      "createdAt": "...",
      "completedAt": "...",
      "recommendations": [
        {
          "id": "uuid",
          "rank": 1,
          "styleName": "Textured Crop",
          "justification": "...",
          "matchScore": 0.93,
          "difficultyLevel": "low",
          "previewUrl": "https://signed-url...",
          "previewStatus": "ready",
          "createdAt": "..."
        }
      ],
      "stylesToAvoid": [
        { "styleName": "...", "reason": "..." }
      ],
      "groomingTips": [
        { "category": "products", "tipText": "...", "icon": "..." }
      ]
    }
  ],
  "favorites": [
    {
      "recommendationId": "uuid",
      "styleName": "...",
      "favoritedAt": "..."
    }
  ]
}
```

### UI Component Design

The `DataExportButton` should:
- Use the `Download` icon from `lucide-react` (already used in the project)
- Match the existing profile page design language (shadcn/ui Button variant)
- Text: "Exportar os meus dados" (Portuguese, consistent with app language)
- Placement: Below the tabs and referral card, in a "Definicoes" (Settings) section, or directly alongside the ReferralLinkCard
- Loading state: Button text changes to "A preparar exportacao..." with disabled state
- Success: Browser triggers download automatically via blob URL
- Error: Show toast using the existing Toast component: "Erro ao exportar dados. Tente novamente."

Client-side download trigger pattern:
```typescript
const response = await fetch('/api/profile/export');
if (!response.ok) throw new Error('Export failed');
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') ?? 'mynewstyle-export.json';
a.click();
URL.revokeObjectURL(url);
```

### Testing Patterns

Follow existing test patterns from `src/test/profile-consultations-route.test.ts` and `src/test/profile-favorites-route.test.ts`:
- Mock `createAuthenticatedSupabaseClient` from `@/lib/supabase/auth-server`
- Mock Supabase `.from().select()` chain responses
- Test 401 when not authenticated
- Test successful export with complete data structure
- Test that internal fields are excluded from response
- Test Content-Disposition header
- Test rate limiting behavior
- For component tests, follow patterns from `src/test/profile-page.test.tsx`

### Project Structure Notes

- New files to create:
  - `src/app/api/profile/export/route.ts` — API route handler
  - `src/components/profile/DataExportButton.tsx` — UI component
  - `src/test/profile-export-route.test.ts` — API tests
  - `src/test/data-export-button.test.tsx` — Component tests
- Files to modify:
  - `src/components/profile/ProfilePage.tsx` — Add DataExportButton integration
  - `src/lib/utils/analytics.ts` — Add `data_export_requested` event type (if event types are enumerated)
  - `src/types/index.ts` — Add DataExport type interface if needed
- No database migrations needed — this feature reads existing data, does not add columns or tables

### Cross-Story Context (Epic 11)

- **S11.1 (Privacy Policy)**: The privacy policy must mention the right to data export. This story implements the actual mechanism.
- **S11.2 (Consent Flow)**: Consent timestamps are stored — the export should include consent metadata if it exists in profiles.
- **S11.3 (Right to Deletion)**: The deletion endpoint (`DELETE /api/profile/delete`) is the counterpart to this export endpoint. Both serve LGPD compliance. The export can share query patterns with deletion (same tables traversed).
- **S11.5 (RLS Audit)**: The export endpoint relies on RLS being correctly configured. The CI/CD audit from S11.5 will verify this.

### LGPD Compliance Notes

- LGPD Article 18, III: Right to confirmation and access to personal data
- The export must include ALL data the platform holds about the user
- Photo data is included as downloadable URLs (not embedded base64 — too large)
- The export is a snapshot — inform the user that data may change after export
- No need to export analytics_events (these are anonymized/session-level, not personal data per LGPD interpretation)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3 - Data Model]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 7.2 - Data Protection (LGPD)]
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E11 - S11.4]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements - NFR7]
- [Source: src/app/api/profile/consultations/route.ts — API pattern reference]
- [Source: src/app/api/profile/favorites/route.ts — API pattern reference]
- [Source: src/lib/supabase/auth-server.ts — Authentication pattern]
- [Source: src/components/profile/ProfilePage.tsx — UI integration point]
- [Source: src/types/index.ts — Type definitions]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered. All tasks completed in single session.

### Completion Notes List

- Implemented `GET /api/profile/export` following exact same auth pattern as `/api/profile/consultations` and `/api/profile/favorites` using `createAuthenticatedSupabaseClient`.
- Queries three tables: `profiles`, `consultations` (with nested `recommendations`, `styles_to_avoid`, `grooming_tips`), and `favorites`.
- All internal fields explicitly excluded from output: `ai_cost_cents`, `ai_model_versions`, `guest_session_id`, `payment_intent_id`, `photo_quality_score` (consultations); `preview_generation_params` (recommendations).
- Signed URLs generated via `supabase.storage.from(bucket).createSignedUrl(path, 900)` with 15-minute expiry. Failures in signed URL generation are non-fatal (null returned instead).
- Rate limiting implemented as in-memory Map with TTL (3 req/hr per user). Acceptable for serverless MVP per story spec.
- Analytics event `data_export_requested` emitted server-side via direct Supabase insert (non-fatal if it fails).
- `DataExportButton` component uses `sonner` toast for errors (consistent with `ReferralLinkCard` pattern). Loading state disables button and shows "A preparar exportação..." text.
- `AnalyticsEventType.DATA_EXPORT_REQUESTED` added to enum; updated `analytics-types.test.ts` count from 16 to 17.
- All 2327 tests pass (178 test files), zero linting errors.

### File List

- src/app/api/profile/export/route.ts (new)
- src/components/profile/DataExportButton.tsx (new)
- src/test/profile-export-route.test.ts (new)
- src/test/data-export-button.test.tsx (new)
- src/components/profile/ProfilePage.tsx (modified — added DataExportButton)
- src/lib/analytics/types.ts (modified — added DATA_EXPORT_REQUESTED enum value and payload type)
- src/test/analytics-types.test.ts (modified — updated count from 16 to 17, added DATA_EXPORT_REQUESTED test)
- src/test/profile-page.test.tsx (modified — added Download and Loader2 icon mocks)

### Change Log

- 2026-03-03: Implemented Story 11.4 — Data Export (Right to Access). Created GET /api/profile/export endpoint with auth guard, complete data traversal, signed URLs, rate limiting (3/hr), and Content-Disposition download header. Added DataExportButton component integrated into ProfilePage settings section. Added data_export_requested analytics event type. All 9 ACs satisfied; 22 new tests added; zero regressions.
- 2026-03-03: Code review fixes applied — (1) Fixed TypeScript error: favorites.recommendations cast corrected from single object to array (TS2352); (2) Analytics insert now uses AnalyticsEventType.DATA_EXPORT_REQUESTED enum instead of raw string literal; (3) DataExportButton loading text corrected to proper Portuguese "A preparar exportação..."; (4) Download anchor now appended to DOM before click for Firefox compatibility; (5) Added 2 missing tests for consultationsError and favoritesError 500 paths. Total: 2327 tests pass.
