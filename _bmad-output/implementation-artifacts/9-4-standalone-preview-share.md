# Story 9.4: Standalone Preview Share

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to share just the AI preview image individually (download or via native share),
so that I can save the preview to my device, send it to my barber, or share it on social media without the full consultation context.

## Acceptance Criteria

1. Preview image is downloadable individually from the preview display area via a dedicated download/share button
2. Downloaded/shared preview images include a subtle "mynewstyle.com" watermark in the bottom-right corner (already exists in PreviewDisplay; must also persist in the downloaded file)
3. On mobile, long-press on the preview image triggers the native "save image" behavior (via standard `<img>` element — no custom long-press handler needed; ensure images are served as downloadable URLs, not blob/data URIs that block native save)
4. A share button appears on the preview display when a preview is in "ready" status
5. Tapping the share button invokes the Web Share API (`navigator.share`) with the preview image as a shared file (not just a URL), falling back to direct download if Web Share is unavailable or if file sharing is not supported
6. The share/download button is disabled while a preview is in "generating" status and hidden when preview is "idle" or "unavailable"
7. Analytics event `preview_shared` is emitted with `{ recommendationRank, method: 'share' | 'download', styleName }` when a preview is shared or downloaded
8. The shared/downloaded image retains the watermark at the same position and opacity as displayed on screen

## Tasks / Subtasks

- [x] Task 1: Create PreviewShareButton component (AC: 4, 5, 6)
  - [x] 1.1 Create `src/components/consultation/PreviewShareButton.tsx`
  - [x] 1.2 Accept props: `previewUrl: string`, `previewStatus: PreviewStatus['status']`, `styleName: string`, `recommendationRank: number`
  - [x] 1.3 Render a share/download icon button (use Lucide `Share2` icon, matching existing ResultsActionsFooter pattern)
  - [x] 1.4 Show button only when `previewStatus === 'ready'` and `previewUrl` is truthy; hide for idle/unavailable; disable for generating
  - [x] 1.5 On click: attempt `navigator.share({ files: [imageFile] })` first; if unsupported or fails, fall back to programmatic download via anchor element with `download` attribute
  - [x] 1.6 For share: fetch the preview image, convert to `File` object with `image/jpeg` MIME type, then pass to `navigator.share`
  - [x] 1.7 For download fallback: create a temporary `<a>` element with `href=previewUrl`, `download="mynewstyle-preview-{styleName}.jpg"`, trigger click, remove element
  - [x] 1.8 Handle errors gracefully (toast on failure via Sonner)

- [x] Task 2: Integrate PreviewShareButton into PreviewDisplay (AC: 1, 2, 4)
  - [x] 2.1 Import PreviewShareButton into `src/components/consultation/PreviewDisplay.tsx`
  - [x] 2.2 Add PreviewShareButton below the expectation framing text, aligned right
  - [x] 2.3 Pass through `previewUrl`, `previewStatus`, `styleName`, and `recommendationRank` (add `recommendationRank` prop to PreviewDisplay)
  - [x] 2.4 Ensure the existing watermark ("mynewstyle.com") renders on the preview image itself — the watermark is already part of the on-screen display; for the downloaded image, the watermark comes from the server-side generated preview (Kie.ai or Gemini output stored in Supabase Storage), so no client-side watermark stamping is needed

- [x] Task 3: Ensure preview images support native long-press save (AC: 3)
  - [x] 3.1 Verify that `previewUrl` in `PreviewDisplay` (and its child components `BeforeAfterSlider`, `PreviewToggleButtons`) uses an HTTPS URL (Supabase Storage signed URL), not a blob/data URI
  - [x] 3.2 If the current implementation uses blob URLs, refactor to use signed HTTPS URLs from Supabase Storage so that mobile long-press "Save Image" works natively
  - [x] 3.3 No custom long-press handler needed — standard `<img src="https://...">` supports native save on iOS Safari and Chrome Android

- [x] Task 4: Analytics event for preview share/download (AC: 7)
  - [x] 4.1 Define `preview_shared` event type in the analytics event system (if not already defined)
  - [x] 4.2 Emit event in PreviewShareButton on successful share or download with payload: `{ type: 'preview_shared', recommendationRank, method: 'share' | 'download', styleName }`
  - [x] 4.3 Follow existing analytics patterns from ResultsActionsFooter and other components

- [x] Task 5: Tests (all ACs)
  - [x] 5.1 Create `src/test/preview-share-button.test.tsx`
  - [x] 5.2 Test: button renders only when previewStatus='ready' and previewUrl is truthy
  - [x] 5.3 Test: button is hidden when previewStatus='idle' or 'unavailable'
  - [x] 5.4 Test: button is disabled when previewStatus='generating'
  - [x] 5.5 Test: click triggers navigator.share when available with correct File object
  - [x] 5.6 Test: click falls back to download when navigator.share is unavailable
  - [x] 5.7 Test: click falls back to download when navigator.share rejects (non-AbortError)
  - [x] 5.8 Test: analytics event emitted on successful share
  - [x] 5.9 Test: analytics event emitted on successful download
  - [x] 5.10 Test: error toast shown on share/download failure
  - [x] 5.11 Test: accessibility — button has correct aria-label

## Dev Notes

### Architecture & Patterns

- **Component pattern**: Follow the same pattern as `ResultsActionsFooter.tsx` — it already implements `navigator.share` with clipboard fallback. This story adds *file-based* sharing specifically for the preview image.
- **Existing share logic in ResultsActionsFooter**: Currently shares URL + text only (lines 57-86). Story 9-4 shares the actual image file. These are complementary, not conflicting.
- **PreviewDisplay component** (`src/components/consultation/PreviewDisplay.tsx`): This is the integration target. It already handles all preview states (idle, generating, ready, failed, unavailable) and renders the watermark. Add the share button as a child of the ready state render path.
- **Watermark strategy**: The on-screen watermark in PreviewDisplay is a CSS overlay (`<span>` absolutely positioned). For the downloadable file, the watermark should already be baked into the image stored in Supabase Storage (applied server-side during Kie.ai webhook processing in Story 7-2). Verify this is the case; if not, use `html-to-image` (already in dependencies) to capture the preview with watermark overlay before sharing.
- **html-to-image**: Already installed (`html-to-image@1.11.13`) and used by BarberCardRenderer. If client-side watermark stamping is needed as a fallback, use `toPng()` from html-to-image on the preview container.

### Web Share API with Files

- `navigator.share({ files: [...] })` is supported on **iOS Safari 15+** and **Chrome Android 75+** (our target platforms per PRD).
- Must check `navigator.canShare({ files: [file] })` before calling `navigator.share` — some browsers support share but not file sharing.
- If file sharing is not supported, fall back to direct download.
- The File constructor requires: `new File([blob], filename, { type: 'image/jpeg' })`.
- Fetch the image from the signed URL, convert response to Blob, then wrap in File.

### Download Fallback

- Create a hidden `<a>` element with `download` attribute and `href` set to the image URL.
- For cross-origin URLs (Supabase Storage): must fetch the image as a blob first, create an object URL, then trigger download. Direct `<a download href="cross-origin-url">` will navigate instead of download due to CORS.
- Pattern: `fetch(url) -> blob -> URL.createObjectURL(blob) -> <a download> -> click -> revokeObjectURL`.

### File Naming Convention

- Downloaded file: `mynewstyle-preview-{styleName-slugified}.jpg`
- Slugify style name: lowercase, replace spaces with hyphens, remove special characters.

### Analytics

- The analytics event system was defined in the epics (E10: S10.1) but may not be fully implemented yet. If the analytics infrastructure is not in place, create a lightweight `trackEvent()` utility in `src/lib/utils/analytics.ts` that logs to console in development and is ready to connect to the analytics_events table later.
- Check if `src/lib/utils/analytics.ts` already exists. If it does, use it. If not, create a minimal stub.

### Project Structure Notes

- New file: `src/components/consultation/PreviewShareButton.tsx`
- New file: `src/test/preview-share-button.test.tsx`
- Modified file: `src/components/consultation/PreviewDisplay.tsx` (add PreviewShareButton integration + recommendationRank prop)
- Potentially modified: `src/lib/utils/analytics.ts` (add preview_shared event type if analytics util exists)
- All paths align with existing project structure (`src/components/consultation/` for consultation components, `src/test/` for tests)

### Testing Standards

- **Framework**: Vitest + Testing Library (per package.json: vitest@4, @testing-library/react@16, jsdom@28)
- **Test location**: `src/test/preview-share-button.test.tsx` (follows existing pattern: all tests in `src/test/`)
- **Mock patterns**: Mock `navigator.share`, `navigator.canShare`, `fetch`, `URL.createObjectURL`, `URL.revokeObjectURL`, `document.createElement`
- **Setup**: Import from `src/test/setup.ts` (existing test setup file)
- **Toast mocking**: Mock `sonner` toast as done in other tests (see `src/test/results-actions-footer.test.tsx` if it exists for pattern)

### Key Dependencies

| Dependency | Version | Usage |
|---|---|---|
| lucide-react | ^0.575.0 | Share2/Download icon |
| sonner | ^2.0.7 | Toast notifications on error |
| framer-motion | ^12.34.3 | Button entrance animation (optional, match existing patterns) |
| html-to-image | ^1.11.13 | Fallback watermark stamping (only if server-side watermark missing) |

### Cross-Story Context (Epic 9)

- **S9.1 (Share Card Generator — Story Format)**: Generates a branded 9:16 before/after card. This is a DIFFERENT feature — 9-4 shares the raw preview image, not a designed card.
- **S9.2 (Share Card Generator — Square Format)**: Generates a 1:1 card. Also different from 9-4.
- **S9.3 (Native Share Integration)**: Implements the broader native share flow for the results page. Story 9-4 specifically handles preview image sharing. The `navigator.share` pattern should be consistent between 9-3 and 9-4. If 9-3 is implemented first, reuse its share utility; if 9-4 is implemented first, create a reusable share utility that 9-3 can later adopt.
- **S9.5 (Referral Link)**: Unrelated to preview sharing.

### Existing Components to Reuse (DO NOT Reinvent)

- `PreviewDisplay` — integration target, already handles all states
- `BeforeAfterSlider` — used inside PreviewDisplay for >=375px
- `PreviewToggleButtons` — used inside PreviewDisplay for <375px
- `Button` from `src/components/ui/button.tsx` — use for share button styling
- `toast` from `sonner` — for error notifications
- `cn` from `src/lib/utils.ts` — class name merging
- `useConsultationStore` from `src/stores/consultation.ts` — if needing to access preview state from store level

### Security Considerations

- Preview images are served via Supabase Storage signed URLs (15-min expiry per architecture spec). The fetch for blob conversion must happen while the URL is valid.
- No sensitive data is exposed in the shared image (only the AI-generated preview with watermark).
- The watermark protects brand attribution when images are shared publicly.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E9-S9.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section-5.1-Share-API]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section-3.3-Storage-Buckets]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section-3.7-AI-Preview]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section-7-Sharing-Virality]
- [Source: src/components/consultation/PreviewDisplay.tsx]
- [Source: src/components/consultation/ResultsActionsFooter.tsx]
- [Source: src/components/consultation/BarberCardRenderer.tsx]
- [Source: src/types/index.ts#PreviewStatus]
- [Source: src/stores/consultation.ts#preview-actions]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered. Pre-existing TypeScript errors in unrelated files (profile routes, framer-motion types) were not introduced by this story.

### Completion Notes List

- Implemented `PreviewShareButton` component at `src/components/consultation/PreviewShareButton.tsx` following the same patterns as `ResultsActionsFooter`. The component uses Web Share API with file sharing (`navigator.share({ files: [imageFile] })`) with a fetch-blob-anchor download fallback for cross-origin Supabase Storage URLs.
- Button visibility logic: null for `idle`/`unavailable`, null for `ready` without URL, disabled (still rendered) for `generating`, active for `ready` with URL — satisfying AC 4 and 6.
- AbortError from `navigator.share` is handled silently (user cancelled); other share errors fall back to download instead of showing a toast.
- Analytics `trackEvent` function added to `src/lib/utils/analytics.ts` alongside the existing `trackShareEvent`, with a new `PreviewSharedEventPayload` type — satisfying AC 7.
- Integrated into `PreviewDisplay.tsx` with a new optional `recommendationRank` prop (defaults to 1). Button rendered below expectation framing text, aligned right — satisfying AC 1 and 2.
- Task 3 (AC 3): Verified that `BeforeAfterSlider` and `PreviewToggleButtons` use standard `<img src="...">` elements with Supabase Storage HTTPS signed URLs. No blob/data URIs used. No code changes required — native long-press save already works.
- Watermark strategy confirmed: the on-screen CSS watermark overlay serves the display; the downloaded file's watermark is baked in server-side by Kie.ai/Gemini webhook (Story 7-2). No client-side watermark stamping needed — satisfying AC 2 and 8.
- 14 new tests written using TDD (RED → GREEN), all passing. Full regression suite: 1928 tests, 0 failures.
- Code review (2026-03-02): Fixed 4 issues — (1) eliminated duplicated inline download logic in `navigator.share` failure path by refactoring `triggerDownload` to accept an optional pre-fetched `blob` parameter, avoiding redundant network requests; (2) reordered `fetchImageBlob` definition before `triggerDownload` to eliminate temporal dead zone; (3) removed redundant `isDisabled` variable (was same expression as `isGenerating`); (4) simplified the share/no-share conditional to a single `if/else` branch. Added test 5.7b (AbortError: no download, no analytics, no toast). Full suite: 1929 tests, 0 failures.

### File List

- `src/components/consultation/PreviewShareButton.tsx` (new)
- `src/test/preview-share-button.test.tsx` (new)
- `src/components/consultation/PreviewDisplay.tsx` (modified — added PreviewShareButton import, recommendationRank prop, share button integration)
- `src/lib/utils/analytics.ts` (modified — added PreviewSharedEventPayload type and trackEvent function)

## Change Log

- 2026-03-02: Story 9-4 implemented — PreviewShareButton component created, integrated into PreviewDisplay, analytics event added, 14 tests written (all passing). Status: review.
- 2026-03-02: Code review complete — refactored triggerDownload to accept pre-fetched blob (eliminating duplicate network requests and duplicated inline anchor logic), removed redundant isDisabled variable, simplified share conditional, added AbortError test (5.7b). 15 tests, 1929 total, 0 failures. Status: done.
