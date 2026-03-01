---
stepsCompleted: [ux-design-complete]
status: complete
elicitationMethods: 45
date: 2026-03-01
author: Fusuma
---

# UX Design Specification — mynewstyle

**AI-Powered Visagism Platform**
**Date:** 2026-03-01

---

## 1. Design System

### 1.1 Visual Identity

**Design Philosophy:** Premium Modern — sophisticated enough for 40+ professionals, fresh enough for 19-year-old experimenters. NOT "bold urban barbershop." Think Skin+Me meets Spotify Wrapped.

**Dual Theme System:**
- **Male Path:** Dark mode primary. Deep charcoal (#1A1A2E) background, warm amber (#F5A623) accent, cream (#FAF3E0) text. Feels: confident, editorial, clean.
- **Female Path:** Light mode primary. Warm white (#FFF8F0) background, dusty rose (#C4787A) accent, charcoal (#2D2D3A) text. Feels: elegant, warm, trustworthy.
- **Shared:** Both paths use the same component architecture, just themed. NOT "pink it and shrink it."

### 1.2 Typography

| Role | Font | Weight | Size (mobile/desktop) |
|------|------|--------|----------------------|
| Display (hero) | Space Grotesk | 700 | 32px / 48px |
| Heading | Space Grotesk | 600 | 24px / 32px |
| Subheading | Inter | 600 | 18px / 22px |
| Body | Inter | 400 | 16px / 16px |
| Caption | Inter | 400 | 13px / 14px |
| Badge/Label | Inter | 600 | 12px / 12px |

### 1.3 Spacing System

Base unit: 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px.

### 1.4 Border Radius

- Cards: 16px
- Buttons: 12px
- Badges: 8px
- Avatars/Photos: 50% (circle) or 20px (rounded square)

### 1.5 Shadows

- Card: `0 2px 12px rgba(0,0,0,0.08)`
- Elevated: `0 8px 32px rgba(0,0,0,0.12)`
- Preview image: `0 12px 48px rgba(0,0,0,0.2)`

### 1.6 Motion

- Micro-interactions: 200ms ease-out
- Page transitions: 350ms ease-in-out
- Loading animations: continuous, 1.5s loop
- Results reveal: staggered 150ms per element

---

## 2. Information Architecture

### 2.1 Site Map

```
Landing Page (/)
├── Gender Gateway (/start)
├── Photo Upload (/consultation/photo)
├── Questionnaire (/consultation/questionnaire)
├── Processing (/consultation/processing)
├── Results (/consultation/results/:id)
├── Auth
│   ├── Login (/login)
│   └── Register (/register)
├── Profile (/profile)
│   ├── Consultation History
│   └── Favorites
├── Privacy Policy (/privacidade)
└── Terms of Service (/termos)
```

### 2.2 User Flow (Happy Path)

```
Landing → Gender Select → Photo Capture → Questionnaire (5-8 Qs)
→ Processing (loading) → Results → [See How I Look] → Preview
→ Save / Share → Profile (if authenticated)
```

### 2.3 Guest vs Auth Flow

- **Guest:** Can complete ONE full consultation including preview. Results shown but not saved.
- **Prompt to save:** After results, soft CTA: "Create an account to save this consultation and access it anytime."
- **Auth required for:** History, favorites, second consultation, sharing.

---

## 3. Screen-by-Screen Specifications

### 3.1 Landing Page

**Layout:** Full-viewport hero + scrolling content sections.

**Hero Section:**
- Headline: "Descubra o corte perfeito para o seu rosto" (PT) / "Discover the perfect cut for your face" (EN)
- Subheadline: "Consultoria de visagismo com IA — personalizada em 3 minutos"
- CTA Button: "Começar Agora" (primary, large, centered)
- Background: Subtle animated gradient (dark → accent color shift)
- Social proof: "Já ajudámos X pessoas a encontrar o seu estilo"

**Interactive Demo Section:**
- Pre-built consultation result for a sample face (AI-generated, not real person)
- User can interact with the before/after slider
- Caption: "Veja como funciona — sem precisar de foto"

**How It Works (3 Steps):**
1. 📸 "Tire uma selfie" — Icon + short description
2. 🧠 "A IA analisa o seu rosto" — Icon + short description
3. ✨ "Receba o seu estilo ideal" — Icon + short description

**Trust Section:**
- "A sua foto é processada com segurança e nunca é partilhada"
- Privacy-first messaging directly on landing page

**Footer:** Links to privacy policy, terms, social media.

---

### 3.2 Gender Gateway

**Layout:** Split screen (desktop) / stacked cards (mobile).

**Design:**
- Two large cards: "Masculino" | "Feminino"
- Each card has a representative illustration (NOT a real photo — stylized/editorial)
- Hover/tap: card elevates with accent border
- Subtle: "Escolha o seu estilo" heading
- NO "non-binary" label yet, but architecture supports adding a third option

**Behavior:**
- Selection triggers theme transition (dark/light)
- 350ms animated transition between themes
- Selected gender stored in session (not auth-required)

---

### 3.3 Photo Upload

**Layout:** Camera-first on mobile, upload-first on desktop.

**Camera Capture Mode:**
- Full-screen camera viewfinder
- Face outline guide (oval overlay) — helps framing
- On-screen tips (appear/disappear): "Boa iluminação", "Olhe diretamente", "Sem óculos de sol"
- Capture button: large, centered, haptic feedback
- Photo review: captured photo shown with "Usar esta" / "Tirar outra" buttons

**Gallery Upload Mode:**
- Drag-and-drop zone (desktop) / file picker (mobile)
- Accepted formats: JPG, PNG, HEIC
- Consent checkbox: "Confirmo que esta foto é minha" (required for gallery upload)

**Photo Validation (Real-time):**
- ✅ Face detected → green border
- ⚠️ Poor lighting → "Tente com mais luz"
- ⚠️ Multiple faces → "Apenas um rosto, por favor"
- ❌ No face detected → "Não conseguimos detectar um rosto"
- ⚠️ Sunglasses → "Remova os óculos de sol para melhor análise"

**Technical:**
- Frontend compression to ≤ 800px width before upload
- EXIF orientation correction
- Target payload: < 500KB
- Upload progress indicator

---

### 3.4 Questionnaire

**Layout:** One question per screen. Progress bar at top. Back/Next navigation.

**Design Principles:**
- ALL answers are visual/tap-based — zero free text input
- Conditional logic: questions adapt based on previous answers
- Each question has a subtle illustration or icon
- Mobile-optimized touch targets (min 48px)

**Male Questionnaire Flow:**

| # | Question | Type | Options |
|---|----------|------|---------|
| 1 | Qual é o seu estilo? | Image grid (2×2) | Clássico, Moderno, Ousado, Minimalista |
| 2 | Quanto tempo dedica ao cabelo? | Slider | 0 min → 15+ min |
| 3 | Ambiente profissional? | Icon cards | Corporativo, Criativo, Casual, Remoto |
| 4 | O seu cabelo é... | Image cards | Liso, Ondulado, Cacheado, Crespo, Pouco cabelo/Calvo |
| 5 | Barba? | Image cards | Sem barba, Barba curta, Barba média, Barba longa |
| 6* | Alguma preocupação? | Multi-select chips | Entradas, Fios brancos, Cabelo fino, Nenhuma |

*Q6 conditional: skipped if Q4 = "Calvo"*

**Female Questionnaire Flow:**

| # | Question | Type | Options |
|---|----------|------|---------|
| 1 | Qual é o seu estilo? | Image grid (2×2) | Clássico, Moderno, Ousado, Natural |
| 2 | Quanto tempo dedica ao cabelo? | Slider | 0 min → 30+ min |
| 3 | Ambiente profissional? | Icon cards | Corporativo, Criativo, Casual, Remoto |
| 4 | O seu cabelo é... | Image cards | Liso, Ondulado, Cacheado, Crespo |
| 5 | Comprimento atual? | Image cards | Muito curto, Curto, Médio, Longo |
| 6 | Comprimento desejado? | Image cards | Mais curto, Manter, Mais longo, Sem preferência |
| 7 | Alguma preocupação? | Multi-select chips | Frizz, Pontas duplas, Volume, Fios brancos, Nenhuma |

**Target completion time:** < 90 seconds.

---

### 3.5 Processing Screen

**Layout:** Centered content, photo as focal point.

**Phase 1 — Face Mapping (0-10s):**
- User's photo centered on screen
- Animated face mesh overlay (dots connecting on forehead, jawline, cheekbones)
- Text: "A analisar o formato do seu rosto..."
- Subtle pulsing glow around the photo

**Phase 2 — Style Matching (10-20s):**
- Photo with face shape outline highlighted
- Flash of hairstyle reference images appearing and fading around the photo
- Text: "A encontrar os estilos ideais para si..."

**Phase 3 — Generating Results (20-30s):**
- Photo with subtle shimmer/sparkle effect on hair area
- Text cycling: "A preparar a sua consultoria...", "Quase pronto...", "A criar o seu resultado..."

**Educational Moments (rotating tips during wait):**
- "Sabia que existem 7 formatos de rosto?"
- "O visagismo combina ciência com arte para harmonizar o seu visual"
- "Cada formato de rosto tem cortes que criam equilíbrio visual"

**Progress:** Indeterminate progress bar with estimated time ("~20 segundos restantes")

**Instant Value Signal:** If face shape detection completes before full consultation:
- Show face shape result immediately: "O seu rosto é **Oval** ✓"
- Continue processing recommendations in background
- User gets value in 10 seconds → hooked before they can bail

---

### 3.6 Results Page

**Content Hierarchy (strict, decreasing visual weight):**

#### Section A — Face Shape Analysis (Hero)

- **Face Shape Badge:** Large, styled badge with icon: "Rosto Oval"
- **Confidence:** "93% de certeza" (subtle, below badge)
- **User's Photo:** Displayed with face shape outline overlay
- **Explanation:** 2-3 sentences explaining why this face shape was identified, what characterizes it
- **Proportion Analysis:** Visual diagram showing forehead/cheekbone/jaw ratios

#### Section B — Top Recommendation (Hero Card)

- **#1 Badge:** Gold/accent colored "Recomendação Principal"
- **Style Name:** Large typography, e.g., "Textured Crop"
- **Justification:** 2-3 sentences explaining WHY this suits the user's face shape (visagism reasoning)
- **Match Score:** "93% compatível com o seu rosto"
- **Difficulty Badge:** "Manutenção: Baixa" (Low/Medium/High)
- **CTA Button:** "Ver como fico" (primary, large, prominent)

#### Section C — Alternative Recommendations (Secondary)

- **Recommendation #2 and #3** as smaller cards below hero
- Same structure: name, justification, match score, "Ver como fico" button (secondary style)
- Collapsible on mobile — show titles, expand for details

#### Section D — Styles to Avoid

- **Section header:** "Estilos a evitar" with ⚠️ icon
- **2-3 styles** that don't suit the face shape, with brief explanation
- Example: "Cortes muito rentes nas laterais acentuam a largura de um rosto redondo"
- **Trust-builder:** Shows the AI understands, not just generates

#### Section E — Grooming (Gender-Specific)

**Male:** Beard style recommendations matching face shape
**Female:** Layering, fringe, and parting recommendations

- Icon-based layout
- 3-4 tips in card format

#### Section F — Styling Tips

- Parsed into categorized cards with icons
- Categories: "Produtos", "Rotina Diária", "Dicas para o Barbeiro/Cabeleireiro"
- Each tip is a separate visual card, not a text dump

#### Section G — Actions Footer

- "Partilhar resultado" (share — generates social card)
- "Nova consultoria" (start over)
- "Guardar" (save — prompts auth if guest)
- "Voltar ao início"

---

### 3.7 AI Preview ("Ver como fico")

**Trigger:** User taps "Ver como fico" on a recommendation card.

**Loading State:**
- User's photo appears in the card
- Animated gradient sweep over the hair area (top-down "curtain of light")
- Floating sparkle particles over hair zone
- Pulsing blur effect on the photo
- Text cycling: "A aplicar o estilo...", "A ajustar ao seu rosto...", "Quase pronto..."
- Other "Ver como fico" buttons disabled during generation

**Result Display:**
- Smooth crossfade from loading to generated preview
- Before/after comparison: interactive slider (drag left/right)
- Or toggle: two buttons "Original" / "Novo Estilo"
- Expectation framing (small text below): "Visualização artística — resultado final depende do seu cabelo e cabeleireiro"

**Quality Gate:**
- If AI confidence < threshold → don't show preview
- Display: "Visualização indisponível para este estilo — veja as recomendações escritas"
- Never show a bad preview — "unavailable" beats "ugly"

**Share Preview:**
- Standalone shareable image (9:16 for stories, 1:1 for feed)
- Watermark: "mynewstyle.com" subtle bottom corner
- User can download directly

---

### 3.8 Profile & History

**Layout:** Tab-based — "Consultorias" | "Favoritos"

**Consultation History:**
- Cards with: date, face shape badge, top recommendation thumbnail, "Ver novamente" button
- Sorted newest first
- Each card expandable to full results

**Favorites:**
- Grid of saved style recommendations
- Tap to view full recommendation + preview

---

### 3.9 Auth Screens

**Login:** Email/password + Google OAuth button. Clean, minimal. Link to register.
**Register:** Name, email, password + Google OAuth. Consent checkbox for data processing (LGPD).
**Design:** Consistent with selected gender theme (if chosen) or neutral default.

---

## 4. Component Library

### 4.1 Core Components

| Component | Variants | Notes |
|-----------|----------|-------|
| Button | Primary, Secondary, Ghost, Disabled | 48px min height mobile |
| Card | Default, Elevated, Hero, Recommendation | 16px radius |
| Badge | Face Shape, Match Score, Difficulty, Status | Color-coded |
| Progress Bar | Determinate, Indeterminate | Accent color |
| Photo Frame | Default, With Overlay, With Comparison | 20px radius |
| Question Card | Image Grid, Slider, Icon Cards, Multi-Select | Full-width mobile |
| Slider (Before/After) | Horizontal drag | Custom thumb |
| Loading Shimmer | Text, Image, Card | Animated gradient |
| Toast | Success, Error, Info | Auto-dismiss 4s |
| Modal | Confirm, Auth Prompt, Share | Portal-based |

### 4.2 Icons

Use **Lucide** icon set for consistency:
- Scissors (corte), User (perfil), Camera, Upload, Star (favorito)
- AlertTriangle (aviso), CheckCircle (sucesso), Share, Download
- Custom: Face shape silhouettes (oval, square, round, etc.)

---

## 5. Responsive Breakpoints

| Breakpoint | Width | Layout Notes |
|-----------|-------|-------------|
| Mobile S | 320px | Single column, stacked cards |
| Mobile | 375px | Primary target — design here first |
| Mobile L | 428px | Slightly wider cards |
| Tablet | 768px | 2-column recommendations |
| Desktop | 1024px | Side-by-side photo + analysis |
| Desktop L | 1440px | Max content width 1200px, centered |

---

## 6. Accessibility

- WCAG 2.1 AA compliance
- All interactive elements keyboard-navigable
- Color contrast 4.5:1 (normal text), 3:1 (large text)
- Alt text for all images including AI-generated previews
- Screen reader support: aria-labels on all interactive components
- Reduced motion: respect `prefers-reduced-motion` — disable animations
- Photo capture: support for assisted capture (voice guidance future feature)
- Text-only consultation fallback for users who cannot upload photos

---

## 7. Elicitation Applied to UX Design

### Section: Gender Gateway

**Method 1: User Focus Group**
*Non-binary user:* "Binary choice feels exclusionary." *40+ male:* "The split screen with models intimidates me — I don't look like that."
→ **Impact:** Use abstract illustrations not model photos. Architecture supports third option. Neutral, welcoming language.

**Method 2: First Principles**
The gateway exists to adapt recommendations. The MINIMUM requirement is knowing which style framework to apply. Gender is a proxy.
→ **Impact:** Consider reframing as "Style Framework" not "Gender" in future — "Cortes masculinos" / "Cortes femininos" instead of "Masculino" / "Feminino."

**Method 3: Competitive Teardown**
visagist-bot: no gateway (male-only). FaceApp: no gateway (applies any style). HairstyleAI: gender select dropdown (boring).
→ **Impact:** Make gateway feel like a CHOICE, not a form field. Visual, full-screen, immersive.

**Method 4: Pre-mortem**
"Female users felt the platform was 'for men with a female option added.' The gateway set the wrong expectation."
→ **Impact:** Female card must feel equally primary — same visual weight, same design investment.

**Method 5: SCAMPER**
Reverse: skip gateway, let AI detect gender from photo. Eliminate: show all styles, let user browse.
→ **Impact:** Auto-detect as fallback if user skips. "Ver todos os estilos" as hidden third option.

---

### Section: Photo Upload

**Method 1: Chaos Monkey**
Camera fails on Samsung browser. Gallery upload sends 15MB HEIC. Face detection loops "no face found" on valid photos.
→ **Impact:** Multi-fallback: camera → gallery → URL paste. Max file size 10MB pre-compression. Face detection with 3 retries + manual override.

**Method 2: Stakeholder Round Table**
*Accessibility expert:* "Selfie arm-length requirement excludes mobility-impaired users." *Privacy advocate:* "Camera permissions scare users — explain WHY before requesting."
→ **Impact:** Allow friend/assistant to take photo. Pre-permission explanation screen.

**Method 3: Red Team**
"Someone uploads a celebrity photo to see what haircut suits them. Then shares 'the AI says Brad Pitt should get a mullet' — goes viral, wrong context."
→ **Impact:** Consent checkbox for gallery uploads. Consider liveness detection (blink) for camera.

**Method 4: Jobs-to-be-Done**
User hires photo upload to "give the AI enough data to help me." They want accuracy, not a photoshoot.
→ **Impact:** Guidance should focus on "this helps the AI analyze better" not "take a perfect photo."

**Method 5: Kano Model**
Camera capture: Must-Have. Gallery upload: Must-Have. Real-time validation: Performance. Photo quality guidance: Delighter.
→ **Impact:** Invest most in validation UX — it's where users feel frustration or confidence.

---

### Section: Questionnaire

**Method 1: SCAMPER**
Adapt Tinder: swipe through style images. Eliminate: AI infers from photo alone. Combine: overlay questions on camera.
→ **Impact:** Style preference question uses swipeable image carousel. Keep questionnaire but mark it as "refines your results" (optional for impatient users).

**Method 2: Pre-mortem**
"Users abandoned at question 4. The questionnaire felt like a form, not a conversation."
→ **Impact:** One question per screen. Conversational tone. Progress bar shows "Quase lá!" at 80%.

**Method 3: User Focus Group**
*Bald user:* "It asked me about hair texture. Insulting." *Young user:* "Where's 'e-boy' in the style options?"
→ **Impact:** Conditional logic skips irrelevant questions. Style options include youth/experimental categories.

**Method 4: Constraint Mapping**
Mobile attention span = 60-90 seconds for a questionnaire. Each question must be answerable in < 15 seconds.
→ **Impact:** Maximum 6 questions for male, 7 for female. All tap-based, no typing.

**Method 5: Competitive Teardown**
visagist-bot: no questionnaire (photo-only). HairstyleAI: 12-question form (too long). FaceShape: 3 questions (too shallow).
→ **Impact:** Sweet spot: 5-7 questions. More than photo-only (better personalization) but less than a form.

---

### Section: Results Page

**Method 1: First Principles**
User needs 3 things: (1) validation ("the AI sees me correctly"), (2) recommendation ("here's what to do"), (3) confidence ("here's proof it works"). Everything else is secondary.
→ **Impact:** Strict 3-tier hierarchy. Face shape first (validation), top recommendation second (action), preview third (confidence).

**Method 2: Red Team**
"The results page is a wall of text. Users screenshot the preview and ignore everything else."
→ **Impact:** Design for scanning. The preview IS the result for most users. Make it prominent. Everything else is supporting context.

**Method 3: Kano Model**
Face shape analysis: Must-Have. Recommendations: Must-Have. Preview: Performance (must be good). Styles to avoid: Delighter. Confidence scores: Delighter. Animated reveal: Delighter.
→ **Impact:** Invest in Must-Haves first. Delighters make it shareable.

**Method 4: SCAMPER**
Adapt Spotify Wrapped: reveal results one by one with animations. Modify: add "styles to avoid" section. Put to other uses: results as barber reference card.
→ **Impact:** Staggered reveal animation. "Mostrar ao barbeiro" button that generates a clean reference card.

**Method 5: Stakeholder Round Table**
*Barber:* "I need the reference image, the style name, and the face shape. Nothing else. Make it easy for MY workflow."
→ **Impact:** "Cartão para o barbeiro" — one-tap generates a clean card with: photo, face shape, top recommendation, preview. Optimized for showing on a phone at the barbershop.

---

### Section: Processing/Loading

**Method 1: Pre-mortem**
"Users thought the app crashed during processing. 30 seconds of silence = abandonment."
→ **Impact:** Constant visual feedback. Phase-based messaging. Instant face shape reveal at 10 seconds.

**Method 2: SCAMPER**
Combine: loading + education. Adapt: gamification during wait. Eliminate: show cached result from similar face shape while personal result generates.
→ **Impact:** Educational tips during wait. Show face shape early. Never let the screen feel "stuck."

**Method 3: User Focus Group**
"I don't trust that it's actually analyzing. Show me WHAT it's doing."
→ **Impact:** Face mesh animation shows the AI "mapping" the face. Feels technical and trustworthy.

**Method 4: Constraint Mapping**
Edge Function timeout: 60s. AI processing: 20-30s analysis + recommendations. Image gen: 30-60s (on-demand later).
→ **Impact:** Processing screen handles up to 30s gracefully. Preview generation has its own loading state.

**Method 5: Jobs-to-be-Done**
User hires the loading screen to "reassure me that something good is coming."
→ **Impact:** Loading is an EXPERIENCE, not a wait. It builds anticipation. The face shape early reveal is the hook.

---

### Section: Mobile UX

**Method 1: Constraint Mapping**
- 375px width is primary target
- Thumb-zone optimization: primary actions in bottom 40% of screen
- iOS safe areas (notch, home indicator)
- Android back button behavior

**Method 2: Chaos Monkey**
- User switches apps during processing → session must persist, resume on return
- Low battery popup interrupts camera → graceful recovery
- Slow 3G connection → progressive loading, compress everything

**Method 3: Pre-mortem**
"Mobile users on Android WebView (opened from Instagram ad) couldn't access camera. WebView has restricted permissions."
→ **Impact:** Detect WebView → prompt "Abrir no navegador" with deep link.

**Method 4: First Principles**
Mobile consultation = one hand, portrait, moving between apps. Every interaction must be completable with one thumb.
→ **Impact:** Bottom-anchored CTAs. Swipe gestures for navigation. No pinch-to-zoom requirements.

**Method 5: Red Team**
"The before/after slider is impossible to use on a 320px screen. The drag target is too small."
→ **Impact:** Alternative to slider on small screens: toggle buttons "Original" / "Novo Estilo" with crossfade animation.

---

### Section: Sharing & Virality

**Method 1: Jobs-to-be-Done**
Users hire sharing for: (1) "Show my friends what I'm thinking" (2) "Show my barber what I want" (3) "Flex that I found a cool tool"
→ **Impact:** Three share formats: social story card, barber reference card, "I discovered mynewstyle" link.

**Method 2: SCAMPER**
Adapt Instagram Stories: vertical card with before/after. Combine: share + referral link. Modify: animated share card (video, not static).
→ **Impact:** Share generates a branded vertical card (9:16) with before/after + "Descubra o seu estilo em mynewstyle.com."

**Method 3: Competitive Teardown**
PhotoRoom: share rate drives all growth. Spotify Wrapped: shareability = the entire marketing strategy.
→ **Impact:** Shareable result card is as important as the result itself. Design it for maximum screenshot appeal.

**Method 4: Pre-mortem**
"Users screenshotted results but the screenshot looked ugly — no branding, partial layout, text cut off."
→ **Impact:** "Share" generates a DESIGNED image, not a page screenshot. Always looks good.

**Method 5: Constraint Mapping**
Social platforms compress images. WhatsApp strips metadata. Instagram stories need 9:16 exactly.
→ **Impact:** Generate share images at exact social platform ratios. High-res PNG for quality after compression.

---

## 8. Interaction Patterns

### 8.1 Micro-interactions

| Interaction | Behavior |
|------------|----------|
| Gender card tap | Card lifts (translateY -4px), accent border appears, theme begins transitioning |
| Photo capture | Shutter animation + haptic, photo slides into frame |
| Question answer | Selected option scales up briefly (1.05x), checkmark appears, auto-advances after 300ms |
| "Ver como fico" tap | Button morphs into loading state (spinner replaces text), card expands to show preview area |
| Result card reveal | Slides up from bottom with 150ms stagger per card |
| Before/after slider | Smooth drag, thumb snaps to center on release |
| Save/favorite | Heart icon fills with burst animation (like Twitter's old heart) |
| Share | Card flips to show generated share image preview |

### 8.2 Error States

| Error | UX |
|-------|-----|
| Photo rejected | Red pulse on photo frame, specific reason shown, "Tentar novamente" button |
| AI processing failed | Apologetic message + retry button: "Algo correu mal. Tentar de novo?" |
| Preview unavailable | Gentle message in card: "Visualização indisponível para este estilo" (no preview better than bad preview) |
| Network lost | Toast: "Sem ligação — os seus dados estão guardados" + offline results cache |
| Session expired | Soft redirect to login with "A sua sessão expirou" — preserve consultation state |

### 8.3 Empty States

| State | UX |
|-------|-----|
| No consultation history | Illustration + "Ainda não tem consultorias. Descubra o seu estilo!" + CTA |
| No favorites | Illustration + "Guarde os seus estilos favoritos aqui" |
| Profile incomplete | Subtle prompt card at top of profile |

---

## 9. Barber Reference Card (New Feature from Elicitation)

**Purpose:** Dedicated shareable card optimized for showing to a barber/stylist.

**Content:**
- User's photo (small)
- Face shape badge
- Top recommended style name
- AI preview (if generated)
- 2-3 bullet points of key style notes
- NO branding clutter — clean, professional

**Format:** Single image, fits phone screen, high contrast for barbershop lighting.

**Access:** "Mostrar ao barbeiro" button on results page.

---

## 10. Elicitation Summary for UX

### Methods Applied: 45 (5 per section × 9 UX sections)

| Section | Methods |
|---------|---------|
| Gender Gateway | Focus Group, First Principles, Competitive Teardown, Pre-mortem, SCAMPER |
| Photo Upload | Chaos Monkey, Stakeholder Round Table, Red Team, JTBD, Kano |
| Questionnaire | SCAMPER, Pre-mortem, Focus Group, Constraint Mapping, Competitive Teardown |
| Results Page | First Principles, Red Team, Kano, SCAMPER, Stakeholder Round Table |
| Processing/Loading | Pre-mortem, SCAMPER, Focus Group, Constraint Mapping, JTBD |
| Mobile UX | Constraint Mapping, Chaos Monkey, Pre-mortem, First Principles, Red Team |
| Sharing/Virality | JTBD, SCAMPER, Competitive Teardown, Pre-mortem, Constraint Mapping |
| Error/Edge States | Chaos Monkey, Red Team, Pre-mortem, First Principles, Stakeholder Round Table |
| Design System | Competitive Teardown, Focus Group, First Principles, Kano, SCAMPER |

### Top UX Insights from Elicitation

1. **Instant face shape reveal (10s)** hooks users before they can bail — most valuable UX innovation
2. **Guest flow is non-negotiable** — auth before value = 30-50% conversion loss
3. **"Styles to avoid"** builds more trust than "styles to try"
4. **Barber reference card** is highest-utility feature (JTBD #4)
5. **Preview quality gate** — showing nothing beats showing bad AI output
6. **Share generates designed image** — not a page screenshot
7. **Questionnaire must be visual/tap-only** — free text kills mobile completion
8. **Conditional questionnaire logic** prevents tone-deaf questions (bald users asked about hair texture)
9. **Female path needs genuinely different design identity** — not a color swap
10. **Loading is an experience** — face mapping animation builds trust and anticipation

---

## 11. Payment Flow UX

### 11.1 Paywall Placement

The paywall sits **between the free face shape reveal and the full consultation.**

```
Photo → Questionnaire → Processing → Face Shape Reveal (FREE)
                                        ↓
                              "Quer ver os cortes ideais?"
                                        ↓
                              Payment (€5.99 / €2.99)
                                        ↓
                              Full Results + Previews
```

**Why here:** User has already invested time (photo + questionnaire) and received proof the AI works (face shape). Maximum motivation to unlock the rest. Sunk cost + demonstrated value = highest conversion point.

### 11.2 Paywall Screen

**Layout:** Face shape result visible at top (reward already earned). Blurred preview of recommendations below (tease).

**Content:**
- Face shape badge + explanation (already revealed, unblurred)
- Blurred recommendation cards with visible style names but blurred details
- Blurred "Ver como fico" previews
- Clear CTA: "Desbloquear consultoria completa"

**Pricing Display:**
- First-time user: "€5.99 — Consultoria completa"
- Returning user: "€2.99 — Nova consultoria"
- Below CTA: "Inclui: 2-3 cortes recomendados • Visualização IA • Cartão para o barbeiro • Dicas de styling"
- Trust badge: "Reembolso automático se a IA falhar"

**Payment Methods (stacked buttons):**
1. Apple Pay / Google Pay (one-tap, primary — largest button)
2. Cartão de crédito/débito (Stripe checkout)

**No account required to pay.** Guest can pay → see results → prompted to save after.

### 11.3 Payment Success

- No redirect to separate "thank you" page
- Paywall dissolves with smooth animation (blur → clear, 500ms)
- Results reveal with staggered animation (like Spotify Wrapped)
- Subtle confetti or sparkle micro-animation on unlock

### 11.4 Payment Failure

- Inline error: "Pagamento não processado. Tente outro método."
- Retry button stays visible
- User's progress (photo, questionnaire, face shape) is NEVER lost

### 11.5 Returning User Detection

- If user is authenticated and has previous consultation → show €2.99 price
- If guest → always €5.99 (can't verify history without account)
- Soft nudge for guests: "Crie uma conta para pagar €2.99 nas próximas consultorias"

### 11.6 Upsell Moments

**Post-results upsell (paleta de cores):**
- After viewing full results, subtle card at bottom:
- "🎨 Descubra também as cores que combinam com o seu rosto — €3.99"
- NOT aggressive — positioned as natural next step
- One-tap purchase (payment method already on file)

**Re-consultation nudge (push notification, future):**
- 4-6 weeks after consultation: "Novo corte? Veja como ficaria com um estilo diferente — €2.99"

### 11.7 Elicitation Applied

**Pre-mortem:** "Users felt tricked — they invested 3 minutes and then hit a paywall." → **Mitigation:** Free face shape is a REAL result, not a teaser. Users got value before paying.

**JTBD:** User hires the paywall to "confirm this is worth my money." → **Mitigation:** Blurred results show ENOUGH to prove value (visible style names, blurred details).

**Red Team:** "Someone screenshots the blurred results, zooms in, reads through the blur." → **Mitigation:** Server-side gating — blurred results are placeholder images, not CSS blur on real content.

**First Principles:** The minimum paywall shows: (1) what you already got for free, (2) what you'll get for paying, (3) one button. → **Mitigation:** Three elements only. No walls of text.

**Chaos Monkey:** "Stripe goes down during peak." → **Mitigation:** Queue the consultation generation anyway, show "payment pending" state, process when Stripe recovers. Never lose the user's data.
