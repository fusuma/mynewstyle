# Elicitation Log — mynewstyle PRD

**Date:** 2026-03-01
**Methods Applied:** 13 unique methods across 9 sections (45 total applications)
**Analyst:** BMAD Advanced Elicitation Engine

---

## Section 1: Success Criteria

### Method 1: Shark Tank Pitch

**Setup:** Present success criteria to a panel of five investors.

*Investor 1 (SaaS veteran):* "85% completion rate — what's the benchmark for photo-upload flows? Most apps with camera requirements see 40-60% drop-off at the photo step alone."

*Investor 2 (Consumer app):* "Satisfaction at 4.2/5.0 — but satisfaction with what? Analysis accuracy? Recommendation quality? Preview realism? These are three different things."

*Investor 3 (Growth hacker):* "50,000 registered users in 12 months with no paid acquisition? What's your CAC? 'Organic sharing ≥ 10%' — screenshots don't have attribution."

*Investor 4 (AI/ML):* "AI cost ≤ $0.50 is tight. Image gen = $0.04-0.08 per call, 2-3 per consultation. Plus facial analysis + text gen. Looking at $0.30-0.80 per full consultation."

*Investor 5 (Marketplace):* "Where's the revenue metric? 'Sustainable revenue through chosen monetization model' at 12 months but you haven't chosen the model."

**Key Insights:**
- Satisfaction needs decomposition into analysis/recommendation/preview scores
- AI cost model needs per-step breakdown
- Revenue/monetization metrics absent
- 85% completion aspirational without benchmarking

**PRD Impact:** Added decomposed satisfaction, per-step cost modeling, monetization experiment timeline.

---

### Method 2: Pre-mortem Analysis

*Scenario A — Completion Collapse:* Actual 52%, not 85%. Photo upload was a black hole — older Android devices couldn't run in-browser camera. Measured from gender selection, but drop-offs happened before photo acceptance.

*Scenario B — Vanity Metrics:* 50K registered, only 8K completed a consultation. Google OAuth made registration meaningless. Should measure "completed first consultation."

*Scenario C — AI Cost Spiral:* Launched at $0.72/consultation. Switched to cheaper models → quality dropped → satisfaction 3.4 → users stopped sharing → growth stalled.

*Scenario D — Preview Disappointment:* 4.0/5.0 realism target too low — anything below 4.5 felt fake. Users lost trust.

**Key Insights:**
- Measure funnel from photo acceptance, not flow start
- "Registered users" is vanity — track completed consultations
- Preview quality bar should be 4.5/5.0
- Need "photo accepted" as distinct metric

**PRD Impact:** Added photo acceptance rate, changed primary count, raised preview target.

---

### Method 3: First Principles

1. **Product succeeds if users change their hairstyle based on recommendation.** Ultimate metric: "Did you get the recommended haircut?"
2. **Satisfaction without action = entertainment, not utility.**
3. **AI is only as good as the user's photo.** Photo quality is THE determinant.
4. **Repeat usage signals trust, not novelty.** Second consultation = conviction.
5. **The barber is the last mile.** If barber can't execute, product failed downstream.

**Key Insights:**
- Add "barber visit intent" post-consultation survey
- Photo quality deserves own success category
- Track "showed preview to barber" as conversion signal

**PRD Impact:** Added downstream action metrics, photo quality success category.

---

### Method 4: Kano Model

| Metric | Category | Note |
|--------|----------|------|
| Completion ≥ 85% | Performance | Higher is linearly better |
| Preview engagement ≥ 70% | Delighter | Hero moment |
| Time to value ≤ 5 min | Must-Have | Beyond 5 min, bail |
| Satisfaction ≥ 4.2 | Performance | Drives retention |
| AI cost ≤ $0.50 | Must-Have | Unit economics break above |
| Preview realism ≥ 4.0 | Must-Have | Bad preview worse than no preview |
| Error rate < 2% | Must-Have | Errors destroy trust |

**Key Insights:** Preview realism was Delighter but behaves as Must-Have — bad preview kills trust.

---

### Method 5: Competitive Teardown

| Competitor | Key Metric | Our Gap |
|-----------|-----------|---------|
| visagist-bot | Consultation count only | No quality metrics — we're ahead |
| FaceShape (iOS) | App Store rating 3.8/5 | Need in-app NPS |
| HairstyleAI | Subscription conversion | Track monetization from day 1 |
| PhotoRoom | Share rate | Proven growth metric by $1B company |

**PRD Impact:** Added NPS, share rate as growth metric, monetization readiness.

---

## Section 2: User Journeys

### Method 1: User Focus Group

*Maria, 45, teacher:* "Journeys are all young people. I want age-appropriate styles. Will AI handle thinning hair and greying?"

*Tomás, 19, student:* "Where's 'experimental'? 'K-pop'? 'E-boy'? Style categories too conservative."

*Sandra, 38, wheelchair user:* "Photo guidance assumes arm-length selfie. What about glasses? Head coverings?"

*Pedro, 50, bald:* "Does the platform handle hair loss? Or recommend styles for hair I don't have?"

*Aisha, 28, hijab-wearing:* "I cover hair for religious reasons. Can you serve face-framing pieces?"

**Key Insights:**
- Age diversity missing (no persona 40+)
- Hair loss/thinning unaddressed
- Accessibility gaps (glasses, head coverings, physical limitations)
- Religious/cultural hair practices not considered
- Need "not enough hair for styling" path

**PRD Impact:** Added age-diverse persona, hair loss edge case, accessibility reqs, expanded style categories.

---

### Method 2: Red Team vs Blue Team

**Red Team:** (1) No 27-year-old completes a 5-step flow from an Instagram ad in one session. (2) SEO targets people who already know their face shape — exactly who doesn't need this. (3) Zero referral mechanics. (4) No failure journeys — what when AI gets face shape wrong?

**Blue Team:** (1) Add save/resume for interrupted sessions. (2) Target "what haircut should I get" not "what suits X face." (3) Add referral link with before/after sharing. (4) Add "disagree with analysis" override flow.

**Key Insights:** Session persistence, SEO keyword correction, referral mechanics, AI override capability all missing.

---

### Method 3: Jobs-to-be-Done

1. **When** about to get a haircut → know what suits my face → walk in confident
2. **When** see a haircut on someone else → know if it works on me → avoid disappointment
3. **When** bored with my look → explore safe options → change without risk
4. **When** communicating with barber → show visual reference of me with the cut → get exactly what I want
5. **When** I don't trust my style judgment → get expert advice affordably → look my best

**Key Insight:** Job #4 is underserved — preview is positioned as "wow" feature but highest utility is barber communication tool.

---

### Method 4: Stakeholder Round Table

*End User:* "Let me try without signup." *Developer:* "Questionnaire needs conditional logic (skip hair texture for bald users)." *Business Owner:* "Free tier needs watermarked/low-res previews." *Barber:* "AI previews must show achievable styles or they create conflict." *Competitor:* "We'll launch text-description-only — no photo friction."

**Key Insights:** Guest flow critical, conditional questionnaire, realistic style constraints, competition could eliminate photo requirement.

---

### Method 5: SCAMPER

| SCAMPER | Insight |
|---------|---------|
| Substitute | Replace photo with video selfie → more angles, better data |
| Combine | Overlay questions on camera view (photo + questionnaire in one step) |
| Adapt | Tinder swipe UX for style preferences → more engaging than dropdowns |
| Modify | Add "styles to avoid" → trust-builder |
| Eliminate | Can AI infer lifestyle from photo alone? (clothing, background) |
| Reverse | Show 10 styles first, let user pick favorites, THEN analyze fit |

**PRD Impact:** Added "styles to avoid," noted swipe UX as v2 experiment.

---

## Section 3: Domain Model

### Method 1: First Principles

```
User
├── Profile (name, email, gender, age_range)
├── Photo[] (original, compressed)
├── Consultation[]
│   ├── Questionnaire Responses
│   ├── Facial Analysis (face_shape, proportions, hair_assessment)
│   ├── Recommendation[] (style, justification, preview, difficulty, score)
│   ├── Grooming Tips[]
│   └── Metadata (created_at, duration, ai_cost, model_versions)
└── Favorites[]
```

**Missing entities:** Style Catalog (reference DB), AI Model Version tracking, Feedback (per-recommendation ratings), Photo Quality Score.

---

### Method 2: ADRs

**ADR-001: Photo Storage** → Supabase Storage for MVP, migrate to S3 at 50K+ photos. Add "delete after analysis" privacy option.

**ADR-002: Flat vs Normalized** → Normalized tables. Enables analytics queries (most recommended face shape, etc). Worth the complexity.

---

### Method 3: Chaos Monkey

- Photo storage down → client-side retention with retry queue
- Partial consultation save → transaction wrapping (all or nothing)
- Preview images lost → store generation params, allow "regenerate"
- Schema migration breaks history → versioned consultation schema

---

### Method 4: Constraint Mapping

| Constraint | Impact |
|-----------|--------|
| LGPD (EU GDPR) | Right to deletion, consent tracking, biometric data category |
| Supabase RLS | All queries must respect user-scoped access |
| AI rate limits | Queue management needed |
| Photo file size (mobile) | Frontend compression mandatory (<500KB) |
| Free tier costs | Abuse prevention needed |

---

### Method 5: Stakeholder Round Table

*Data Engineer:* "Analytics event schema from day 1." *Privacy Officer:* "Facial photos = biometric data under LGPD. Elevated consent." *Product Analyst:* "Design A/B testing into recommendation engine."

---

## Section 4: Feature Requirements

### Method 1: Kano Model

| Feature | Category |
|---------|----------|
| Photo upload + camera | Must-Have |
| Face shape detection | Must-Have |
| 2-3 recommendations | Must-Have |
| AI visual preview | Performance |
| Guest flow (no signup) | Must-Have |
| "Styles to avoid" | Delighter |
| AI override (disagree) | Performance |
| Consultation history | Must-Have |
| Confidence scores | Delighter |

**Key:** Guest flow promoted to Must-Have. "Styles to avoid" cheap Delighter added to MVP.

---

### Method 2: Red Team vs Blue Team

**Red:** (1) Photo validation too vague — multiple faces? Sunglasses? (2) Bad preview actively damages product. (3) 5-8 questions in 2 min = 15-24 sec/question — tight. (4) History is v1.1, not MVP.

**Blue:** (1) Specific rules: single face, no sunglasses, face >30% frame. (2) Quality gate — don't show bad previews. (3) All questions visual/tap-based, no free text. (4) History IS MVP — lost results = lost users.

---

### Method 3: SCAMPER

- Add confidence scores ("93% match for your face shape")
- Repeat users skip questionnaire (data already captured)
- Animated reveal like Spotify Wrapped → shareable
- "Try a specific style" upload feature (reference photo input)

---

### Method 4: User Focus Group

- Need standalone shareable preview image (not full consultation)
- Hair color is huge gap for female path
- Hair density/thinning awareness critical
- Multi-angle preview desired (v2)
- Product should suggest re-consultation timing

---

### Method 5: Chaos Monkey

- AI generates inappropriate preview → content safety filter + face similarity check
- Questionnaire conflicts with photo → photo overrides self-report, acknowledge gently
- Same photo different results → cache per photo hash for deterministic output
- Need flag/report mechanism for problematic outputs

---

## Section 5: Non-Functional Requirements

### Method 1: Chaos Monkey

- AI provider outage → multi-provider fallback (Gemini primary, OpenAI secondary)
- 10x traffic spike → queue with position indicator, rate limit new consultations
- Photo storage breach → encrypt at rest (AES-256), signed URLs (15-min expiry)
- AI model upgrade breaks quality → continuous quality monitoring, 5% human review sample

---

### Method 2: Red Team vs Blue Team

**Red:** (1) Landing page perf is vanity — AI processing wait is where it matters. (2) No API rate limiting = DDoS risk. (3) 100 concurrent = too low ceiling. (4) WCAG AA good but photo requirement itself is accessibility barrier.

**Blue:** (1) Perceived performance: progress indicators, partial results, incremental loading. (2) Rate limit: 3/hr unauthenticated, 10/day free, unlimited premium. (3) Auto-scaling, not fixed ceiling. (4) Text-only consultation fallback.

---

### Method 3: Constraint Mapping

- Supabase Edge Function 60s timeout → async processing for image generation
- LGPD DPO required at scale
- Mobile network conditions → offline results caching

---

### Method 4: Stakeholder Round Table

*Security:* Facial photos = biometric data, elevated LGPD. Explicit consent, purpose limitation, 72-hour breach notification.

*DevOps:* Observability stack missing — structured logging, distributed tracing, cost-per-request tracking.

*Mobile Dev:* Consider 3G users, data caps, rural areas.

---

### Method 5: Pre-mortem

- AI processing time crept from 25s to 90s → no performance regression tests
- RLS misconfiguration exposed photos → need deployment checklist
- AI costs grew from $0.42 to $1.30 (95% preview usage, not 70%) → cost alerts with circuit breakers

---

## Section 6: Technical Architecture

### Method 1: ADRs

**ADR-003: Frontend** → Next.js 14+ (App Router). SSR landing for SEO, SPA for consultation. Web-first avoids App Store friction.

**ADR-004: AI Pipeline** → Sequential: Facial analysis (Vision) → Recommendations (Text) → Preview (Image, on-demand). On-demand preview saves $0.04-0.08 per unviewed style.

**ADR-005: Provider Strategy** → Gemini primary + OpenAI fallback for MVP. Multi-provider routing post-MVP. Abstraction layer required.

---

### Method 2: Chaos Monkey

- Gemini misidentifies face shape for certain ethnicities → diverse test dataset, accuracy tracking per ethnicity
- Edge Function cold starts → keep-alive pings during business hours
- Image gen produces wrong person → face similarity check (embedding comparison)

---

### Method 3: First Principles

Minimum viable architecture = static page + serverless function + AI API + results page. Database optional. Auth optional. Preview is enhancement. Consider zero-infrastructure launch to validate demand.

---

### Method 4: Competitive Teardown (visagist-bot)

Their gaps we exploit: (1) base64 in every request — huge payload; we use storage URLs. (2) No retry logic. (3) No photo compression. (4) No queue management. (5) Single provider dependency. Differentiate through reliability.

---

### Method 5: Stakeholder Round Table

*Backend:* "Separate AI processing from web request lifecycle — async worker pattern."
*Frontend:* "Camera cross-browser testing needs 2+ weeks dedicated QA."
*AI/ML:* "Prompts need version control — they're code."
*Cost Analyst:* "Model the cost curve. At 1K consultations/day = $500/day = $15K/month."

---

## Section 7: Content/Design Strategy

### Method 1: User Focus Group

- "Bold and urban" alienates 40+ users and some female users
- Female path needs its own design identity, not a reskin
- Design should be "premium modern" not "bold urban" — broader appeal
- Shareable results need social media aspect ratios (9:16 stories, 1:1 feed)
- Consider non-binary option

---

### Method 2: SCAMPER

- Replace landing page with interactive demo (celebrity consultation sample)
- Loading screen → educational content about visagism
- Results feel like magazine editorial, not data dump
- No stock photos — all AI-generated product demos

---

### Method 3: Competitive Teardown

Sweet spot: Skin+Me's premium editorial feel + FaceApp's shareability. Dual theme: dark for male path, light/warm for female path. Results page borrows from Skin+Me: clean, authoritative.

---

### Method 4: Pre-mortem

- Generic AI copy: every consultation sounds identical with adjectives swapped → need text variation engine
- Cultural mismatch: all Western references → PT-BR and PT-PT localization
- "Pink it and shrink it": female path is just male with pink → genuinely different content strategy needed

---

### Method 5: First Principles

Content hierarchy (decreasing visual weight):
1. "Here's what I see" — face shape (validates AI competence)
2. "Here's what works" — top 1 recommendation (decision made easy)
3. "Here's how you'd look" — preview (emotional confirmation)
4. "Here's what else works" — alternatives (collapsible)
5. "Here's what to avoid" — trust-builder
6. "Here's how to maintain it" — post-decision support

Most users stop at step 3. Design for that.

---

## Section 8: Go-to-Market

### Method 1: Shark Tank Pitch

- Distribution strategy undefined — how do first 1,000 users find you?
- Sharing mechanics must be day 1 (not post-MVP)
- Target barbers/stylists with followings as influencers
- Pick launch market: Portugal vs Brazil vs English
- Free-to-paid conversion weak — one consultation may be enough forever

---

### Method 2: Pre-mortem

- Empty launch: tweeted + Product Hunt → 200 users day 1, then 5/day
- Influencer misfire: bad AI preview → roasted by 100K follower influencer
- Barber resistance: seen as threat → discourage clients

**Fix:** Sustained acquisition channel. Influencer readiness gates. "Barber's best friend" positioning.

---

### Method 3: Jobs-to-be-Done (Market Lens)

- Content creators → transformation before/after content
- Barbershops → upsell premium consultation as service (B2B2C)
- E-commerce → recommend products with consultation (affiliate)
- Dating profile optimization → adjacent market

**Key:** B2B2C barber model could be more sustainable than pure B2C.

---

### Method 4: Constraint Mapping

- Zero budget → organic, viral, partnership channels only
- Portuguese first → Brazil = 210M speakers, strong beauty culture
- SEO: "corte de cabelo para rosto redondo" is high-volume PT keyword
- AI quality gate before any marketing push

---

### Method 5: Red Team vs Blue Team

**Red:** Free consultation solves a one-time problem. Barbers don't want AI-generated references. PT market is tiny (10M).

**Blue:** Recurrence: seasonal changes, post-haircut new photo, trend updates, hair growth. Frame as "barber communication tool." Expand: PT → Spanish (500M) → English.

---

## Section 9: Risk Mitigation

### Method 1: Pre-mortem

- AI Plateau: 85% accuracy = 1 in 7 wrong → negative word of mouth
- Legal: no ToS/disclaimers → sued for "ruined appearance"
- Deepfake concerns: media labels it a "deepfake factory"
- Competitor copies: FaceApp/L'Oréal launches same with 100x resources
- **Founder burnout: most likely failure mode for solo projects**

---

### Method 2: Red Team vs Blue Team

**Top 5 Kill Shots:** (1) AI bias across ethnicities. (2) Photo misuse (uploading others). (3) Economic unsustainability at $0.80/consultation. (4) Quality inconsistency (different results same photo). (5) Data breach of 50K facial photos.

**Mitigations:** (1) 250+ diverse test photos, accuracy tracking per ethnicity. (2) Liveness detection, consent confirmation. (3) Model break-even price pre-launch. (4) Deterministic output via seed + caching. (5) Encrypt at rest, quarterly security audit.

---

### Method 3: Chaos Monkey

- Gemini removes image gen API → provider abstraction layer + pre-evaluated alternatives
- TikTok mocks results → quality gate before launch + humor response plan
- Supabase multi-hour outage → static fallback page
- Consultation goes viral as "deepfake" → watermark AI previews

---

### Method 4: Constraint Mapping

| Risk | Constraint | Approach |
|------|-----------|----------|
| Technical | AI accuracy ceilings, rate limits | Multi-model, queue system |
| Legal | LGPD biometric, AI liability | Disclaimers, ToS, privacy officer |
| Financial | No revenue, AI costs | Unit economics pre-launch, cost circuit breakers |
| Reputational | AI bias, deepfake perception | Diverse testing, watermarks |
| Operational | Solo developer | Automation, phased launch, burnout prevention |

---

### Method 5: JTBD (Risk Lens)

User risk concerns: "Don't embarrass me" → confidence indicators. "Don't waste my time" → instant face shape reveal in 10 seconds. "Don't expose my face" → privacy messaging on upload screen. "Don't trick me" → realistic expectation framing for previews.

---

# Summary

## Methods × Sections: 45 total (5 per section × 9 sections)

## Top 10 Insights

1. **Preview quality is Must-Have, not Delighter** — bad preview worse than none. Quality gate: don't show if not good enough.
2. **"Registered users" is vanity** — track "completed first consultation" as real user count.
3. **Barber is the last mile** — frame previews as "barber communication tools."
4. **AI bias is #1 reputational risk** — test with 250+ diverse photos before launch.
5. **Guest flow is MVP Must-Have** — registration-first kills 30-50% of users.
6. **Solo developer burnout is most likely failure mode** — more likely than any technical risk.
7. **"Styles to avoid" is high-value, low-cost Delighter** — trust-builder for minimal extra AI cost.
8. **Unit economics need pre-launch modeling** — at $0.50-0.80/consultation with no revenue, platform bleeds money.
9. **Provider abstraction is non-negotiable** — 100% dependency on Gemini = 100% risk.
10. **Female path needs genuine differentiation** — "pink it and shrink it" will fail.
