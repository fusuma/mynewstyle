# Story 2.1: Camera Capture with Guidance

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to take a selfie with on-screen guidance so the AI gets a good photo for analysis,
so that I receive accurate face shape detection and hairstyle recommendations.

## Acceptance Criteria

1. Full-screen camera viewfinder using `MediaDevices.getUserMedia` with front camera as default
2. Face outline guide (oval overlay) for framing displayed on the camera viewfinder
3. On-screen tips appear/disappear: "Boa iluminacao", "Olhe diretamente", "Sem oculos de sol"
4. Capture button: large, centered, minimum 48px touch target
5. Front camera default, toggle to rear camera available
6. Pre-permission explanation screen: "Precisamos da camera para analisar o seu rosto" shown before requesting camera access
7. WebView detection: prompt "Abrir no navegador" with deep link when running inside in-app browsers (Instagram, Facebook, TikTok, etc.)
8. Camera viewfinder renders correctly on mobile (375px) through desktop (1440px)
9. Component uses design system theme tokens (CSS variables from Story 1.1 -- no hardcoded hex colors)
10. Portuguese (pt-BR) for all user-facing text with correct diacritical marks
11. Accessible: capture button has proper aria-label, focus states, and keyboard navigation support
12. Respects `prefers-reduced-motion` for any tip animations or transitions
13. Graceful error handling: camera permission denied, camera not available, or stream failure shows user-friendly error messages
14. Camera stream properly cleaned up (tracks stopped) on component unmount or page navigation

## Tasks / Subtasks

- [x] Task 1: Create WebView detection utility (AC: 7)
  - [x] Create `src/lib/photo/detect-webview.ts`
  - [x] Implement `isInAppBrowser()` function that checks user-agent for Instagram, Facebook, TikTok, LINE, Twitter/X, and other common in-app browsers
  - [x] Implement `getExternalBrowserUrl()` that generates a URL to open in the device's native browser
  - [x] Export utility functions for use in camera component
  - [x] Unit tests in `src/test/detect-webview.test.ts`

- [x] Task 2: Create pre-permission explanation screen component (AC: 6, 9, 10, 11, 12)
  - [x] Create `src/components/consultation/CameraPermissionPrompt.tsx` as a client component (`'use client'`)
  - [x] Display camera icon (Lucide: Camera) with explanation text: "Precisamos da camera para analisar o seu rosto"
  - [x] Subtitle: "A sua foto e processada com seguranca e nunca e partilhada"
  - [x] Primary CTA button: "Permitir Camera" (triggers actual browser permission request)
  - [x] Secondary link: "Prefiro enviar uma foto da galeria" (for future Story 2.2 integration -- render as disabled/placeholder or navigation to gallery upload)
  - [x] Use design system tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `text-accent`
  - [x] Responsive: centered layout with max-width, works from 375px to 1440px
  - [x] Respect `prefers-reduced-motion` for any entrance animations

- [x] Task 3: Create WebView blocking screen (AC: 7, 9, 10)
  - [x] Create `src/components/consultation/WebViewBlocker.tsx` as a client component
  - [x] Display warning icon and message: "Para a melhor experiencia, abra no seu navegador"
  - [x] Explanation: "Navegadores integrados (como o do Instagram) podem nao suportar a camera"
  - [x] CTA button: "Abrir no Navegador" that copies URL or attempts to open in external browser
  - [x] Show manual URL copy fallback with copy-to-clipboard button
  - [x] Use design system tokens

- [x] Task 4: Create camera hook (AC: 1, 5, 13, 14)
  - [x] Create `src/hooks/useCamera.ts`
  - [x] Implement `useCamera()` hook with state: `stream`, `error`, `isLoading`, `facingMode`, `isPermissionGranted`
  - [x] `startCamera(facingMode?: 'user' | 'environment')` -- requests camera with constraints:
    - Video: `{ facingMode: { ideal: facingMode || 'user' }, width: { ideal: 1280 }, height: { ideal: 1280 } }`
    - Audio: false
  - [x] `stopCamera()` -- stops all tracks on the stream
  - [x] `switchCamera()` -- toggles between front and rear camera by stopping current stream and restarting with opposite facingMode
  - [x] `capturePhoto(videoRef)` -- captures still frame from video element to Canvas, returns Blob (JPEG)
  - [x] Handle errors gracefully: `NotAllowedError` (permission denied), `NotFoundError` (no camera), `NotReadableError` (camera in use), `OverconstrainedError` (constraints not satisfiable)
  - [x] Cleanup: `useEffect` cleanup function stops all tracks on unmount
  - [x] Unit tests in `src/test/use-camera.test.ts`

- [x] Task 5: Create face oval overlay component (AC: 2, 9, 12)
  - [x] Create `src/components/consultation/FaceOvalOverlay.tsx`
  - [x] SVG-based oval overlay centered on the viewfinder
  - [x] Semi-transparent dark overlay outside the oval (dim areas outside face zone)
  - [x] Oval dimensions: approximately 60% width, 75% height of viewfinder (responsive)
  - [x] Subtle pulsing border animation on the oval (respects `prefers-reduced-motion`)
  - [x] Use `stroke` color from theme accent: `hsl(var(--accent))` or similar

- [x] Task 6: Create camera guidance tips component (AC: 3, 9, 10, 12)
  - [x] Create `src/components/consultation/CameraGuidanceTips.tsx` as a client component
  - [x] Display rotating tips that appear/disappear with fade animation:
    - "Boa iluminacao" (with Sun icon)
    - "Olhe diretamente para a camera" (with Eye icon)
    - "Sem oculos de sol" (with EyeOff icon)
    - "Mantenha o rosto dentro do oval" (with Scan icon)
  - [x] Tips cycle every 3 seconds with 300ms fade transition
  - [x] Position: below the face oval overlay area, above capture button
  - [x] Respect `prefers-reduced-motion`: show all tips statically if motion disabled

- [x] Task 7: Create main PhotoCapture component (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14)
  - [x] Create `src/components/consultation/PhotoCapture.tsx` as a client component (`'use client'`)
  - [x] Component state machine:
    1. `webview-blocked` -- show WebViewBlocker if in-app browser detected
    2. `pre-permission` -- show CameraPermissionPrompt
    3. `camera-active` -- show live viewfinder with overlay and guidance
    4. `error` -- show error state with retry option
  - [x] Camera viewfinder: `<video>` element with `autoPlay`, `playsInline`, `muted` attributes (critical for iOS)
  - [x] Video element should be mirrored (`transform: scaleX(-1)`) for front camera only
  - [x] Overlay: FaceOvalOverlay on top of video
  - [x] Guidance: CameraGuidanceTips below overlay
  - [x] Capture button: large circular button (64px mobile, 72px desktop), centered at bottom
    - Use Camera icon from Lucide inside the button
    - `aria-label="Capturar foto"`
    - Min touch target: 48px (actual button exceeds this)
    - Visual feedback on press (scale animation)
  - [x] Camera switch button: small button in top-right corner
    - Use SwitchCamera or RefreshCw icon from Lucide
    - `aria-label="Alternar camera"`
    - Only show if device has multiple cameras (check `navigator.mediaDevices.enumerateDevices()`)
  - [x] On capture: stop camera stream, call `onCapture(photoBlob)` callback prop
  - [x] Error state: friendly message + "Tentar novamente" button
  - [x] Permission denied state: explain how to enable camera in browser settings
  - [x] Layout: full viewport height on mobile, constrained max-height on desktop
  - [x] Responsive: works correctly from 375px to 1440px

- [x] Task 8: Create photo capture page route (AC: 8)
  - [x] Create `src/app/consultation/photo/page.tsx`
  - [x] Import and render `PhotoCapture` component
  - [x] Page should handle the captured photo (store in state for next step -- photo review in Story 2.5)
  - [x] Export metadata: title "Tirar Foto | MyNewStyle", description for SEO
  - [x] NOTE: This page MUST be a client component (camera requires browser APIs) or use a client component wrapper

- [x] Task 9: Write comprehensive tests (AC: all)
  - [x] Test file: `src/test/camera-capture.test.tsx`
  - [x] WebView detection tests (in separate file `src/test/detect-webview.test.ts`):
    - Detects Instagram in-app browser
    - Detects Facebook in-app browser
    - Returns false for regular Chrome/Safari/Firefox
    - Generates correct external browser URL
  - [x] Camera permission prompt tests:
    - Renders explanation text in Portuguese
    - Renders "Permitir Camera" button
    - Calls onRequestPermission when button clicked
  - [x] WebView blocker tests:
    - Renders warning message
    - Renders "Abrir no Navegador" button
  - [x] Camera hook tests:
    - Initializes with correct default state
    - Calls getUserMedia with front camera constraints
    - Handles permission denied error
    - Handles no camera found error
    - Stops tracks on cleanup
    - Switches between front and rear camera
  - [x] PhotoCapture integration tests:
    - Shows WebView blocker when in-app browser detected
    - Shows permission prompt initially
    - Shows camera viewfinder after permission granted
    - Renders face oval overlay
    - Renders capture button with correct aria-label
    - Renders camera switch button when multiple cameras available
    - Calls onCapture with photo blob when capture button clicked
    - Shows error state when camera fails
  - [x] Run existing test suite to confirm no regressions (expect 140 existing tests to still pass)

## Dev Notes

### Architecture Compliance

- **Page Route:** `src/app/consultation/photo/page.tsx` -- this is the photo capture page defined in the architecture. It MUST render the PhotoCapture client component. The page itself can be a Server Component that renders a client component wrapper, or use `'use client'` if needed. [Source: architecture.md#6.1]
- **Component Location:** All consultation components go in `src/components/consultation/` per architecture spec. This is the FIRST component in this directory -- create the directory. [Source: architecture.md#6.1]
- **Hook Location:** Camera hook goes in `src/hooks/useCamera.ts` per architecture spec. The `useTheme.ts` hook already exists here -- follow the same pattern. [Source: architecture.md#6.1]
- **Utility Location:** Photo utilities go in `src/lib/photo/` per architecture spec. This directory does not exist yet -- create it. [Source: architecture.md#6.1]
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-accent`, `bg-muted`, `text-muted-foreground`, `rounded-card`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **Icons:** Use Lucide React for all icons. Already installed at v0.575.0+. [Source: architecture.md#2.1, package.json]
- **Camera API:** Use native `MediaDevices.getUserMedia` -- NO third-party camera libraries (no react-webcam, no webcam-easy). Architecture explicitly says "Native browser camera, no dependencies." [Source: architecture.md#2.1]
- **State Management:** Photo state will eventually live in Zustand store (`stores/consultation.ts`), but that store does not exist yet (created in a later story). For THIS story, manage state locally within the component. Pass captured photo via callback props. [Source: architecture.md#6.2]

### Technical Requirements

- **getUserMedia Constraints:** Use `{ video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false }`. Use `ideal` not `exact` to avoid `OverconstrainedError` on devices that cannot satisfy exact constraints. [Source: MDN Web Docs]
- **iOS Safari Critical:** The `<video>` element MUST have `playsInline` attribute. Without it, iOS Safari will open the video in fullscreen mode. Also requires `autoPlay` and `muted`. The `autoplay` policy on iOS requires user gesture for unmuted video, but muted autoplay works. [Source: WebRTC best practices]
- **Video Mirroring:** Front camera (facingMode: 'user') should be mirrored with `transform: scaleX(-1)` on the video element so users see themselves as in a mirror. Rear camera should NOT be mirrored. The captured photo should NOT be mirrored (capture from the raw stream, not the mirrored display).
- **Photo Capture Method:** Draw current video frame to a `<canvas>` element using `canvas.getContext('2d').drawImage(video, 0, 0)`, then call `canvas.toBlob(callback, 'image/jpeg', 0.92)` to get a JPEG blob. Canvas dimensions should match video's `videoWidth` and `videoHeight`.
- **Stream Cleanup:** CRITICAL -- always stop all tracks on the MediaStream when done. Use `stream.getTracks().forEach(track => track.stop())`. This releases the camera hardware. Failure to do this leaves the camera LED on and prevents other apps from using it.
- **WebView Detection:** Check `navigator.userAgent` for known in-app browser signatures: `Instagram`, `FBAN` (Facebook), `FBAV`, `Twitter`, `Line/`, `TikTok`, `Snapchat`. These WebViews often restrict camera access or show repeated permission prompts.
- **Permission Flow:** Use the Permissions API (`navigator.permissions.query({ name: 'camera' })`) to check if permission is already granted before showing the pre-permission screen. If already granted, skip straight to camera-active state. Note: Permissions API is not supported in all browsers (Safari has limited support) -- use try/catch and fall back to showing the prompt.
- **Error Messages (Portuguese):**
  - Permission denied: "Acesso a camera foi negado. Para usar esta funcionalidade, ative a camera nas configuracoes do seu navegador."
  - No camera found: "Nenhuma camera encontrada no dispositivo."
  - Camera in use: "A camera esta sendo usada por outro aplicativo."
  - Generic error: "Erro ao acessar a camera. Tente novamente."

### Previous Story Intelligence (Story 1.6 -- Footer & Legal Pages)

**What was built in Epic 1:**
- Full landing page with Hero, How It Works, Trust & Privacy, Interactive Demo, Footer sections
- Design system with dual themes (male/female), typography (Space Grotesk + Inter), CSS variables
- 140 total tests passing (62 + 12 + 11 + 12 + 20 + 23)
- Legal pages at /privacidade and /termos

**Key patterns established in Epic 1:**
- Client components use `'use client'` directive at top of file
- Server Components are the default for page routes
- CSS: theme CSS variables via `globals.css`, Tailwind utility classes, NEVER hardcoded hex values
- Fonts: `font-display` (Space Grotesk), `font-body` (Inter) -- available as CSS classes
- Tests: Vitest + React Testing Library in `src/test/` directory, IntersectionObserver mock in `setup.ts`
- Portuguese text: must use correct diacritical marks (accents, cedillas, tildes) -- this was a code review finding in Story 1.6
- Design tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `text-accent`, `bg-accent`, `rounded-card`, `shadow-card`
- Motion: Framer Motion is installed, `src/lib/motion.ts` has motion presets (can be reused)
- All content in Portuguese (pt-BR)

**DO NOT modify existing files from Epic 1:**
- `src/app/layout.tsx` (root layout is stable)
- `src/app/globals.css` (design system tokens are stable)
- `src/app/page.tsx` (landing page is stable)
- Any files in `src/components/ui/` (shadcn/ui components are stable)
- Any files in `src/components/landing/` (landing sections are stable)
- `src/components/layout/ThemeProvider.tsx` (stable)
- `src/components/layout/Footer.tsx` (stable)
- `src/test/setup.ts` (test setup is stable)
- `src/lib/motion.ts` (motion presets are stable)

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Client components with `'use client'` for browser API access |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| Lucide React | 0.575.0+ | Icons: Camera, SwitchCamera, Eye, EyeOff, Sun, Scan, AlertTriangle, Copy, ExternalLink |
| Framer Motion | 12.34.3+ | Optional: tip fade animations, capture button press feedback |
| Zustand | 5.0.11 | NOT used in this story (consultation store created later). Local state only. |

**DO NOT install new dependencies for this story.** Everything needed is already in package.json. The architecture explicitly states "Native browser camera, no dependencies" for camera functionality.

### File Structure Requirements

```
src/
├── app/
│   ├── consultation/
│   │   └── photo/
│   │       └── page.tsx                    # NEW: Photo capture page route
│   ├── layout.tsx                          # NO CHANGES
│   ├── page.tsx                            # NO CHANGES
│   └── globals.css                         # NO CHANGES
├── components/
│   ├── consultation/                       # NEW DIRECTORY
│   │   ├── PhotoCapture.tsx                # NEW: Main camera capture component (client)
│   │   ├── CameraPermissionPrompt.tsx      # NEW: Pre-permission explanation (client)
│   │   ├── WebViewBlocker.tsx              # NEW: WebView detection screen (client)
│   │   ├── FaceOvalOverlay.tsx             # NEW: SVG oval overlay for face framing
│   │   └── CameraGuidanceTips.tsx          # NEW: Rotating guidance tips (client)
│   ├── landing/
│   │   └── (no changes)
│   ├── layout/
│   │   └── (no changes)
│   └── ui/
│       └── (no changes)
├── hooks/
│   ├── useTheme.ts                         # NO CHANGES (existing)
│   └── useCamera.ts                        # NEW: Camera access hook
├── lib/
│   ├── photo/                              # NEW DIRECTORY
│   │   └── detect-webview.ts               # NEW: WebView detection utility
│   └── motion.ts                           # NO CHANGES (can import motion presets)
└── test/
    ├── detect-webview.test.ts              # NEW: WebView detection tests
    ├── use-camera.test.ts                  # NEW: Camera hook tests
    ├── camera-capture.test.tsx             # NEW: PhotoCapture component tests
    └── (existing test files - no changes)
```

[Source: architecture.md#6.1 -- Project Structure]

### Project Structure Notes

- `src/components/consultation/` does NOT exist yet. Create this directory for the first time. Architecture defines: `PhotoCapture.tsx`, `PhotoCompressor.ts`, `QuestionCard.tsx`, `QuestionnaireFlow.tsx`, etc. in this directory. [Source: architecture.md#6.1]
- `src/lib/photo/` does NOT exist yet. Create this directory. Architecture defines: `compress.ts`, `validate.ts`, `exif.ts` here. This story only creates `detect-webview.ts`. [Source: architecture.md#6.1]
- `src/hooks/useCamera.ts` is defined in architecture. The hooks directory already has `useTheme.ts`. [Source: architecture.md#6.1]
- `src/app/consultation/photo/page.tsx` follows the Next.js App Router convention for `/consultation/photo` route. The `consultation/` directory does not exist yet in `src/app/` -- create it. [Source: architecture.md#6.1]
- The photo capture page is a standalone step in the consultation flow: Landing -> Gender Gateway -> **Photo Capture** -> Questionnaire -> Processing -> Results

### Testing Requirements

- Use existing Vitest + React Testing Library setup (already configured in Story 1.1)
- Test file locations: `src/test/detect-webview.test.ts`, `src/test/use-camera.test.ts`, `src/test/camera-capture.test.tsx`
- IntersectionObserver mock already in `src/test/setup.ts`
- You will need to mock `navigator.mediaDevices.getUserMedia`, `navigator.mediaDevices.enumerateDevices`, and `navigator.permissions.query` in tests
- Mock `HTMLVideoElement.prototype.play` (jsdom does not support video playback)
- Mock `HTMLCanvasElement.prototype.getContext` for photo capture tests
- Minimum 30 tests covering all acceptance criteria across all components
- Run existing test suite to ensure no regressions (expect 140 existing tests to still pass)
- Test both happy path and error scenarios for camera access

### getUserMedia Browser Compatibility Notes (2025-2026)

- `navigator.mediaDevices.getUserMedia` is fully supported in Chrome 53+, Firefox 36+, Safari 11+, Edge 12+, Opera 40+ (92%+ global coverage)
- iOS 14.3+ supports getUserMedia in WKWebView (but in-app browsers may still restrict it)
- iOS Safari requires `playsinline` attribute on video element (without it, video opens fullscreen)
- Safari may show repeated permission prompts when navigating between routes -- consider keeping camera stream alive during the photo capture flow
- Always use HTTPS in production (getUserMedia requires secure context)
- Use `ideal` constraints instead of `exact` to maximize device compatibility
- Use `navigator.mediaDevices.enumerateDevices()` to check for available cameras before showing the switch button
- For camera switching: stop all tracks on current stream, then request new stream with opposite facingMode

### WebView Detection Patterns

Common user-agent signatures for in-app browsers:
- Instagram: `Instagram` in userAgent
- Facebook: `FBAN` or `FBAV` in userAgent
- TikTok: `TikTok` or `BytedanceWebview` in userAgent
- Twitter/X: `Twitter` in userAgent
- LINE: `Line/` in userAgent
- Snapchat: `Snapchat` in userAgent
- General WebView: `wv` in userAgent (Android WebView), `WebView` keyword

Escape strategies:
- Android: `intent://` URL scheme can open default browser
- iOS: `window.open()` may open in Safari (not always reliable from WebView)
- Fallback: show URL for user to copy and paste into browser manually

### UX Design Specifications

- **Camera-first on mobile, upload-first on desktop** -- but Story 2.1 focuses on camera only. Gallery upload is Story 2.2. For this story, show camera capture as primary with a secondary "upload from gallery" link that can be a placeholder/disabled. [Source: ux-design.md#3.3]
- **Face outline guide (oval overlay)** -- helps framing. Semi-transparent dark overlay outside the oval. [Source: ux-design.md#3.3]
- **On-screen tips (appear/disappear):** "Boa iluminacao", "Olhe diretamente", "Sem oculos de sol" [Source: ux-design.md#3.3]
- **Capture button:** Large, centered, haptic feedback (where supported). 48px minimum touch target. [Source: ux-design.md#3.3]
- **Pre-permission explanation:** "Precisamos da camera para analisar o seu rosto" -- shown before browser permission dialog. Privacy-first messaging. [Source: ux-design.md#3.3, epics-and-stories.md#S2.1]
- **WebView detection:** "Abrir no navegador" with deep link when in WebView. [Source: epics-and-stories.md#S2.1]
- **Error states:** Red pulse on photo frame, specific reason shown, "Tentar novamente" button. [Source: ux-design.md#8.2]
- **Thumb-zone optimization:** Primary actions in bottom 40% of screen. Capture button at bottom center. [Source: ux-design.md -- Mobile UX]

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Pre-permission heading | Precisamos da sua camera |
| Pre-permission body | Para analisar o seu rosto, precisamos de uma foto. A sua foto e processada com seguranca e nunca e partilhada. |
| Pre-permission CTA | Permitir Camera |
| Pre-permission secondary | Prefiro enviar uma foto da galeria |
| WebView heading | Abra no seu navegador |
| WebView body | Navegadores integrados (como o do Instagram) podem nao suportar a camera. Para a melhor experiencia, abra este link no seu navegador. |
| WebView CTA | Abrir no Navegador |
| WebView copy fallback | Copiar Link |
| Tip 1 | Boa iluminacao |
| Tip 2 | Olhe diretamente para a camera |
| Tip 3 | Sem oculos de sol |
| Tip 4 | Mantenha o rosto dentro do oval |
| Capture button aria | Capturar foto |
| Switch camera aria | Alternar camera |
| Error: permission denied | Acesso a camera foi negado. Ative a camera nas configuracoes do seu navegador. |
| Error: no camera | Nenhuma camera encontrada no dispositivo. |
| Error: camera in use | A camera esta sendo usada por outro aplicativo. Feche outros aplicativos e tente novamente. |
| Error: generic | Erro ao acessar a camera. Tente novamente. |
| Retry button | Tentar novamente |

**CRITICAL:** All Portuguese text must use correct diacritical marks (accents: a, e, o; cedilla: c; tilde: a, o). This was a code review finding in Story 1.6. Review every string for missing diacritics before considering the story complete.

### Critical Guardrails

- **DO NOT** install any camera/webcam npm packages. Use native `MediaDevices.getUserMedia` only.
- **DO NOT** hardcode hex colors. Use theme CSS variables.
- **DO NOT** modify any files from Epic 1 (layout.tsx, globals.css, page.tsx, landing components, ui components).
- **DO NOT** create the Zustand consultation store in this story. Use local state and callback props.
- **DO NOT** implement photo compression in this story (that is Story 2.3).
- **DO NOT** implement face detection/validation in this story (that is Story 2.4).
- **DO NOT** implement the photo review screen in this story (that is Story 2.5).
- **DO NOT** implement photo upload to Supabase in this story (that is Story 2.6).
- **DO NOT** implement photo persistence to IndexedDB in this story (that is Story 2.7).
- **DO** use native `MediaDevices.getUserMedia` API directly.
- **DO** create `src/components/consultation/` directory (first component here).
- **DO** create `src/lib/photo/` directory (first utility here).
- **DO** create `src/app/consultation/photo/` directory structure.
- **DO** use `'use client'` directive for all components that use browser APIs or React hooks.
- **DO** add `playsInline`, `autoPlay`, and `muted` attributes to the video element (critical for iOS).
- **DO** mirror the video display for front camera with `transform: scaleX(-1)`.
- **DO** stop all media tracks on cleanup to release camera hardware.
- **DO** use correct Portuguese diacritical marks on ALL user-facing strings.
- **DO** test with mocked `navigator.mediaDevices` APIs.
- **DO** follow the existing test patterns from Epic 1 (Vitest + RTL).
- **DO** ensure 140 existing tests still pass (zero regressions).

### Cross-Story Dependencies

- **Story 2.2 (Gallery Upload Alternative):** PhotoCapture component should have a callback/navigation point for "upload from gallery" but the actual gallery upload component is built in Story 2.2. In this story, the "Prefiro enviar uma foto da galeria" link can be a placeholder or navigate to a future route.
- **Story 2.3 (Client-Side Photo Compression):** The captured photo blob from this story will be compressed before upload in Story 2.3. The `onCapture(blob)` callback provides the raw photo. Compression is NOT this story's responsibility.
- **Story 2.4 (Real-Time Photo Validation):** Face detection and validation feedback will be added on top of the camera viewfinder in Story 2.4. The PhotoCapture component should be designed to accept additional overlay components (or Story 2.4 will extend it).
- **Story 2.5 (Photo Review Screen):** After capture, the photo review screen shows the photo with "Usar esta foto" / "Tirar outra" buttons. This story's PhotoCapture should call `onCapture(blob)` and the parent page/component handles navigation to the review step.
- **Story 2.7 (Photo Persistence):** IndexedDB persistence for the photo blob is Story 2.7. This story just captures the photo in memory.
- **Story 1.1 (Design System):** All styling depends on the design system tokens established in Story 1.1. Theme CSS variables must be used consistently.

### Performance Targets

- Camera viewfinder should display within 1 second of permission being granted
- Photo capture (drawing to canvas + blob creation) should complete in under 500ms
- No unnecessary re-renders: camera stream assignment should use refs, not state
- Video element should NOT trigger React re-renders on every frame
- Lazy-load camera component on the photo page (architecture: "Camera API lazy-loaded on photo page") [Source: architecture.md#8.1]

### Git Intelligence

Recent commit patterns from Epic 1:
- `feat(epic-1): implement story 1-6-footer-and-legal-pages`
- `feat(epic-1): implement story 1-5-interactive-demo`
- `feat(epic-1): implement story 1-4-trust-and-privacy-section`

Suggested commit message: `feat(epic-2): implement story 2-1-camera-capture-with-guidance`

### References

- [Source: architecture.md#2.1] -- Tech Stack: MediaDevices API (getUserMedia), native browser camera, no dependencies
- [Source: architecture.md#6.1] -- Project Structure: `src/components/consultation/PhotoCapture.tsx`, `src/hooks/useCamera.ts`, `src/lib/photo/`
- [Source: architecture.md#6.2] -- State Management: Zustand store (future story), photo blob in state
- [Source: architecture.md#6.3] -- Session Persistence: Photo blob stored in IndexedDB (Story 2.7)
- [Source: architecture.md#7.3] -- API Security: Photo validation max 10MB, image/* MIME only
- [Source: architecture.md#8.1] -- Loading Strategy: Camera API lazy-loaded on photo page
- [Source: architecture.md#8.2] -- Image Optimization: Client-side resize to <=800px (Story 2.3)
- [Source: ux-design.md#3.3] -- Photo Upload screen spec: camera-first, oval overlay, tips, capture button
- [Source: ux-design.md#6] -- Accessibility: WCAG 2.1 AA, keyboard nav, prefers-reduced-motion
- [Source: ux-design.md#8.1] -- Micro-interactions: shutter animation + haptic
- [Source: ux-design.md#8.2] -- Error States: red pulse, specific reason, retry button
- [Source: prd.md] -- Photo upload success rate >= 95%
- [Source: epics-and-stories.md#S2.1] -- Story 2.1 acceptance criteria
- [Source: epics-and-stories.md#E2] -- Epic 2 elicitation: Chaos Monkey camera fail, Kano real-time validation
- [Source: 1-1-design-system-setup.md] -- Design system tokens, typography, theme config
- [Source: 1-6-footer-and-legal-pages.md] -- Previous story patterns, test count (140), Portuguese diacritics lesson

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (code review and fixes)

### Debug Log References

- Code review performed 2026-03-01: 10 findings identified, all HIGH/MEDIUM fixed

### Completion Notes List

- All 14 acceptance criteria validated against implementation
- Race condition in handleRequestPermission fixed (state set before async call)
- Permissions API check added to skip pre-permission screen when already granted
- Page metadata added via layout.tsx (Server Component exports metadata)
- Removed unnecessary "use client" directive from useCamera hook
- 197 tests passing (140 existing + 57 new), zero regressions
- No hardcoded hex colors in implementation (design system tokens used throughout)
- All Portuguese text verified with correct diacritical marks
- No existing Epic 1 files were modified

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-01 | Code review: fixed race condition in PhotoCapture handleRequestPermission | Claude Opus 4.6 |
| 2026-03-01 | Code review: added Permissions API check to skip pre-permission when granted | Claude Opus 4.6 |
| 2026-03-01 | Code review: added layout.tsx with metadata export for SEO | Claude Opus 4.6 |
| 2026-03-01 | Code review: removed unnecessary "use client" from useCamera hook | Claude Opus 4.6 |
| 2026-03-01 | Code review: updated all task checkmarks and Dev Agent Record | Claude Opus 4.6 |

### File List

| File | Action | Description |
|------|--------|-------------|
| `src/lib/photo/detect-webview.ts` | Created | WebView detection utility (isInAppBrowser, getExternalBrowserUrl) |
| `src/hooks/useCamera.ts` | Created | Camera access hook (getUserMedia, capture, switch, cleanup) |
| `src/components/consultation/CameraPermissionPrompt.tsx` | Created | Pre-permission explanation screen |
| `src/components/consultation/WebViewBlocker.tsx` | Created | WebView blocking screen with external browser link |
| `src/components/consultation/FaceOvalOverlay.tsx` | Created | SVG face oval overlay with pulsing animation |
| `src/components/consultation/CameraGuidanceTips.tsx` | Created | Rotating camera guidance tips |
| `src/components/consultation/PhotoCapture.tsx` | Created | Main photo capture component (state machine) |
| `src/app/consultation/photo/page.tsx` | Created | Photo capture page route |
| `src/app/consultation/photo/layout.tsx` | Created | Layout with metadata for SEO |
| `src/test/detect-webview.test.ts` | Created | WebView detection tests (14 tests) |
| `src/test/use-camera.test.ts` | Created | Camera hook tests (13 tests) |
| `src/test/camera-capture.test.tsx` | Created | Component + integration tests (30 tests) |
