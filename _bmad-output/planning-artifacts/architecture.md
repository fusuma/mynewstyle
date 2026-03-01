---
status: complete
elicitationMethods: 45
date: 2026-03-01
author: Fusuma
---

# Technical Architecture — mynewstyle

**AI-Powered Visagism Platform**

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js SPA)                  │
│  Landing │ Gender │ Photo │ Questionnaire │ Results      │
│  Camera API │ Image Compression │ Stripe.js │ PWA        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│               NEXT.js API ROUTES (Vercel)                │
│  /api/consultation │ /api/preview │ /api/payment         │
│  /api/auth │ /api/share │ /api/webhook                   │
└──────┬───────────┬──────────┬───────────┬───────────────┘
       │           │          │           │
┌──────▼──┐  ┌─────▼────┐ ┌──▼─────┐ ┌───▼──────┐
│ Supabase │  │ AI Layer │ │ Stripe │ │ Storage  │
│ Auth+DB  │  │ (Gemini  │ │  API   │ │ Supabase │
│ RLS+JWT  │  │  +OpenAI │ │        │ │ Storage  │
│          │  │  fallback)│ │        │ │ + CDN    │
└──────────┘  └──────────┘ └────────┘ └──────────┘
```

---

## 2. Tech Stack

### 2.1 Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14+ (App Router) | SSR landing for SEO, SPA for consultation flow |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI dev, consistent design system, dual theme support |
| State | React Context + Zustand | Lightweight, no over-engineering for MVP |
| Camera | MediaDevices API (getUserMedia) | Native browser camera, no dependencies |
| Image Processing | Canvas API (resize/compress) | Client-side compression to ≤800px, <500KB |
| Payments | Stripe.js + Elements | PCI compliant, Apple Pay/Google Pay built-in |
| Animation | Framer Motion | Results reveal, loading animations, page transitions |
| Hosting | Vercel | Zero-config Next.js deployment, edge functions, preview deploys |

### 2.2 Backend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API | Next.js API Routes (Vercel Serverless) | Co-located with frontend, auto-scaling |
| Database | Supabase (PostgreSQL) | Auth, RLS, real-time, managed |
| Auth | Supabase Auth | Email/password + Google OAuth, JWT sessions |
| Storage | Supabase Storage | Photo uploads, generated previews, user-scoped buckets |
| Payments | Stripe | One-time payments, webhooks, Apple/Google Pay |
| AI Pipeline | Custom abstraction layer | Provider-agnostic, supports fallback routing |

### 2.3 AI Layer

| Task | Primary | Fallback | Input | Output |
|------|---------|----------|-------|--------|
| Facial Analysis | Gemini 2.5 Flash (Vision) | GPT-4o | Photo (base64) | Face shape, proportions, hair assessment (JSON) |
| Consultation Gen | Gemini 2.5 Flash | GPT-4o | Analysis JSON + questionnaire | 2-3 recommendations + justifications + tips (JSON) |
| Preview Generation | Gemini 3 Pro Image | FLUX 1.1 Pro (via Replicate) | Photo + style description | User with recommended style applied (image) |

### 2.4 Infrastructure

| Service | Provider | Cost Estimate |
|---------|----------|--------------|
| Hosting + Serverless | Vercel Pro | €20/month |
| Database + Auth + Storage | Supabase Pro | €25/month |
| AI (Gemini) | Google AI | ~€0.50/consultation |
| AI Fallback (OpenAI) | OpenAI | ~€0.80/consultation (only on fallback) |
| Payments | Stripe | 1.4% + €0.25 per transaction (EU) |
| Domain | mynewstyle.com | ~€15/year |
| **Total fixed** | | **~€50/month** |
| **Total at 1K consultations/month** | | **~€550/month** |

---

## 3. Data Model

### 3.1 Entity Relationship

```
users (Supabase Auth)
  │
  ├── profiles
  │   ├── id (FK → auth.users)
  │   ├── display_name
  │   ├── gender_preference (male/female/null)
  │   ├── created_at
  │   └── updated_at
  │
  ├── consultations
  │   ├── id (uuid, PK)
  │   ├── user_id (FK → profiles, nullable for guests)
  │   ├── guest_session_id (uuid, for unpaid/guest tracking)
  │   ├── gender (male/female)
  │   ├── photo_url (Supabase Storage path)
  │   ├── photo_quality_score (float)
  │   ├── questionnaire_responses (jsonb)
  │   ├── face_analysis (jsonb)
  │   │   ├── face_shape (enum)
  │   │   ├── confidence (float)
  │   │   ├── proportions (object)
  │   │   └── hair_assessment (object)
  │   ├── status (pending/analyzing/complete/failed)
  │   ├── payment_status (free/pending/paid/refunded)
  │   ├── payment_intent_id (Stripe)
  │   ├── ai_model_versions (jsonb)
  │   ├── ai_cost_cents (integer)
  │   ├── created_at
  │   └── completed_at
  │
  ├── recommendations
  │   ├── id (uuid, PK)
  │   ├── consultation_id (FK)
  │   ├── rank (1, 2, 3)
  │   ├── style_name
  │   ├── justification (text)
  │   ├── match_score (float, 0-1)
  │   ├── difficulty_level (low/medium/high)
  │   ├── preview_url (nullable, Supabase Storage)
  │   ├── preview_status (none/generating/ready/failed/unavailable)
  │   ├── preview_generation_params (jsonb)
  │   └── created_at
  │
  ├── styles_to_avoid
  │   ├── id (uuid, PK)
  │   ├── consultation_id (FK)
  │   ├── style_name
  │   └── reason (text)
  │
  ├── grooming_tips
  │   ├── id (uuid, PK)
  │   ├── consultation_id (FK)
  │   ├── category (products/routine/barber_tips)
  │   ├── tip_text
  │   └── icon (text)
  │
  └── favorites
      ├── id (uuid, PK)
      ├── user_id (FK)
      ├── recommendation_id (FK)
      └── created_at

analytics_events
  ├── id (uuid, PK)
  ├── session_id (uuid)
  ├── user_id (nullable)
  ├── event_type (enum)
  ├── event_data (jsonb)
  ├── created_at
  └── device_info (jsonb)
```

### 3.2 Row-Level Security (RLS)

```sql
-- Users can only access their own data
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Consultations: user-scoped + guest sessions
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own consultations" ON consultations
  FOR SELECT USING (user_id = auth.uid() OR guest_session_id = current_setting('app.guest_session_id', true)::uuid);

-- Recommendations cascade from consultation access
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own recommendations" ON recommendations
  FOR SELECT USING (consultation_id IN (SELECT id FROM consultations WHERE user_id = auth.uid()));

-- REVOKE default grants (learned from SOSLeiria)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- Then GRANT only what's needed per table
```

### 3.3 Storage Buckets

| Bucket | Access | Lifecycle |
|--------|--------|-----------|
| `consultation-photos` | User-scoped (signed URLs, 15-min expiry) | Delete after 90 days inactive |
| `preview-images` | User-scoped | Delete after 90 days inactive |
| `share-cards` | Public (read-only, generated on share) | Delete after 30 days |

---

## 4. AI Pipeline Architecture

### 4.1 Pipeline Flow

```
┌─────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Photo  │────▶│ Step 1:      │────▶│ Step 2:       │────▶│ Step 3:      │
│ Upload  │     │ Face Analysis│     │ Recommendations│     │ Preview Gen  │
│         │     │ (5-10s)      │     │ (10-15s)       │     │ (30-60s)     │
└─────────┘     └──────────────┘     └───────────────┘     └──────────────┘
                 Gemini Vision        Gemini Text            Gemini Image
                 ↓ fallback           ↓ fallback             ↓ fallback
                 GPT-4o               GPT-4o                 FLUX/Replicate
                 
                 Returns:             Returns:               Returns:
                 - face_shape         - 2-3 styles           - user with
                 - proportions        - justifications          new style
                 - confidence         - match_scores         - preserving
                 - hair_type          - grooming tips           face/skin
                                      - styles_to_avoid
```

**Key design decisions:**
- Steps 1+2 run sequentially (Step 2 needs Step 1 output)
- Step 3 is **on-demand** — only when user taps "Ver como fico"
- Step 1 result shown immediately (instant face shape reveal)
- Steps 1+2 behind paywall (€5.99/€2.99), face shape only for free

### 4.2 Provider Abstraction Layer

```typescript
// lib/ai/provider.ts
interface AIProvider {
  analyzeface(photo: Buffer, options?: AnalysisOptions): Promise<FaceAnalysis>;
  generateConsultation(analysis: FaceAnalysis, questionnaire: QuestionnaireData): Promise<Consultation>;
  generatePreview(photo: Buffer, style: StyleRecommendation): Promise<Buffer>;
}

class GeminiProvider implements AIProvider { /* primary */ }
class OpenAIProvider implements AIProvider { /* fallback */ }

class AIRouter {
  private primary: AIProvider;
  private fallback: AIProvider;
  
  async execute<T>(task: (provider: AIProvider) => Promise<T>): Promise<T> {
    try {
      return await task(this.primary);
    } catch (error) {
      if (isRetryable(error)) {
        return await task(this.fallback);
      }
      throw error;
    }
  }
}
```

### 4.3 Prompt Management

```
lib/ai/prompts/
├── v1/
│   ├── face-analysis.ts      # Structured output prompt for face detection
│   ├── consultation-male.ts   # Male recommendation prompt
│   ├── consultation-female.ts # Female recommendation prompt
│   ├── preview-male.ts        # Male preview image generation prompt
│   └── preview-female.ts      # Female preview image generation prompt
├── schemas/
│   ├── face-analysis.schema.ts    # Zod schema for structured AI output
│   ├── consultation.schema.ts
│   └── preview-params.schema.ts
└── index.ts                   # Version routing
```

- Prompts are **versioned** (v1/, v2/) — never overwrite, always create new version
- **Structured output** via Zod schemas — AI returns validated JSON, not free text
- Gender-specific prompts for genuinely different male/female paths
- A/B testable: route % of traffic to different prompt versions

### 4.4 Output Validation

```typescript
// Every AI response goes through validation
const analysisResult = await aiRouter.analyzeFace(photo);
const validated = FaceAnalysisSchema.safeParse(analysisResult);

if (!validated.success) {
  // AI returned garbage → retry with different temperature
  // If still fails → return error, don't show wrong results
}

// Face similarity check for previews
const similarityScore = await compareFaceEmbeddings(originalPhoto, previewImage);
if (similarityScore < 0.7) {
  // Preview doesn't look like the user → don't show it
  return { status: 'unavailable', reason: 'quality_gate' };
}
```

### 4.5 Cost Tracking

Every AI call logs:
- Model used (provider + version)
- Token count (input/output)
- Cost in cents
- Latency (ms)
- Success/failure

Aggregated per consultation in `ai_cost_cents` column. Dashboard alert if average exceeds €0.60.

---

## 5. API Routes

### 5.1 Consultation Flow

```
POST /api/consultation/start
  Body: { gender, photo (base64), questionnaire }
  Returns: { consultationId, faceAnalysis (free part) }
  Auth: Optional (guest_session_id created if no auth)

POST /api/consultation/unlock
  Body: { consultationId, paymentIntentId }
  Returns: { status: 'processing' }
  Auth: Payment verified via Stripe webhook
  Triggers: Full consultation generation (async)

GET /api/consultation/:id
  Returns: Full consultation data (if paid) or face shape only (if free)
  Auth: User-scoped or guest_session_id

POST /api/preview/generate
  Body: { consultationId, recommendationId }
  Returns: { status: 'generating', estimatedSeconds: 45 }
  Auth: Must be paid consultation
  Triggers: Async preview generation

GET /api/preview/:recommendationId/status
  Returns: { status, previewUrl? }
  Auth: User-scoped
  Polling: Client polls every 5s until ready

POST /api/share/generate
  Body: { consultationId, format: 'story' | 'square' | 'barber_card' }
  Returns: { shareImageUrl }
  Auth: Must be paid consultation
```

### 5.2 Payment

```
POST /api/payment/create-intent
  Body: { consultationId, type: 'first' | 'repeat' }
  Returns: { clientSecret, amount }
  Logic: €5.99 if no previous paid consultations, €2.99 if returning

POST /api/webhook/stripe
  Handles: payment_intent.succeeded, payment_intent.payment_failed
  Logic: On success → trigger full consultation generation
```

### 5.3 Auth

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
GET  /api/auth/session
POST /api/auth/claim-guest
  Body: { guestSessionId }
  Logic: Migrate guest consultations to authenticated user
```

---

## 6. Frontend Architecture

### 6.1 Project Structure

```
src/
├── app/
│   ├── layout.tsx                 # Root layout, theme provider
│   ├── page.tsx                   # Landing page (SSR for SEO)
│   ├── start/page.tsx             # Gender gateway
│   ├── consultation/
│   │   ├── photo/page.tsx         # Photo capture/upload
│   │   ├── questionnaire/page.tsx # Lifestyle questionnaire
│   │   ├── processing/page.tsx    # AI processing + face shape reveal
│   │   └── results/[id]/page.tsx  # Results + paywall + previews
│   ├── profile/
│   │   ├── page.tsx               # Consultation history
│   │   └── favorites/page.tsx     # Saved styles
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── privacidade/page.tsx       # Privacy policy (LGPD)
│   └── termos/page.tsx            # Terms of service
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── landing/                   # Landing page sections
│   ├── consultation/
│   │   ├── GenderGateway.tsx
│   │   ├── PhotoCapture.tsx       # Camera + upload + validation
│   │   ├── PhotoCompressor.ts     # Canvas-based resize/compress
│   │   ├── QuestionCard.tsx       # Single question display
│   │   ├── QuestionnaireFlow.tsx   # Question sequencing + conditional logic
│   │   ├── ProcessingScreen.tsx   # Loading animations + face reveal
│   │   ├── Paywall.tsx            # Payment gate with blurred preview
│   │   ├── ResultsPage.tsx        # Full results display
│   │   ├── RecommendationCard.tsx # Individual recommendation
│   │   ├── PreviewGenerator.tsx   # "Ver como fico" with loading
│   │   ├── BeforeAfterSlider.tsx  # Comparison slider
│   │   ├── StylesToAvoid.tsx
│   │   ├── GroomingTips.tsx
│   │   └── BarberCard.tsx         # Shareable barber reference
│   ├── share/
│   │   ├── ShareButton.tsx
│   │   └── ShareCardGenerator.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── ThemeProvider.tsx       # Male/female theme switching
├── lib/
│   ├── ai/
│   │   ├── provider.ts            # AI provider abstraction
│   │   ├── gemini.ts
│   │   ├── openai.ts
│   │   ├── prompts/               # Versioned prompts
│   │   └── schemas/               # Zod output schemas
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client
│   │   └── types.ts               # Generated types
│   ├── stripe/
│   │   ├── client.ts
│   │   └── webhooks.ts
│   ├── photo/
│   │   ├── compress.ts            # Client-side compression
│   │   ├── validate.ts            # Face detection validation
│   │   └── exif.ts                # Orientation correction
│   └── utils/
│       ├── analytics.ts           # Event tracking
│       └── share.ts               # Share card generation
├── hooks/
│   ├── useConsultation.ts         # Consultation state management
│   ├── useCamera.ts               # Camera access + capture
│   ├── useTheme.ts                # Gender-based theme
│   └── usePayment.ts              # Stripe payment flow
├── stores/
│   └── consultation.ts            # Zustand store for consultation flow
└── types/
    └── index.ts                   # Shared TypeScript types
```

### 6.2 State Management

```typescript
// stores/consultation.ts (Zustand)
interface ConsultationStore {
  // Flow state
  gender: 'male' | 'female' | null;
  photo: Blob | null;
  photoPreview: string | null;
  questionnaire: QuestionnaireResponses | null;
  
  // Results
  consultationId: string | null;
  faceAnalysis: FaceAnalysis | null;  // Available after free analysis
  consultation: Consultation | null;   // Available after payment
  previews: Map<string, PreviewStatus>;
  
  // Payment
  paymentStatus: 'none' | 'pending' | 'paid' | 'failed';
  isReturningUser: boolean;
  
  // Actions
  setGender: (gender: 'male' | 'female') => void;
  setPhoto: (photo: Blob) => void;
  submitQuestionnaire: (responses: QuestionnaireResponses) => void;
  startAnalysis: () => Promise<void>;
  unlockConsultation: (paymentIntentId: string) => Promise<void>;
  generatePreview: (recommendationId: string) => Promise<void>;
  reset: () => void;
}
```

### 6.3 Session Persistence

- Zustand store persisted to `sessionStorage` (survives page refresh within tab)
- Guest consultation ID persisted to `localStorage` (survives tab close)
- Photo blob stored in IndexedDB (too large for sessionStorage)
- On app switch/return → rehydrate from persisted state → resume flow

---

## 7. Security Architecture

### 7.1 Authentication

- Supabase Auth with JWT (24h expiry, auto-refresh)
- Google OAuth 2.0 for social login
- Guest sessions: UUID generated client-side, stored in localStorage
- Guest → Auth migration: `POST /api/auth/claim-guest` transfers consultations

### 7.2 Data Protection (LGPD)

| Requirement | Implementation |
|------------|---------------|
| Explicit consent | Checkbox before photo upload: "Consinto o processamento da minha foto para análise de visagismo" |
| Purpose limitation | Photos used ONLY for visagism analysis, stated in privacy policy |
| Data minimization | Compress photos, delete originals after 90 days inactive |
| Right to deletion | `DELETE /api/profile/delete` — cascades to all data + storage objects |
| Right to access | `GET /api/profile/export` — JSON export of all user data |
| Breach notification | 72-hour plan documented, Supabase audit logs enabled |
| Biometric consent | Facial analysis = biometric processing, requires specific consent under LGPD |

### 7.3 API Security

| Protection | Implementation |
|-----------|---------------|
| Rate limiting | Vercel Edge Middleware: 3 consultations/hr unauthenticated, 10/day free, 30/day paid |
| Input validation | Zod schemas on all API inputs |
| Photo validation | Max 10MB, image/* MIME only, face detection required |
| API keys | Server-side only (AI keys, Stripe secret) — never in client bundle |
| CORS | Restricted to mynewstyle.com origins |
| CSP headers | Strict Content-Security-Policy in middleware.ts |
| Signed URLs | Supabase Storage signed URLs (15-min expiry) for photos |

### 7.4 Payment Security

- Stripe handles all card data (PCI DSS compliant)
- Server verifies payment via webhook before unlocking results
- Client never sees raw payment credentials
- Refund automation: if AI fails after payment, auto-refund via Stripe API

---

## 8. Performance Architecture

### 8.1 Loading Strategy

| Resource | Strategy |
|----------|----------|
| Landing page | SSR (Vercel Edge) — <2s TTFB |
| Consultation SPA | Client-side, code-split per route |
| Camera API | Lazy-loaded on photo page |
| Stripe.js | Lazy-loaded on paywall |
| Framer Motion | Tree-shaken, only used animations imported |
| Fonts | `next/font` with `display: swap` |

### 8.2 Image Optimization

| Stage | Optimization |
|-------|-------------|
| Upload | Client-side resize to ≤800px width, JPEG 85% quality, <500KB |
| Storage | Supabase Storage with CDN |
| Preview display | Next.js `<Image>` with responsive srcset |
| Share cards | Pre-rendered PNG at exact social platform dimensions |
| Thumbnails | Generated on-demand, cached |

### 8.3 AI Processing Performance

| Concern | Solution |
|---------|----------|
| Cold starts | Vercel serverless keeps warm with traffic; no issue at >10 req/hr |
| Long-running AI calls | Async pattern: start → poll → complete (not blocking HTTP request) |
| Preview queue | Sequential per user (one at a time), parallel across users |
| Timeout handling | 90s max per AI call, auto-retry once, then fail gracefully |
| Perceived performance | Instant face shape at 10s, incremental loading, phase animations |

### 8.4 Caching

| Data | Cache | TTL |
|------|-------|-----|
| Landing page | Vercel Edge Cache | 1 hour |
| Consultation results | Supabase (persistent) | Forever (user data) |
| AI previews | Supabase Storage | 90 days |
| Static assets | Vercel CDN | Immutable hashes |
| Face analysis (same photo) | DB lookup by photo hash | Forever |

---

## 9. Observability

### 9.1 Monitoring Stack

| Layer | Tool | What |
|-------|------|------|
| Application | Vercel Analytics | Web vitals, page load, errors |
| API | Vercel Logs + custom structured logging | Request/response, latency, errors |
| AI Pipeline | Custom dashboard (Supabase) | Cost/call, latency/call, success rate, model version |
| Database | Supabase Dashboard | Query performance, connection pool |
| Payments | Stripe Dashboard | Revenue, disputes, failure rates |
| Uptime | Vercel (built-in) or BetterStack | Endpoint health checks |

### 9.2 Analytics Events

```typescript
// Every user action emits a structured event
type AnalyticsEvent =
  | { type: 'gender_selected'; gender: string }
  | { type: 'photo_captured'; method: 'camera' | 'gallery'; sizeKb: number }
  | { type: 'photo_rejected'; reason: string }
  | { type: 'questionnaire_started' }
  | { type: 'questionnaire_completed'; durationMs: number }
  | { type: 'questionnaire_abandoned'; lastQuestion: number }
  | { type: 'face_analysis_completed'; faceShape: string; confidence: number }
  | { type: 'paywall_shown'; price: number; isReturning: boolean }
  | { type: 'payment_completed'; amount: number }
  | { type: 'payment_failed'; reason: string }
  | { type: 'consultation_completed'; durationMs: number }
  | { type: 'preview_requested'; recommendationRank: number }
  | { type: 'preview_completed'; durationMs: number; qualityGate: 'pass' | 'fail' }
  | { type: 'barber_card_generated' }
  | { type: 'share_generated'; format: string }
  | { type: 'results_rated'; rating: number };
```

### 9.3 Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| AI error rate spike | >5% failures in 1 hour | Notify + check provider status |
| AI cost spike | Average >€0.60/consultation | Notify + investigate |
| Payment failure rate | >10% in 1 hour | Notify + check Stripe |
| Preview quality gate | >20% "unavailable" in 1 day | Investigate prompt/model quality |
| Completion rate drop | <70% (7-day rolling) | Investigate funnel drop-off |

---

## 10. Deployment Architecture

### 10.1 Environments

| Environment | URL | Branch | Purpose |
|-------------|-----|--------|---------|
| Production | mynewstyle.com | main | Live users |
| Preview | *.vercel.app | PR branches | QA + review |
| Development | dev.mynewstyle.com | develop | Staging |

### 10.2 CI/CD

```
Push to branch → Vercel Preview Deploy (auto)
PR merged to develop → Deploy to dev.mynewstyle.com
PR merged to main → Deploy to mynewstyle.com
```

**Pre-deploy checks:**
- TypeScript compilation (zero errors)
- Lint (ESLint)
- Supabase migration dry-run
- RLS policy audit (automated check that all tables have RLS)
- AI prompt validation (schemas still match)

### 10.3 Database Migrations

- Supabase CLI (`supabase db diff`, `supabase db push`)
- Migrations versioned in `supabase/migrations/`
- Schema changes reviewed in PR
- Rollback plan for every migration

---

## 11. Scalability Plan

### 11.1 Phase 1: MVP (0-1K consultations/month)

- Single Vercel project, single Supabase project
- No caching layer needed
- AI calls direct to provider
- Total cost: ~€100/month

### 11.2 Phase 2: Growth (1K-10K consultations/month)

- Add Redis (Upstash) for rate limiting + session cache
- AI request queue (Inngest or Supabase Edge Functions with pg_cron)
- Photo CDN optimization
- Total cost: ~€500-1,500/month

### 11.3 Phase 3: Scale (10K-100K consultations/month)

- Multi-region Vercel deployment
- Supabase connection pooler (PgBouncer)
- AI provider load balancing (multi-provider routing)
- Background job system for preview generation
- Total cost: ~€5,000-15,000/month (offset by €30K-60K revenue)

---

## 12. Elicitation Applied to Architecture

### Section: Stack Selection

**ADR (Architecture Decision Records):**
- Next.js over Vite: SSR landing for SEO justifies the complexity
- Supabase over Firebase: PostgreSQL + RLS + Edge Functions. Learned from SOSLeiria.
- Vercel over self-hosted: zero DevOps for solo developer, prevents burnout
→ **Impact:** Every stack choice optimized for solo developer sustainability.

**Pre-mortem:** "Solo developer tried to maintain custom infra and burned out at month 6."
→ **Impact:** All managed services. Zero server maintenance. Supabase + Vercel = < 5 min/month DevOps.

**Constraint Mapping:** Solo developer, €100/month budget, needs to launch in 4-6 weeks.
→ **Impact:** No custom backends. No Docker. No Kubernetes. Serverless everything.

**Competitive Teardown:** visagist-bot uses Lovable + Supabase — validates the stack works.
→ **Impact:** Confidence in Supabase + Gemini combo. Differentiate through reliability, not stack.

**First Principles:** What's the minimum architecture? Static page + serverless function + AI API.
→ **Impact:** Architecture layered — can strip back to essentials if needed.

---

### Section: AI Pipeline

**Chaos Monkey:** (1) Gemini removes image gen API. (2) AI returns wrong face shape for dark skin. (3) Preview generates a different person. (4) 10x traffic spike overwhelms API.
→ **Impact:** Provider abstraction, bias testing, face similarity check, request queue.

**Red Team:** "Single provider dependency = 100% risk." "No prompt versioning = no rollback." "Base64 photos in every request = slow + expensive."
→ **Impact:** Dual provider, versioned prompts in code, photo URLs from storage (not base64).

**Stakeholder Round Table:**
*AI Engineer:* "Prompts are code — version them." *Cost Analyst:* "Model cost curve at 10K/day." *Security:* "AI keys server-side only."
→ **Impact:** Prompt management system, cost tracking per call, server-side key isolation.

**Kano Model:**
Face analysis: Must-Have. Consultation gen: Must-Have. Preview gen: Performance (must be good). Multi-provider: Must-Have. Prompt versioning: Performance.
→ **Impact:** MVP ships with dual provider + quality gate on previews. Prompt versioning from v1.

**JTBD:** User hires the AI pipeline to "understand my face better than I do and prove it visually."
→ **Impact:** Pipeline optimized for two moments: face shape reveal (trust) and preview (emotion).

---

### Section: Data Model

**First Principles:** Core entities: User, Photo, Consultation, Recommendation. Everything else is enhancement.
→ **Impact:** Four core tables. Everything else is additive.

**Chaos Monkey:** Partial save, photo storage down, schema migration breaks old data.
→ **Impact:** Transaction wrapping, regenerable previews (store params), schema versioning.

**Constraint Mapping:** LGPD biometric data, Supabase RLS, mobile upload size.
→ **Impact:** Explicit consent field, RLS on every table + REVOKE defaults, client compression.

**Pre-mortem:** "RLS misconfiguration leaked 50K facial photos."
→ **Impact:** Automated RLS audit in CI/CD. REVOKE ALL before GRANT (SOSLeiria lesson).

**Stakeholder Round Table:**
*Privacy Officer:* "72-hour breach notification, DPO at scale." *Data Engineer:* "Analytics schema from day 1."
→ **Impact:** Breach plan documented, analytics_events table in v1 schema.

---

### Section: Security

**Red Team:** (1) No rate limiting = DDoS. (2) Photo misuse (uploading others). (3) Data breach of facial photos. (4) Supabase anon key exposes tables.
→ **Impact:** Rate limiting middleware, consent checkbox + liveness detection (v2), encryption at rest, REVOKE + RLS.

**Chaos Monkey:** Supabase outage, Stripe webhook failure, AI provider breach.
→ **Impact:** Static fallback page, webhook retry logic, server-side key rotation plan.

**Pre-mortem:** "We stored API keys in the client bundle. Someone extracted the Gemini key and ran up $50K in charges."
→ **Impact:** All AI keys server-side only. Stripe publishable key is the ONLY client-side secret.

**Constraint Mapping:** LGPD biometric, PCI DSS for payments, CORS for API.
→ **Impact:** Stripe handles PCI. LGPD consent flow. Strict CORS.

**JTBD (Risk Lens):** User hires security to "not expose my face to strangers."
→ **Impact:** Privacy messaging on upload screen, signed URLs, 90-day auto-delete.

---

### Section: Performance

**Pre-mortem:** "AI processing time crept from 25s to 90s. No performance regression tests."
→ **Impact:** Latency tracking per AI call. Alert if p95 > 45s.

**First Principles:** Users wait for two things: face analysis (must be fast) and preview (can be slower). Optimize the first, set expectations for the second.
→ **Impact:** Face shape in 10s (instant value). Preview = async with creative loading UX.

**Constraint Mapping:** 4G mobile, Supabase Edge 60s timeout, AI model latency.
→ **Impact:** Client compression, async preview pattern, incremental result delivery.

**Chaos Monkey:** 10x traffic spike, cold start latency, photo upload on 3G.
→ **Impact:** Auto-scaling (Vercel), keep-alive pings, progressive upload with retry.

**Competitive Teardown:** visagist-bot has no retry, no queue, no compression.
→ **Impact:** Reliability IS the differentiator. Retry + queue + compression = better UX at same AI quality.

---

## 13. Architecture Summary

### Top 10 Architecture Insights from Elicitation

1. **Provider abstraction is non-negotiable** — single AI dependency = existential risk
2. **Prompts are code** — version, test, rollback, A/B test
3. **REVOKE ALL before GRANT** — Supabase default grants are dangerous (SOSLeiria lesson)
4. **All managed services** — solo developer sustainability trumps custom infra
5. **Async preview generation** — 60s Edge Function timeout is a hard constraint
6. **Face similarity check** — prevents "wrong person" previews
7. **Photo URLs, not base64** — store in Supabase Storage, pass URL to AI
8. **Analytics from day 1** — retrofitting analytics never works
9. **Cost tracking per AI call** — circuit breaker if average exceeds threshold
10. **RLS audit in CI/CD** — automated check that every table has policies
