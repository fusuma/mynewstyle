---
status: complete
elicitationMethods: 45
date: 2026-03-01
author: Fusuma
---

# Epics & User Stories — mynewstyle

**Sprint-Ready Backlog with BMAD Elicitation**

---

## Epic Overview

| # | Epic | Stories | Priority | Sprint Target |
|---|------|---------|----------|---------------|
| E1 | Landing Page & Design System | 6 | P0 | Sprint 1 |
| E2 | Photo Capture & Validation | 7 | P0 | Sprint 1-2 |
| E3 | Questionnaire Flow | 6 | P0 | Sprint 2 |
| E4 | AI Pipeline (Analysis + Consultation) | 8 | P0 | Sprint 2-3 |
| E5 | Payment Integration | 6 | P0 | Sprint 3 |
| E6 | Results Page | 8 | P0 | Sprint 3-4 |
| E7 | AI Preview Generation (Nano Banana 2) | 7 | P0 | Sprint 4 |
| E8 | Auth & User Profile | 6 | P1 | Sprint 4-5 |
| E9 | Sharing & Virality | 5 | P1 | Sprint 5 |
| E10 | Observability & Analytics | 5 | P1 | Sprint 5 |
| E11 | LGPD Compliance | 5 | P0 | Sprint 3 (parallel) |
| E12 | Future Add-ons (Paleta de Cores) | 4 | P2 | Post-MVP |
| **Total** | | **73** | | **~10 weeks** |

---

## E1: Landing Page & Design System

### Elicitation Applied

**SCAMPER:** Replace landing page with interactive demo → added S1.5. **User Focus Group:** "Bold urban" alienates 40+ users → shifted to "premium modern." **Competitive Teardown:** Skin+Me editorial feel + FaceApp shareability = sweet spot. **Pre-mortem:** "Landing page had no social proof — nobody trusted an unknown AI tool." **First Principles:** Landing page has one job: get user to tap "Começar."

---

**S1.1 — Design System Setup**
> As a developer, I want to set up the dual theme system (dark male / warm light female) with Tailwind + shadcn/ui so all components adapt to gender selection.

**Acceptance Criteria:**
- [ ] Tailwind config with male theme (charcoal #1A1A2E, amber #F5A623, cream #FAF3E0)
- [ ] Tailwind config with female theme (warm white #FFF8F0, dusty rose #C4787A, charcoal #2D2D3A)
- [ ] ThemeProvider component switches theme based on gender context
- [ ] Typography scale: Space Grotesk (display/heading), Inter (body/caption)
- [ ] Base component library: Button (primary/secondary/ghost), Card, Badge, Toast
- [ ] Spacing system: 4px base unit
- [ ] Motion tokens: 200ms micro, 350ms page, 1.5s loading loop

**Story Points:** 5

---

**S1.2 — Landing Page Hero Section**
> As a visitor, I want to see a compelling hero section so I understand the product and feel motivated to try it.

**Acceptance Criteria:**
- [ ] Headline: "Descubra o corte perfeito para o seu rosto"
- [ ] Subheadline: "Consultoria de visagismo com IA — personalizada em 3 minutos"
- [ ] Primary CTA: "Começar Agora" button (large, centered)
- [ ] Animated gradient background (subtle, not distracting)
- [ ] SSR rendered for SEO (Next.js server component)
- [ ] Mobile-first: looks great on 375px
- [ ] Lighthouse performance score ≥ 90

**Story Points:** 3

---

**S1.3 — How It Works Section**
> As a visitor, I want to understand the 3-step process so I feel confident about what to expect.

**Acceptance Criteria:**
- [ ] 3 steps: 📸 "Tire uma selfie" → 🧠 "A IA analisa" → ✨ "Receba o seu estilo"
- [ ] Icon + short description per step
- [ ] Responsive: horizontal on desktop, vertical stack on mobile
- [ ] Smooth scroll anchor from hero CTA

**Story Points:** 2

---

**S1.4 — Trust & Privacy Section**
> As a visitor, I want to see privacy assurances so I feel safe uploading my photo.

**Acceptance Criteria:**
- [ ] "A sua foto é processada com segurança e nunca é partilhada"
- [ ] Privacy-first messaging with lock icon
- [ ] Link to full privacy policy (/privacidade)
- [ ] Social proof placeholder: "Já ajudámos X pessoas" (dynamic counter later)

**Story Points:** 1

---

**S1.5 — Interactive Demo**
> As a visitor, I want to see a sample consultation result so I understand what I'll get before uploading my photo.

**Acceptance Criteria:**
- [ ] Pre-built consultation result for a sample face (AI-generated, not real person)
- [ ] Interactive before/after slider works on the demo
- [ ] Caption: "Veja como funciona — sem precisar de foto"
- [ ] Demo doesn't require auth or photo upload
- [ ] Mobile-optimized touch slider

**Story Points:** 3

---

**S1.6 — Footer & Legal Pages**
> As a visitor, I want access to privacy policy and terms of service.

**Acceptance Criteria:**
- [ ] Footer with links: Privacidade, Termos, Contact
- [ ] /privacidade page with LGPD-compliant privacy policy
- [ ] /termos page with terms of service including AI advice disclaimer
- [ ] "Entertainment/inspiration" framing for AI recommendations (legal protection)

**Story Points:** 2

---

## E2: Photo Capture & Validation

### Elicitation Applied

**Chaos Monkey:** Camera fails on Samsung browser → multi-fallback (camera → gallery → retry). **Stakeholder Round Table:** Accessibility expert flagged mobility-impaired selfie difficulty. **Red Team:** Someone uploads a celebrity photo → consent checkbox + liveness detection (v2). **JTBD:** User hires photo upload to "give the AI enough data." **Kano Model:** Real-time validation = Performance (frustration or confidence).

---

**S2.1 — Camera Capture with Guidance**
> As a user, I want to take a selfie with on-screen guidance so the AI gets a good photo for analysis.

**Acceptance Criteria:**
- [ ] Full-screen camera viewfinder using MediaDevices.getUserMedia
- [ ] Face outline guide (oval overlay) for framing
- [ ] On-screen tips appear/disappear: "Boa iluminação", "Olhe diretamente", "Sem óculos de sol"
- [ ] Capture button: large, centered, 48px min touch target
- [ ] Front camera default, toggle to rear available
- [ ] Pre-permission explanation screen: "Precisamos da câmera para analisar o seu rosto"
- [ ] WebView detection → prompt "Abrir no navegador" with deep link

**Story Points:** 5

---

**S2.2 — Gallery Upload Alternative**
> As a user, I want to upload a photo from my gallery if I can't use the camera.

**Acceptance Criteria:**
- [ ] File picker accepting JPG, PNG, HEIC
- [ ] Drag-and-drop zone on desktop
- [ ] Max file size: 10MB (pre-compression)
- [ ] Consent checkbox: "Confirmo que esta foto é minha" (required for gallery)
- [ ] EXIF orientation correction

**Story Points:** 3

---

**S2.3 — Client-Side Photo Compression**
> As a developer, I want photos compressed before upload so API payloads are optimized.

**Acceptance Criteria:**
- [ ] Canvas API resize to ≤800px width
- [ ] JPEG output at 85% quality
- [ ] Target: <500KB after compression
- [ ] Preserves aspect ratio
- [ ] Works on iOS Safari + Chrome Android

**Story Points:** 2

---

**S2.4 — Real-Time Photo Validation**
> As a user, I want immediate feedback on my photo so I know if it's good enough.

**Acceptance Criteria:**
- [ ] ✅ Face detected → green border
- [ ] ⚠️ Poor lighting → "Tente com mais luz"
- [ ] ⚠️ Multiple faces → "Apenas um rosto, por favor"
- [ ] ❌ No face detected → "Não conseguimos detectar um rosto"
- [ ] ⚠️ Sunglasses → "Remova os óculos de sol"
- [ ] Face must occupy >30% of frame
- [ ] 3 retry attempts before manual override ("Usar mesmo assim")
- [ ] Client-side face detection (TensorFlow.js or MediaPipe Face Detection)

**Story Points:** 5

---

**S2.5 — Photo Review Screen**
> As a user, I want to review my photo before submitting so I can retake if needed.

**Acceptance Criteria:**
- [ ] Captured/uploaded photo displayed at full resolution
- [ ] "Usar esta foto" (primary) and "Tirar outra" (secondary) buttons
- [ ] Validation result shown (face detected, quality score)
- [ ] Bottom-anchored buttons (thumb-zone optimized)

**Story Points:** 2

---

**S2.6 — Photo Upload to Storage**
> As a developer, I want photos uploaded to Supabase Storage with user-scoped access.

**Acceptance Criteria:**
- [ ] Upload to `consultation-photos` bucket
- [ ] Path: `{user_id or guest_session_id}/{consultation_id}/original.jpg`
- [ ] Signed URL generation (15-minute expiry)
- [ ] Progress indicator during upload
- [ ] Retry on network failure (up to 2 retries)
- [ ] Store photo URL in consultation record

**Story Points:** 3

---

**S2.7 — Photo Persistence for Session Recovery**
> As a user, I want my photo preserved if I switch apps so I don't have to retake it.

**Acceptance Criteria:**
- [ ] Photo blob stored in IndexedDB
- [ ] Rehydrate on app return
- [ ] Clear on consultation complete or explicit discard
- [ ] Handles iOS Safari memory pressure gracefully

**Story Points:** 3

---

## E3: Questionnaire Flow

### Elicitation Applied

**SCAMPER:** Tinder-style swipe for style preference → visual image carousel. **Pre-mortem:** "Users abandoned at Q4 — felt like a form." → one-per-screen, conversational. **User Focus Group:** Bald user asked about hair texture → conditional logic. **Constraint Mapping:** Mobile attention span = 60-90s max. **Competitive Teardown:** 5-7 questions = sweet spot.

---

**S3.1 — Questionnaire Engine**
> As a developer, I want a reusable questionnaire engine with conditional logic so questions adapt to user context.

**Acceptance Criteria:**
- [ ] One question per screen with progress bar
- [ ] Back/Next navigation
- [ ] Auto-advance 300ms after answer selection
- [ ] Conditional logic: skip irrelevant questions (e.g., skip hair texture for "bald")
- [ ] All answers stored in Zustand store
- [ ] Session persistence (survives page refresh)

**Story Points:** 5

---

**S3.2 — Male Questionnaire Content**
> As a male user, I want tailored questions about my style so the AI understands my preferences.

**Acceptance Criteria:**
- [ ] Q1: Style preference (image grid 2×2): Clássico, Moderno, Ousado, Minimalista
- [ ] Q2: Time on hair (slider): 0 min → 15+ min
- [ ] Q3: Work environment (icon cards): Corporativo, Criativo, Casual, Remoto
- [ ] Q4: Hair type (image cards): Liso, Ondulado, Cacheado, Crespo, Pouco cabelo/Calvo
- [ ] Q5: Beard (image cards): Sem barba, Curta, Média, Longa
- [ ] Q6: Concerns (multi-select chips): Entradas, Fios brancos, Cabelo fino, Nenhuma
- [ ] Q6 skipped if Q4 = "Calvo"
- [ ] All options visual/tap-based, zero free text

**Story Points:** 3

---

**S3.3 — Female Questionnaire Content**
> As a female user, I want tailored questions that respect my specific hair needs.

**Acceptance Criteria:**
- [ ] Q1: Style preference (image grid 2×2): Clássico, Moderno, Ousado, Natural
- [ ] Q2: Time on hair (slider): 0 min → 30+ min
- [ ] Q3: Work environment (icon cards): Corporativo, Criativo, Casual, Remoto
- [ ] Q4: Hair type (image cards): Liso, Ondulado, Cacheado, Crespo
- [ ] Q5: Current length (image cards): Muito curto, Curto, Médio, Longo
- [ ] Q6: Desired length (image cards): Mais curto, Manter, Mais longo, Sem preferência
- [ ] Q7: Concerns (multi-select chips): Frizz, Pontas duplas, Volume, Fios brancos, Nenhuma
- [ ] All visual/tap-based

**Story Points:** 3

---

**S3.4 — Question Card Components**
> As a user, I want visually engaging question cards so the questionnaire feels fun, not like a form.

**Acceptance Criteria:**
- [ ] ImageGrid component (2×2 grid with selectable images)
- [ ] IconCard component (icon + label, selectable)
- [ ] Slider component (horizontal, labeled endpoints)
- [ ] MultiSelect chip component (tap to toggle, multi-selection)
- [ ] Selected state: scale up 1.05x, accent border, checkmark
- [ ] Gender-themed styling applied
- [ ] 48px min touch targets

**Story Points:** 3

---

**S3.5 — Progress Bar & Conversational Tone**
> As a user, I want to see progress and feel encouraged to finish.

**Acceptance Criteria:**
- [ ] Progress bar at top showing % complete
- [ ] "Quase lá!" message at 80%+
- [ ] Estimated time remaining: "~30 segundos"
- [ ] Smooth progress animation

**Story Points:** 1

---

**S3.6 — Questionnaire Completion & Data Submission**
> As a developer, I want questionnaire data packaged and submitted with the photo for AI processing.

**Acceptance Criteria:**
- [ ] All responses collected into structured JSON
- [ ] Combined with photo URL and gender selection
- [ ] POST to /api/consultation/start
- [ ] Loading state transition to Processing screen
- [ ] Error handling: retry on network failure

**Story Points:** 2

---

## E4: AI Pipeline (Analysis + Consultation)

### Elicitation Applied

**ADRs:** Sequential pipeline (analysis → recommendations). On-demand preview separate. **Chaos Monkey:** Provider outage → dual provider fallback. Bias across ethnicities → diverse test set. **First Principles:** Minimum = photo + AI API + structured result. **Red Team:** "No prompt versioning = no rollback." **Stakeholder Round Table:** "Prompts are code — version them."

---

**S4.1 — AI Provider Abstraction Layer**
> As a developer, I want a provider-agnostic AI interface so I can swap providers without changing application code.

**Acceptance Criteria:**
- [ ] AIProvider interface with analyzeFace(), generateConsultation() methods
- [ ] GeminiProvider implementation (primary)
- [ ] OpenAIProvider implementation (fallback)
- [ ] AIRouter with automatic fallback on primary failure
- [ ] Retry logic: 1 retry on transient errors before falling back
- [ ] All AI calls logged: model, tokens, cost, latency, success/failure

**Story Points:** 5

---

**S4.2 — Prompt Management System**
> As a developer, I want versioned, structured prompts so they can be tested and rolled back.

**Acceptance Criteria:**
- [ ] Prompts stored in lib/ai/prompts/v1/
- [ ] face-analysis.ts — structured output prompt
- [ ] consultation-male.ts — male recommendation prompt
- [ ] consultation-female.ts — female recommendation prompt
- [ ] Zod schemas for all AI outputs (FaceAnalysisSchema, ConsultationSchema)
- [ ] Version routing: can run v1 and v2 simultaneously for A/B testing
- [ ] Prompts include "styles to avoid" section

**Story Points:** 5

---

**S4.3 — Face Analysis (Step 1)**
> As a user, I want my face analyzed so I learn my face shape and proportions.

**Acceptance Criteria:**
- [ ] Send compressed photo to Gemini Vision API
- [ ] Receive structured JSON: face_shape (enum of 7 types), confidence (0-1), proportions (forehead/cheekbone/jaw ratios), hair_assessment
- [ ] Validate response against Zod schema
- [ ] If validation fails → retry with adjusted temperature
- [ ] If still fails → return error (don't show wrong results)
- [ ] Store result in consultations.face_analysis (jsonb)
- [ ] Latency target: ≤10 seconds
- [ ] This step runs for FREE (pre-paywall)

**Story Points:** 5

---

**S4.4 — Instant Face Shape Reveal**
> As a user, I want to see my face shape result within 10 seconds so I get immediate value.

**Acceptance Criteria:**
- [ ] Face shape result displayed as soon as Step 1 completes
- [ ] Large badge: "Rosto Oval" (or detected shape)
- [ ] Confidence score: "93% de certeza"
- [ ] Brief explanation (2-3 sentences)
- [ ] This is the FREE result — visible without payment
- [ ] Animated reveal (slide up + fade in)
- [ ] Face shape overlay on user's photo

**Story Points:** 3

---

**S4.5 — Consultation Generation (Step 2)**
> As a paid user, I want personalized hairstyle recommendations based on my face shape and lifestyle.

**Acceptance Criteria:**
- [ ] Input: face analysis JSON + questionnaire responses + gender
- [ ] Output: 2-3 recommendations with: style_name, justification, match_score, difficulty_level
- [ ] Output: 2-3 styles_to_avoid with: style_name, reason
- [ ] Output: grooming_tips categorized (products, routine, barber_tips)
- [ ] Gender-specific prompts (male vs female)
- [ ] Validate output against ConsultationSchema
- [ ] Store in normalized tables (recommendations, styles_to_avoid, grooming_tips)
- [ ] Only triggered AFTER payment confirmed
- [ ] Latency target: ≤15 seconds

**Story Points:** 8

---

**S4.6 — AI Output Validation & Quality Gate**
> As a developer, I want all AI outputs validated so users never see garbage data.

**Acceptance Criteria:**
- [ ] Zod schema validation on every AI response
- [ ] Confidence threshold: if face_shape confidence < 0.6, flag for review
- [ ] Recommendation match_score sanity check (sum should vary, not all equal)
- [ ] Text length limits on justifications (50-200 words)
- [ ] Reject and retry on schema validation failure
- [ ] Log all validation failures for quality monitoring

**Story Points:** 3

---

**S4.7 — AI Cost Tracking**
> As a business owner, I want per-consultation cost tracking so I monitor unit economics.

**Acceptance Criteria:**
- [ ] Every AI call logs: provider, model, input_tokens, output_tokens, cost_cents, latency_ms
- [ ] Aggregate cost stored in consultations.ai_cost_cents
- [ ] Dashboard query: average cost per consultation, per step
- [ ] Alert if average exceeds €0.25 (updated threshold with Nano Banana 2)

**Story Points:** 2

---

**S4.8 — Deterministic Results (Same Input = Same Output)**
> As a user, I want consistent results so I trust the AI isn't random.

**Acceptance Criteria:**
- [ ] Generate photo hash on upload
- [ ] Cache consultation result by photo_hash + questionnaire_hash + gender
- [ ] Same inputs → return cached results (no re-generation)
- [ ] Cache invalidation only on prompt version update
- [ ] Improves both consistency AND cost (skip AI calls for identical inputs)

**Story Points:** 3

---

## E5: Payment Integration

### Elicitation Applied

**First Principles:** Paywall between free face shape and full results = maximum motivation. **Pre-mortem:** "Users felt tricked after 3 minutes." → Free face shape IS real value, not a teaser. **Red Team:** "Screenshot blurred results, zoom in." → Server-side gating, not CSS blur. **JTBD:** User hires paywall to "confirm this is worth my money." **Chaos Monkey:** Stripe down → queue consultation, process when recovered.

---

**S5.1 — Stripe Setup & Configuration**
> As a developer, I want Stripe configured for EUR payments with Apple Pay and Google Pay.

**Acceptance Criteria:**
- [ ] Stripe account configured for EUR
- [ ] API keys in environment variables (server-side only)
- [ ] Stripe.js lazy-loaded on paywall screen
- [ ] Apple Pay / Google Pay enabled via Payment Request API
- [ ] Test mode for development, live for production

**Story Points:** 3

---

**S5.2 — Payment Intent Creation**
> As a developer, I want to create payment intents with correct pricing based on user history.

**Acceptance Criteria:**
- [ ] POST /api/payment/create-intent
- [ ] First consultation: €5.99 (599 cents)
- [ ] Returning user (has previous paid consultation): €2.99 (299 cents)
- [ ] Guest always pays €5.99 (can't verify history without account)
- [ ] Nudge for guests: "Crie conta para pagar €2.99 nas próximas"
- [ ] Returns Stripe client_secret for frontend

**Story Points:** 3

---

**S5.3 — Paywall UI**
> As a user, I want a clear paywall that shows what I've gotten for free and what I'll unlock.

**Acceptance Criteria:**
- [ ] Face shape result visible (unblurred) at top — already earned
- [ ] Blurred recommendation cards below (server-rendered placeholder images, NOT CSS blur)
- [ ] Pricing: "€5.99 — Consultoria completa" (or €2.99 for returning)
- [ ] Feature list: "Inclui: 2-3 cortes • Visualização IA • Cartão barbeiro • Dicas"
- [ ] Trust badge: "Reembolso automático se a IA falhar"
- [ ] Apple Pay / Google Pay button (primary, largest)
- [ ] Credit card option (secondary)
- [ ] No account required to pay

**Story Points:** 5

---

**S5.4 — Payment Processing & Unlock**
> As a user, I want my consultation unlocked immediately after payment.

**Acceptance Criteria:**
- [ ] Stripe Payment Element handles card input
- [ ] On payment success: paywall dissolves (blur → clear, 500ms animation)
- [ ] Results reveal with staggered animation
- [ ] Consultation generation triggered server-side on webhook confirmation
- [ ] Payment failure: inline error "Pagamento não processado. Tente outro método."
- [ ] User's photo/questionnaire data NEVER lost on payment failure

**Story Points:** 5

---

**S5.5 — Stripe Webhook Handler**
> As a developer, I want payment confirmation via webhook so the server-side consultation generation is triggered securely.

**Acceptance Criteria:**
- [ ] POST /api/webhook/stripe
- [ ] Verify webhook signature (Stripe signing secret)
- [ ] Handle payment_intent.succeeded → trigger consultation generation (Step 2)
- [ ] Handle payment_intent.payment_failed → update consultation.payment_status
- [ ] Idempotent: processing the same webhook twice has no side effects
- [ ] Auto-refund: if AI fails to generate consultation within 5 minutes, trigger Stripe refund

**Story Points:** 3

---

**S5.6 — Receipt & Refund Flow**
> As a user, I want a receipt and automatic refund if the AI fails.

**Acceptance Criteria:**
- [ ] Stripe sends email receipt automatically
- [ ] If consultation generation fails completely (after retries) → auto-refund via Stripe API
- [ ] User sees: "Ocorreu um erro. O seu pagamento foi reembolsado."
- [ ] Refund logged in consultation record

**Story Points:** 2

---

## E6: Results Page

### Elicitation Applied

**First Principles:** 3-tier hierarchy: validation (face shape) → action (recommendation) → confidence (preview). **Red Team:** "Results page is a wall of text." → Design for scanning. **Kano Model:** Styles to avoid = Delighter. Confidence scores = Delighter. **SCAMPER:** Spotify Wrapped reveal animation. Barber reference card. **Stakeholder Round Table (Barber):** "I need photo, face shape, style name. Nothing else."

---

**S6.1 — Face Shape Analysis Section**
> As a user, I want to see my face shape analysis with a clear visual explanation.

**Acceptance Criteria:**
- [ ] Face shape badge (large, styled): "Rosto Oval"
- [ ] Confidence score below badge
- [ ] User's photo with face shape outline overlay
- [ ] Explanation: 2-3 sentences about the face shape characteristics
- [ ] Proportion analysis visual (forehead/cheekbone/jaw diagram)
- [ ] Staggered reveal animation (150ms per element)

**Story Points:** 3

---

**S6.2 — Hero Recommendation Card (#1)**
> As a user, I want to see the top recommendation prominently so my decision is easy.

**Acceptance Criteria:**
- [ ] #1 badge: "Recomendação Principal" (gold/accent)
- [ ] Style name in large typography
- [ ] Justification: 2-3 sentences (visagism reasoning)
- [ ] Match score: "93% compatível"
- [ ] Difficulty badge: "Manutenção: Baixa/Média/Alta"
- [ ] "Ver como fico" button (primary, large, prominent)
- [ ] Hero card visually dominant — largest card on page

**Story Points:** 3

---

**S6.3 — Alternative Recommendation Cards (#2, #3)**
> As a user, I want to see 2 alternative styles so I have options.

**Acceptance Criteria:**
- [ ] Cards #2 and #3 below hero, smaller visual weight
- [ ] Same structure: name, justification, match score, difficulty
- [ ] "Ver como fico" button (secondary style)
- [ ] Collapsible on mobile — show titles, expand for details
- [ ] Numbered: "2ª Recomendação", "3ª Recomendação"

**Story Points:** 3

---

**S6.4 — Styles to Avoid Section**
> As a user, I want to know which styles DON'T suit me so I avoid bad choices.

**Acceptance Criteria:**
- [ ] Section header: "Estilos a evitar" with ⚠️ icon
- [ ] 2-3 styles with brief explanation each
- [ ] Example: "Cortes muito rentes acentuam a largura de um rosto redondo"
- [ ] Card-based layout, distinct from recommendations (muted styling)
- [ ] Positioned after recommendations, before grooming tips

**Story Points:** 2

---

**S6.5 — Grooming Tips Section (Gender-Specific)**
> As a user, I want grooming recommendations specific to my gender and face shape.

**Acceptance Criteria:**
- [ ] Male: beard style recommendations
- [ ] Female: layering, fringe, parting recommendations
- [ ] Icon-based layout (Lucide icons)
- [ ] 3-4 tips in individual card format
- [ ] Categorized: "Produtos", "Rotina Diária", "Dicas para o Barbeiro/Cabeleireiro"

**Story Points:** 3

---

**S6.6 — Styling Tips (Parsed & Structured)**
> As a user, I want styling tips in a scannable format, not a wall of text.

**Acceptance Criteria:**
- [ ] AI text parsed into structured items
- [ ] Each tip as separate card with thematic icon
- [ ] Categories separated with sub-headers
- [ ] Grid layout on desktop, stack on mobile

**Story Points:** 2

---

**S6.7 — Results Actions Footer**
> As a user, I want to share, save, or start a new consultation from the results page.

**Acceptance Criteria:**
- [ ] "Partilhar resultado" button → triggers share card generation
- [ ] "Guardar" button → save to profile (prompts auth if guest)
- [ ] "Nova consultoria" → reset flow, new consultation at €2.99
- [ ] "Voltar ao início" → landing page
- [ ] Sticky footer on mobile

**Story Points:** 2

---

**S6.8 — Results Page Animated Reveal**
> As a user, I want results revealed one by one so the experience feels premium.

**Acceptance Criteria:**
- [ ] Staggered reveal: face shape → hero recommendation → alternatives → tips
- [ ] 150ms delay between each section
- [ ] Slide-up + fade-in animation per section (Framer Motion)
- [ ] Respects prefers-reduced-motion (skip animations)

**Story Points:** 2

---

## E7: AI Preview Generation (Nano Banana 2)

### Elicitation Applied

**ADR:** Nano Banana 2 via Kie.ai for cost/speed. Async webhook model. **Chaos Monkey:** Preview generates wrong person → face similarity check. API down → fallback to Gemini Pro direct. **Red Team:** Bad preview worse than no preview → quality gate. **User Focus Group:** "I want to share just the preview image." **JTBD:** Preview's highest utility = barber communication tool.

---

**S7.1 — Kie.ai Integration (Nano Banana 2)**
> As a developer, I want preview generation via Kie.ai's Nano Banana 2 API.

**Acceptance Criteria:**
- [ ] POST to https://api.kie.ai/api/v1/jobs/createTask
- [ ] Model: "nano-banana-2"
- [ ] Input: photo URL (from Supabase Storage) + style prompt
- [ ] Callback URL: /api/webhook/kie
- [ ] Aspect ratio: 3:4
- [ ] Resolution: 2K
- [ ] Store taskId in recommendation.preview_generation_params
- [ ] KIE_API_KEY in server-side env vars only

**Story Points:** 5

---

**S7.2 — Kie.ai Webhook Handler**
> As a developer, I want to receive completed preview images via webhook callback.

**Acceptance Criteria:**
- [ ] POST /api/webhook/kie
- [ ] Verify webhook signature
- [ ] On completion: download image from Kie.ai CDN
- [ ] Upload to Supabase Storage (preview-images bucket)
- [ ] Update recommendation.preview_url and preview_status = 'ready'
- [ ] On failure: update preview_status = 'failed'
- [ ] Idempotent: same callback processed safely

**Story Points:** 3

---

**S7.3 — Face Similarity Check (Quality Gate)**
> As a developer, I want to verify the preview looks like the user before displaying it.

**Acceptance Criteria:**
- [ ] Compare face embedding of original photo vs generated preview
- [ ] If similarity < 0.7 → preview_status = 'unavailable' (quality_gate)
- [ ] User sees: "Visualização indisponível para este estilo"
- [ ] Never show a preview that looks like a different person
- [ ] Log quality gate triggers for model quality monitoring

**Story Points:** 5

---

**S7.4 — Preview Loading UX**
> As a user, I want an engaging loading animation while my preview generates.

**Acceptance Criteria:**
- [ ] User's photo appears in the recommendation card
- [ ] Animated gradient sweep over hair area (top-down "curtain of light")
- [ ] Floating sparkle particles over hair zone
- [ ] Pulsing blur effect
- [ ] Text cycling: "A aplicar o estilo...", "A ajustar ao seu rosto...", "Quase pronto..."
- [ ] Other "Ver como fico" buttons disabled during generation (sequential queue)

**Story Points:** 3

---

**S7.5 — Preview Display & Before/After**
> As a user, I want to compare my original photo with the AI preview.

**Acceptance Criteria:**
- [ ] Smooth crossfade from loading to generated preview
- [ ] Before/after slider (drag left/right) on desktop/tablet
- [ ] Toggle buttons "Original" / "Novo Estilo" on small mobile (<375px)
- [ ] Expectation text: "Visualização artística — resultado depende do seu cabelo e cabeleireiro"
- [ ] Watermark: "mynewstyle.com" subtle bottom corner

**Story Points:** 3

---

**S7.6 — Preview Fallback (Gemini Pro Direct)**
> As a developer, I want a fallback if Kie.ai is unavailable.

**Acceptance Criteria:**
- [ ] If Kie.ai returns error or times out (>90s) → fall back to Gemini 3 Pro Image (direct)
- [ ] Same prompt, different provider
- [ ] User doesn't see the switch — same UX
- [ ] Log fallback usage for monitoring

**Story Points:** 3

---

**S7.7 — Barber Reference Card**
> As a user, I want a clean card I can show my barber.

**Acceptance Criteria:**
- [ ] "Mostrar ao barbeiro" button on results page
- [ ] Generates single image containing: user's photo (small), face shape badge, top recommended style, AI preview (if generated), 2-3 key style notes
- [ ] Clean, professional layout — no branding clutter
- [ ] High contrast for barbershop lighting
- [ ] Downloadable as PNG
- [ ] Fits phone screen

**Story Points:** 3

---

## E8: Auth & User Profile

### Elicitation Applied

**Stakeholder Round Table:** "Let me try without signup." → Guest flow first. **Red Team:** Registration-first kills 30-50% conversion. **First Principles:** Auth exists to persist data across sessions, not to gatekeep. **SCAMPER:** Eliminate: guest consultation with claim-on-register. **Pre-mortem:** "50K registered, 8K consulted" → measure completed consultations.

---

**S8.1 — Supabase Auth Setup**
> As a developer, I want auth configured with email/password and Google OAuth.

**Acceptance Criteria:**
- [ ] Supabase Auth with email/password
- [ ] Google OAuth provider configured
- [ ] JWT sessions (24h expiry, auto-refresh)
- [ ] Auth state managed via Supabase client

**Story Points:** 3

---

**S8.2 — Registration Page**
> As a user, I want to create an account to save my consultations.

**Acceptance Criteria:**
- [ ] Name, email, password fields
- [ ] Google OAuth button (primary)
- [ ] LGPD consent checkbox: "Consinto o processamento dos meus dados"
- [ ] Link to privacy policy
- [ ] Gender-themed design (if gender already selected)

**Story Points:** 2

---

**S8.3 — Login Page**
> As a returning user, I want to log in to access my history.

**Acceptance Criteria:**
- [ ] Email/password + Google OAuth
- [ ] "Esqueci a senha" link
- [ ] Redirect to profile or pending consultation

**Story Points:** 2

---

**S8.4 — Guest Session Management**
> As a guest, I want to complete a consultation without creating an account.

**Acceptance Criteria:**
- [ ] UUID guest_session_id generated on first visit, stored in localStorage
- [ ] Guest can pay and view results
- [ ] Results shown but marked: "Crie conta para guardar este resultado"
- [ ] Guest data retained 30 days

**Story Points:** 2

---

**S8.5 — Guest-to-Auth Migration**
> As a guest who just created an account, I want my previous consultation migrated.

**Acceptance Criteria:**
- [ ] POST /api/auth/claim-guest with guestSessionId
- [ ] Migrate consultations from guest_session_id to user_id
- [ ] Migrate photos in storage (update paths)
- [ ] Clear localStorage guest_session_id
- [ ] Seamless — user sees their consultation in profile immediately

**Story Points:** 3

---

**S8.6 — User Profile & History**
> As a user, I want to see my past consultations and favorites.

**Acceptance Criteria:**
- [ ] Tab-based: "Consultorias" | "Favoritos"
- [ ] History: cards with date, face shape badge, top recommendation thumbnail
- [ ] "Ver novamente" button per consultation
- [ ] Favorites: grid of saved recommendations
- [ ] Empty states with illustrations + CTA

**Story Points:** 3

---

## E9: Sharing & Virality

### Elicitation Applied

**JTBD:** Share for: (1) show friends, (2) show barber, (3) flex cool tool. **SCAMPER:** Adapt Instagram Stories format. **Competitive Teardown:** PhotoRoom's growth = share rate. Spotify Wrapped = shareability IS marketing. **Pre-mortem:** "Users screenshotted but screenshots looked ugly." → Generate DESIGNED images. **Constraint Mapping:** Social platforms compress images, WhatsApp strips metadata.

---

**S9.1 — Share Card Generator (Story Format)**
> As a user, I want a branded vertical card for Instagram/WhatsApp stories.

**Acceptance Criteria:**
- [ ] 9:16 aspect ratio (1080×1920px)
- [ ] Before/after split with user's photo + preview
- [ ] Branding: "Descubra o seu estilo em mynewstyle.com"
- [ ] Face shape badge visible
- [ ] High-res PNG (survives social compression)
- [ ] Generated server-side (not a page screenshot)

**Story Points:** 5

---

**S9.2 — Share Card Generator (Square Format)**
> As a user, I want a square card for Instagram feed posts.

**Acceptance Criteria:**
- [ ] 1:1 aspect ratio (1080×1080px)
- [ ] Same content as story card, adapted layout
- [ ] Downloadable from results page

**Story Points:** 2

---

**S9.3 — Native Share Integration**
> As a user, I want to share via my device's native share sheet.

**Acceptance Criteria:**
- [ ] Web Share API (navigator.share) for mobile
- [ ] Fallback: download image + copy link for desktop
- [ ] Share includes: image + URL (mynewstyle.com)
- [ ] Track share events in analytics

**Story Points:** 2

---

**S9.4 — Standalone Preview Share**
> As a user, I want to share just the AI preview image.

**Acceptance Criteria:**
- [ ] Preview image downloadable individually
- [ ] Watermarked: "mynewstyle.com" (subtle)
- [ ] Long-press to save on mobile
- [ ] Share button on preview display

**Story Points:** 2

---

**S9.5 — Referral Link**
> As a user, I want a referral link so friends can try mynewstyle.

**Acceptance Criteria:**
- [ ] Each user gets unique referral code
- [ ] Link: mynewstyle.com/?ref=CODE
- [ ] Track referral source in analytics
- [ ] Future: referral rewards (not MVP, just tracking infrastructure)

**Story Points:** 2

---

## E10: Observability & Analytics

### Elicitation Applied

**Stakeholder Round Table (DevOps):** "Observability from day 1 — retrofitting never works." **Pre-mortem:** "AI cost crept up, nobody noticed for 2 months." → Cost alerts. **Chaos Monkey:** "AI processing time crept to 90s." → Latency monitoring. **Red Team:** "Preview quality gate fires 20% — no one investigates." → Quality dashboards. **Constraint Mapping:** Solo developer → managed observability, not custom.

---

**S10.1 — Analytics Event System**
> As a developer, I want structured analytics events for every user action.

**Acceptance Criteria:**
- [ ] Event types defined in TypeScript enum
- [ ] Client-side tracking: gender_selected, photo_captured, questionnaire_completed, paywall_shown, payment_completed, preview_requested, share_generated, results_rated
- [ ] Events stored in analytics_events table
- [ ] Device info captured (browser, OS, screen size)
- [ ] Session-based (session_id links events)

**Story Points:** 5

---

**S10.2 — AI Pipeline Monitoring Dashboard**
> As a business owner, I want to monitor AI cost, latency, and success rates.

**Acceptance Criteria:**
- [ ] SQL views/queries for: avg cost/consultation, avg latency/step, success rate, fallback rate
- [ ] Queryable via Supabase Dashboard
- [ ] Daily summary logged to memory (for cron reporting)

**Story Points:** 3

---

**S10.3 — Cost & Quality Alerts**
> As a developer, I want automatic alerts when metrics degrade.

**Acceptance Criteria:**
- [ ] Alert: avg AI cost > €0.25/consultation
- [ ] Alert: error rate > 5% in 1 hour
- [ ] Alert: preview quality gate > 20% "unavailable" in 1 day
- [ ] Alert: p95 latency > 45s for analysis
- [ ] Alerts via Supabase webhook or cron check

**Story Points:** 3

---

**S10.4 — Funnel Analytics**
> As a business owner, I want to track the conversion funnel.

**Acceptance Criteria:**
- [ ] Funnel: landing → gender → photo → questionnaire → face shape → paywall → payment → results → preview → share
- [ ] Drop-off rate per step
- [ ] Segmented by gender, device type
- [ ] Weekly summary query

**Story Points:** 3

---

**S10.5 — Post-Consultation Rating**
> As a product owner, I want user satisfaction scores per consultation.

**Acceptance Criteria:**
- [ ] After viewing results, prompt: "Como avalia esta consultoria?" (1-5 stars)
- [ ] Optional: decomposed rating (face shape accuracy, recommendation quality, preview realism)
- [ ] Stored in consultation record
- [ ] Non-blocking — user can skip

**Story Points:** 2

---

## E11: LGPD Compliance (Parallel Track)

### Elicitation Applied

**Red Team:** "Facial photos = biometric data. LGPD fine = €200K." **Constraint Mapping:** LGPD mandatory in Portugal (EU jurisdiction). **Stakeholder Round Table (Privacy Officer):** "72-hour breach notification. DPO at 10K+ users." **Pre-mortem:** "RLS misconfiguration leaked 50K photos." → CI/CD RLS audit. **JTBD (Risk Lens):** "Don't expose my face to strangers."

---

**S11.1 — Privacy Policy (LGPD Compliant)**
> As a user, I want a clear privacy policy explaining how my data is handled.

**Acceptance Criteria:**
- [ ] Portuguese language
- [ ] Covers: data collected, purpose, retention, rights, third-party sharing (AI providers)
- [ ] Specifically mentions facial photo = biometric processing
- [ ] Contact for data requests
- [ ] Accessible from landing page footer and registration

**Story Points:** 3

---

**S11.2 — Consent Flow**
> As a user, I want explicit consent before my photo is processed.

**Acceptance Criteria:**
- [ ] Photo upload screen: consent checkbox "Consinto o processamento da minha foto para análise de visagismo"
- [ ] Registration: consent checkbox for data processing
- [ ] Consent timestamp stored in database
- [ ] Cannot proceed without consent

**Story Points:** 2

---

**S11.3 — Right to Deletion**
> As a user, I want to delete all my data.

**Acceptance Criteria:**
- [ ] Profile settings: "Eliminar a minha conta e todos os dados"
- [ ] Confirmation dialog
- [ ] Cascading delete: profile → consultations → recommendations → photos → previews → analytics
- [ ] Supabase Storage objects deleted
- [ ] Completion confirmation email
- [ ] Irreversible — clear warning

**Story Points:** 3

---

**S11.4 — Data Export (Right to Access)**
> As a user, I want to export all my data.

**Acceptance Criteria:**
- [ ] GET /api/profile/export
- [ ] JSON file with: profile, all consultations, recommendations, photos (as URLs)
- [ ] Downloadable from profile settings

**Story Points:** 2

---

**S11.5 — RLS Audit in CI/CD**
> As a developer, I want automated RLS checks so no table is accidentally exposed.

**Acceptance Criteria:**
- [ ] CI check: every public table has RLS enabled
- [ ] CI check: REVOKE ALL applied before GRANT
- [ ] Fail deployment if any table lacks RLS policies
- [ ] Based on SOSLeiria lesson: Supabase defaults are dangerous

**Story Points:** 3

---

## E12: Future Add-ons (Post-MVP)

### Elicitation Applied

**Kano Model:** Paleta de cores = high-value Delighter. **JTBD:** "What colors suit me?" is the natural next question after "what cut suits me?" **SCAMPER:** Combine consultation + color = "Estilo Completo" bundle. **Constraint Mapping:** Same AI pipeline, different prompt = marginal cost near zero. **Pre-mortem:** "Add-ons cannibalized core product attention."

---

**S12.1 — Paleta de Cores (Color Analysis)**
> As a user, I want to know which hair and clothing colors suit my skin tone.

**Acceptance Criteria:**
- [ ] Uses existing photo (no new upload)
- [ ] AI analyzes: skin tone, undertone (warm/cool/neutral), eye color
- [ ] Output: recommended hair colors, clothing color palette, colors to avoid
- [ ] Visual color swatches
- [ ] Price: €3.99 (one-tap upsell from results page)

**Story Points:** 5

---

**S12.2 — Estilo Completo Bundle**
> As a user, I want a full image consulting package.

**Acceptance Criteria:**
- [ ] Combines: hair consultation + color analysis + glasses shape + clothing style
- [ ] Price: €9.99
- [ ] Comprehensive results page
- [ ] Premium positioning

**Story Points:** 8

---

**S12.3 — Re-consultation Express Flow**
> As a returning user, I want a faster consultation with just a new photo.

**Acceptance Criteria:**
- [ ] Skip questionnaire (use previous responses)
- [ ] Option to update individual answers
- [ ] Price: €2.99
- [ ] Compare with previous consultation results

**Story Points:** 3

---

**S12.4 — Style Evolution Tracking**
> As a user, I want to see how my style has changed over time.

**Acceptance Criteria:**
- [ ] Timeline view of all consultations
- [ ] Side-by-side comparison
- [ ] Price: €2.99
- [ ] Requires 2+ consultations

**Story Points:** 3

---

# Sprint Plan (Suggested)

| Sprint | Duration | Epics | Key Deliverable |
|--------|----------|-------|-----------------|
| Sprint 1 | 2 weeks | E1 (Landing + Design System) | Live landing page on mynewstyle.com |
| Sprint 2 | 2 weeks | E2 (Photo) + E3 (Questionnaire) | Complete intake flow |
| Sprint 3 | 2 weeks | E4 (AI Pipeline) + E5 (Payment) + E11 (LGPD) | Free face shape + paid consultation |
| Sprint 4 | 2 weeks | E6 (Results) + E7 (Preview Gen) | Full results with AI previews |
| Sprint 5 | 2 weeks | E8 (Auth) + E9 (Sharing) + E10 (Analytics) | User accounts + virality |
| **MVP Launch** | **~10 weeks** | | **Full product live** |
| Post-MVP | Ongoing | E12 (Add-ons) | Paleta de cores, bundles |

---

# Elicitation Summary

## Methods Applied per Epic

| Epic | Methods | Count |
|------|---------|-------|
| E1 Landing | SCAMPER, Focus Group, Competitive Teardown, Pre-mortem, First Principles | 5 |
| E2 Photo | Chaos Monkey, Stakeholder RT, Red Team, JTBD, Kano | 5 |
| E3 Questionnaire | SCAMPER, Pre-mortem, Focus Group, Constraints, Competitive Teardown | 5 |
| E4 AI Pipeline | ADRs, Chaos Monkey, First Principles, Red Team, Stakeholder RT | 5 |
| E5 Payment | First Principles, Pre-mortem, Red Team, JTBD, Chaos Monkey | 5 |
| E6 Results | First Principles, Red Team, Kano, SCAMPER, Stakeholder RT | 5 |
| E7 Preview | ADR, Chaos Monkey, Red Team, Focus Group, JTBD | 5 |
| E8 Auth | Stakeholder RT, Red Team, First Principles, SCAMPER, Pre-mortem | 5 |
| E9 Sharing | JTBD, SCAMPER, Competitive Teardown, Pre-mortem, Constraints | 5 |
| E10 Analytics | Stakeholder RT, Pre-mortem, Chaos Monkey, Red Team, Constraints | 5 |
| E11 LGPD | Red Team, Constraints, Stakeholder RT, Pre-mortem, JTBD | 5 |
| E12 Future | Kano, JTBD, SCAMPER, Constraints, Pre-mortem | 5 |
| **Total** | | **60** |

## Top Story Insights from Elicitation

1. **S4.4 (Instant face shape reveal)** — most valuable UX story, hooks users in 10s
2. **S5.3 (Paywall UI)** — server-side gating, not CSS blur (Red Team caught this)
3. **S7.3 (Face similarity check)** — prevents "wrong person" previews (Chaos Monkey)
4. **S11.5 (RLS audit in CI/CD)** — SOSLeiria lesson applied proactively
5. **S4.8 (Deterministic results)** — same input = same output builds trust
