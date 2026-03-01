---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - product-brief-mynewstyle-2026-03-01.md
  - prompt.md
workflowType: 'prd'
status: complete
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - mynewstyle

**Author:** Fusuma
**Date:** 2026-03-01

## Executive Summary

mynewstyle is an AI-powered visagism platform that automates personalized hairstyle and grooming consultations for both male and female users. Users upload a selfie, complete a lifestyle questionnaire, and receive a comprehensive consultation: face shape analysis, 2-3 recommended hairstyles with visagism-backed justifications, grooming tips, and AI-generated visual previews showing them with each recommended style.

The platform replaces expensive, scarce human visagism consultants with AI agents, enabling hyper-personalization at scale. Target users range from style-conscious professionals seeking data-driven recommendations to low-effort individuals who want a clear answer without research.

### What Makes This Special

- **"See How I Look" AI previews**: Users see themselves — not a generic model — with each recommended hairstyle before committing. This is the emotional peak of the experience and the primary conversion driver.
- **Holistic analysis**: Combines facial geometry (face shape, proportions) with lifestyle context (occupation, daily routine, maintenance preferences) for recommendations that work in real life, not just in theory.
- **Dual-gender platform**: Gender-specific style paths (male/female) with tailored analysis frameworks, UI language, and recommendation types — unlike competitors that serve only one demographic.
- **Zero expertise required to operate**: The business owner needs no visagism knowledge. AI agents handle the entire consultation pipeline.

## Project Classification

- **Project Type:** Web Application (SPA, mobile-first, responsive)
- **Domain:** Consumer lifestyle / beauty-tech (general, no regulatory requirements)
- **Complexity:** Medium (AI integration, image generation pipeline, real-time processing)
- **Project Context:** Greenfield — new product, no existing codebase

---

## Success Criteria

### User Success

| Criterion | Metric | Target |
|-----------|--------|--------|
| Consultation completion | % of users who upload a photo and receive full results | ≥ 85% |
| Visual preview engagement | % of consultation recipients who tap "See How I Look" | ≥ 70% |
| Time to value | Time from landing page to receiving results | ≤ 5 minutes |
| Consultation satisfaction | Post-result user rating | ≥ 4.2 / 5.0 |
| Return usage | Users completing a second consultation within 90 days | ≥ 30% |
| Recommendation relevance | Users rating recommendations as "relevant" or "very relevant" | ≥ 85% |

### Business Success

**3-Month Targets:**
- 1,000+ completed consultations
- Average satisfaction ≥ 4.0/5.0
- Organic sharing rate ≥ 10%
- Baseline metrics established for all KPIs

**12-Month Targets:**
- 50,000+ registered users across male and female segments
- 15,000+ monthly active consultations
- Sustainable revenue through chosen monetization model
- AI cost per consultation ≤ $0.50
- Brand recognition as the go-to AI visagism platform

### Technical Success

| Criterion | Target |
|-----------|--------|
| AI face shape detection accuracy | ≥ 90% agreement with manual assessment |
| AI image generation quality | ≥ 4.0/5.0 realism rating from users |
| End-to-end error rate | < 2% of consultations fail or timeout |
| Photo upload success rate | ≥ 95% (no errors/retries) |
| API response time (consultation generation) | ≤ 30 seconds |
| Image generation time | ≤ 60 seconds per preview |

### Measurable Outcomes

- **Adoption signal**: 500+ completed consultations in first 30 days post-launch
- **Engagement signal**: ≥ 60% of consultation recipients use "See How I Look"
- **Retention signal**: ≥ 20% of users return for second consultation within 90 days
- **Growth signal**: Week-over-week increase in consultation volume sustained over 90 days
- **Quality signal**: AI recommendation relevance rated ≥ 85% by users

---

## Product Scope

### MVP - Minimum Viable Product

**Core User Journeys Supported:**
- End consumer (male): Full consultation flow from photo upload through AI preview
- End consumer (female): Full consultation flow with gender-specific recommendations
- Returning user: View consultation history, start new consultation

**Must-Have Capabilities:**
1. Gender selection gateway (male/female) with adapted UI and recommendation framework
2. Photo upload with camera capture, gallery upload, and frontend compression
3. Lifestyle questionnaire (5-8 questions, gender-tailored, under 2 minutes)
4. AI facial analysis: face shape detection, proportion analysis, hair type assessment
5. AI consultation engine: 2-3 recommended hairstyles with visagism justifications
6. Gender-specific grooming recommendations (beard for men, layering/length for women)
7. AI visual preview ("See How I Look"): user's photo with recommended style applied
8. Before/after comparison view (side-by-side or slider)
9. Results page with structured layout: analysis, recommendations, styling tips
10. Creative loading animation during AI processing
11. User authentication (email/password + Google OAuth)
12. User profile with consultation history and favorites
13. Landing page with value proposition, how-it-works, and CTA
14. Mobile-first responsive design with bold, urban visual identity

### Growth Features (Post-MVP)

**Phase 2 (Months 4-8):**
- Freemium model: 1 free consultation, premium for unlimited + enhanced previews
- Admin dashboard with business metrics and consultation analytics
- Social sharing with branded result cards
- PDF export of consultation results
- Push notifications for "time for a new look?" reminders

**Phase 3 (Months 9-14):**
- Multi-language support (English, Spanish, Portuguese)
- Hair color recommendations and coloring simulation
- Barber/salon directory integration with nearby recommendations
- Stylist referral partnerships (commission-based)
- Seasonal style trend integration

### Vision (Future)

**Phase 4 (Year 2+):**
- AR real-time try-on using device camera
- Video-based analysis for hair texture and movement
- AI style evolution tracking over time
- Community features: share transformations, rate results
- API for barber/salon apps to integrate mynewstyle consultations
- White-label solution for barbershop chains and salon franchises

---

## User Journeys

### Journey 1: Lucas — Style-Conscious Professional Discovers mynewstyle (Male Happy Path)

Lucas, 27, marketing analyst. He cares about his appearance but has no formal style knowledge. He's frustrated after getting a fade that didn't suit his round face.

**Opening Scene:** Lucas scrolls Instagram and sees a targeted ad: "Discover the perfect haircut for your face shape — powered by AI." The before/after visual hooks him. He taps through to the landing page.

**Rising Action:** He selects "Male" on the gender gateway. The UI shifts to a bold, dark-themed masculine design. He takes a selfie using the in-app camera, following on-screen guidance for lighting and angle. The questionnaire asks about his work environment (corporate), daily routine (medium maintenance), and style preference (modern/clean). Each question feels quick and relevant — he finishes in under 90 seconds.

**Climax:** The loading animation shows his photo being "analyzed" with a face-mapping overlay. Results appear: "Your face shape is Round." The explanation makes sense — he'd never known why certain cuts looked off. Three recommended styles appear with clear justifications: "A textured crop adds vertical height, creating visual balance for round faces." He taps "See How I Look" and sees *himself* — his actual face — with the textured crop. The realism makes him grin.

**Resolution:** Lucas saves the result, shows the AI preview to his barber at his next appointment, and gets exactly the cut he saw. He returns to mynewstyle 6 weeks later to explore a different style.

### Journey 2: Camila — Reinvention Seeker Gets Personalized Guidance (Female Happy Path)

Camila, 32, freelance graphic designer in a new city. She wants a fresh look that balances creativity with professionalism.

**Opening Scene:** Camila searches "what hairstyle suits oval face" and finds mynewstyle through organic search. The landing page's 3-step promise resonates: Photo → Analysis → Your New Look.

**Rising Action:** She selects "Female." The UI adapts with softer color accents and female-specific language. She uploads a recent photo from her gallery. The questionnaire explores her hair type (wavy), maintenance willingness (low — she works from home), and occasions that matter (client video calls). The questions feel like a conversation with a stylist who actually listens.

**Climax:** Results identify her oval face as "the most versatile face shape" with specific proportion analysis. Recommendations include a long layered cut with curtain bangs — justified by how layers frame an oval face while bangs add dimension. She taps "See How I Look" and sees the curtain bangs on her own face. The contrast with her current unstyled look is striking.

**Resolution:** Camila screenshots the AI preview and takes it to a new salon. The stylist appreciates the clear reference. Camila loves the result and shares her before/after on Instagram stories, tagging mynewstyle. She favorites the result in her profile for future reference.

### Journey 3: Rafael — Low-Effort User Gets a Quick Answer (Male Edge Case)

Rafael, 35, software engineer. He's worn the same basic cut for years. His wife suggested he try something new. He needs this to be effortless.

**Opening Scene:** Rafael's wife sends him the mynewstyle link via WhatsApp. He opens it on his phone during a break. The "3 minutes to your perfect cut" messaging hooks him.

**Rising Action:** He selects "Male," takes a quick selfie (the app gently prompts him to improve lighting), and races through the questionnaire. He selects "minimal effort" for maintenance and "casual" for work environment. Total time: under 2 minutes.

**Climax:** Results identify his square jawline and recommend styles that soften angles. The justifications are brief but convincing. He taps "See How I Look" on the top recommendation — a crew cut with slight texture on top. He sees himself with it and thinks "I could do that."

**Resolution:** At his next barber visit, he shows the AI preview instead of saying "same as last time." The barber executes the cut. Rafael's wife notices immediately. He doesn't return to mynewstyle for 3 months — but when it's time for a change, he remembers and comes back.

### Journey 4: Platform Administrator — Monitoring Business Health

The business operator managing mynewstyle. No visagism expertise — they rely entirely on the AI.

**Opening Scene:** Operator logs into the admin dashboard on Monday morning to review weekend performance.

**Rising Action:** Dashboard shows 340 consultations completed over the weekend, 78% completion rate, and 4.3/5.0 average satisfaction. They notice the female path has lower completion rates (72%) than male (84%) and flag it for investigation. They check AI cost metrics — $0.42 average per consultation, within budget.

**Climax:** A spike in errors appears for image generation on Saturday evening — 8% failure rate vs. the normal 2%. The operator identifies it as a rate limit issue from the AI provider during peak hours.

**Resolution:** They adjust the queue configuration to stagger requests during peak periods and monitor the fix over the next weekend. They also review user feedback comments to identify common themes for improvement.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| Lucas (Male Happy Path) | Gender gateway, camera capture with guidance, male questionnaire, face shape detection, consultation engine, AI preview generation, save/favorite results, consultation history |
| Camila (Female Happy Path) | Female path adaptation, gallery upload, female questionnaire, lifestyle-aware recommendations, AI preview, social sharing intent, result favoriting |
| Rafael (Edge Case) | Quick flow optimization, photo quality guidance, minimal questionnaire path, clear/concise results display, barber-friendly preview format |
| Admin | Dashboard metrics, completion rate tracking, error monitoring, cost tracking, user feedback review, configuration management |

---

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. AI Visagism Automation**: Encoding professional visagism knowledge (a specialized human skill) into AI agents. This isn't generic "face shape detection" — it's a full consultation pipeline that combines facial analysis with lifestyle context to deliver actionable, personalized recommendations with professional-grade justifications.

**2. Personalized Visual Simulation**: Using generative AI to show the user *themselves* with recommended styles. Unlike virtual try-on apps that overlay generic templates, this generates realistic previews preserving the user's actual face, skin tone, and features — creating the most powerful decision-confidence tool in the hairstyle domain.

**3. Dual-Gender Visagism Platform**: No existing platform serves both male and female audiences with truly gender-differentiated visagism analysis paths. This isn't cosmetic UI theming — it's structurally different recommendation engines (beard analysis for men, layering/color for women).

### Validation Approach

- Beta test with 100+ users per gender, comparing AI recommendations against manual visagism assessments
- A/B test visual preview realism ratings across different AI models
- Track "barber/salon visit" conversion: did users actually get the recommended cut?
- Compare satisfaction scores between users who used visual preview vs. those who didn't

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| AI face shape detection inaccuracy | Multi-model ensemble; fallback to user self-selection if confidence is low |
| Visual preview unrealism | Use highest-quality image generation model; set user expectations with "artistic representation" framing |
| AI hallucination in recommendations | Constrain AI output to validated visagism knowledge base; structured output format |
| Gender path imbalance (one gender underserved) | Equal development investment in both paths; separate quality metrics per gender |

---

## Web Application Specific Requirements

### Project-Type Overview

mynewstyle is a mobile-first Single Page Application (SPA) with server-side AI processing. The frontend handles photo capture/upload, questionnaire interaction, and results display. Heavy AI workloads (facial analysis, consultation generation, image generation) run on serverless backend functions.

### Technical Architecture Considerations

**SPA Architecture:**
- Client-side routing for seamless flow between questionnaire steps and results
- Progressive loading: questionnaire renders immediately while AI models warm up
- Optimistic UI patterns during AI processing with creative loading states

**Browser Support:**
- Modern browsers: Chrome, Safari, Firefox, Edge (latest 2 versions)
- Mobile browsers: iOS Safari 15+, Chrome for Android 90+
- No IE11 support required

**SEO Strategy:**
- Server-side rendered landing page for search engine visibility
- SPA for authenticated consultation flow (no SEO needed post-login)
- Meta tags and structured data for "face shape" and "hairstyle recommendation" search queries

**Real-Time Considerations:**
- No real-time collaboration or WebSocket requirements
- Long-polling or status polling for AI processing progress updates
- Image generation is async — user waits on results page with loading animation

**Responsive Design:**
- Mobile-first breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop)
- Camera capture optimized for mobile device cameras
- Touch-friendly questionnaire interactions
- Results page adapts to screen size (stacked on mobile, side-by-side on desktop)

### Implementation Considerations

**Image Handling:**
- Frontend compression to ≤ 800px width before upload (reduces API payload size)
- Base64 encoding for AI model consumption
- Secure image storage with user-scoped access
- Image cleanup policy for storage management

**AI Processing Pipeline:**
- Sequential processing: facial analysis → consultation generation → image generation (on demand)
- Image generation triggered per-style only when user taps "See How I Look"
- Queue management to prevent simultaneous generation requests
- Automatic retry (up to 2 attempts) with user-friendly error messages

**Authentication Flow:**
- Email/password registration with email verification
- Google OAuth as alternative sign-in method
- Session management with JWT tokens
- Guest flow consideration: allow one free consultation without account (convert to registered on save)

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — deliver the core visagism consultation experience with enough quality to validate that AI can replace human consultants effectively. The visual preview is included in MVP because it's the primary differentiator and decision-confidence driver.

**Resource Requirements:** Solo developer or small team (1-2 developers). Leverages managed services (Supabase for backend, AI APIs for processing) to minimize infrastructure work.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Male user: complete consultation flow with AI preview
- Female user: complete consultation flow with AI preview
- Returning user: view history, start new consultation

**Must-Have Capabilities:**
- Gender gateway with adapted UI
- Photo upload (camera + gallery) with compression
- Lifestyle questionnaire (gender-tailored)
- AI facial analysis and consultation engine
- AI visual preview generation
- Results page with structured display
- User auth (email + Google OAuth)
- User profile with history and favorites
- Landing page with CTA
- Mobile-first responsive design

**Explicitly NOT in MVP:**
- Admin dashboard (use Supabase dashboard directly)
- Payment/subscription system
- Social sharing features
- PDF export
- Multi-language support
- Hair color recommendations
- AR try-on
- Barber/salon marketplace

### Risk Mitigation Strategy

**Technical Risks:**
- AI model quality/cost tradeoff → Start with best available model, optimize cost post-launch
- Image generation latency → Queue management, creative loading UX, user expectation setting
- Photo quality variance → On-screen guidance, validation before submission

**Market Risks:**
- Users don't trust AI recommendations → Lead with educational content about visagism science; show methodology transparency
- Low return usage → "Time for a new look" nudges; seasonal trend integration (post-MVP)

**Resource Risks:**
- Solo developer scope → Leverage Supabase managed services; prioritize ruthlessly; accept manual processes for admin tasks initially

---

## Functional Requirements

### User Onboarding & Authentication

- FR1: Users can register with email/password or Google OAuth
- FR2: Users can log in and maintain authenticated sessions
- FR3: Users can select their gender (male/female) at the start of each consultation
- FR4: The platform adapts UI theme, language, and recommendation framework based on gender selection

### Photo Management

- FR5: Users can capture a selfie using their device camera with on-screen guidance for lighting, angle, and framing
- FR6: Users can upload a photo from their device gallery as an alternative to camera capture
- FR7: The system compresses and resizes uploaded photos before submission to optimize processing
- FR8: The system validates that a face is detected in the uploaded photo before proceeding

### Lifestyle Questionnaire

- FR9: Users can complete a gender-tailored lifestyle questionnaire (5-8 questions) covering style preference, daily routine, professional context, hair type, and grooming preferences
- FR10: The questionnaire adapts questions based on gender selection (e.g., beard preferences for male, hair length comfort for female)
- FR11: Users can complete the questionnaire in under 2 minutes

### AI Facial Analysis

- FR12: The system can detect and classify face shape from a user photo (oval, square, round, triangular, oblong, heart, diamond)
- FR13: The system can analyze facial proportions from a user photo
- FR14: The system can assess visible hair characteristics from a user photo
- FR15: The system presents face shape identification with a clear, educational explanation to the user

### AI Consultation Engine

- FR16: The system can generate 2-3 personalized hairstyle recommendations based on face shape, facial proportions, and lifestyle questionnaire responses
- FR17: Each recommendation includes a visagism-backed justification explaining why the style suits the user's face shape
- FR18: The system generates gender-specific grooming recommendations (beard style suggestions for male users; layering, length, and styling suggestions for female users)
- FR19: The system generates personalized styling tips and product recommendations based on the user's lifestyle and hair type

### AI Visual Preview

- FR20: Users can generate an AI visual preview showing themselves with a recommended hairstyle ("See How I Look")
- FR21: The visual preview preserves the user's face, skin tone, and features while applying the recommended style
- FR22: Users can generate previews for each recommended style independently (2-3 previews available)
- FR23: Users can compare their original photo with the AI preview using a side-by-side or slider view

### Results Display

- FR24: The system displays consultation results in a structured layout with clear visual hierarchy: face shape analysis, recommendation cards, styling tips
- FR25: Each recommendation card is numbered by relevance with a prominent "See How I Look" button
- FR26: Styling tips are displayed in a structured, scannable format (parsed into categorized items with icons)
- FR27: The system displays a creative loading animation during AI processing, showing the user's photo with transformation effects

### User Profile & History

- FR28: Users can view their consultation history with dates and results
- FR29: Users can favorite or save specific recommended styles
- FR30: Users can start a new consultation with a new photo at any time
- FR31: Users can view previously generated AI previews from past consultations

### Landing Page

- FR32: The landing page communicates the value proposition with before/after visuals
- FR33: The landing page displays a "How it works" section showing the 3-step process (Photo → Analysis → Your New Look)
- FR34: The landing page includes a clear call-to-action to start a consultation
- FR35: The landing page is optimized for search engines with relevant meta tags and structured data

### Administration (Post-MVP)

- FR36: Administrators can view a dashboard with consultation volume, user registrations, completion rates, and satisfaction scores
- FR37: Administrators can view individual consultation results and AI-generated content
- FR38: Administrators can monitor error rates and AI processing performance
- FR39: Administrators can manage user accounts

### Error Handling & Recovery

- FR40: The system provides user-friendly error messages in the user's language when AI processing fails
- FR41: The system automatically retries failed AI operations (up to 2 attempts) before showing an error
- FR42: The system prevents simultaneous AI generation requests from the same user (sequential queue)
- FR43: The system gracefully handles photo upload failures with clear guidance for retry

---

## Non-Functional Requirements

### Performance

- NFR1: Landing page loads in under 2 seconds on 4G mobile connections as measured by Lighthouse performance score ≥ 90
- NFR2: Questionnaire transitions between questions complete in under 300ms
- NFR3: AI facial analysis and consultation generation completes in under 30 seconds
- NFR4: AI visual preview generation completes in under 60 seconds per image
- NFR5: Photo upload (after frontend compression) completes in under 5 seconds on 4G

### Security

- NFR6: All data transmitted over HTTPS/TLS 1.2+
- NFR7: User photos stored with user-scoped access control — users can only access their own photos and results
- NFR8: Authentication tokens (JWT) expire after 24 hours of inactivity
- NFR9: User passwords hashed with bcrypt or equivalent before storage
- NFR10: API keys for AI services stored server-side only — never exposed to client

### Scalability

- NFR11: System supports 100 concurrent consultations without degradation
- NFR12: AI processing queue handles burst traffic with graceful queuing (no dropped requests)
- NFR13: Photo storage scales to 100,000+ images with automated lifecycle management
- NFR14: Database supports 50,000+ user records with sub-second query response

### Accessibility

- NFR15: WCAG 2.1 Level AA compliance for landing page and core consultation flow
- NFR16: All interactive elements accessible via keyboard navigation
- NFR17: Color contrast ratios meet AA standards (4.5:1 for normal text, 3:1 for large text)
- NFR18: Image alt text provided for all non-decorative images including AI-generated previews

### Integration

- NFR19: AI facial analysis API integration with graceful fallback on provider outage
- NFR20: AI image generation API integration with timeout handling (90-second maximum wait)
- NFR21: Authentication provider integration (Google OAuth) with standard OAuth 2.0 flow
- NFR22: Cloud storage integration for photo uploads with signed URL access pattern

### Reliability

- NFR23: 99.5% uptime for the web application during operating hours
- NFR24: AI processing failure rate below 2% of total consultations
- NFR25: Zero data loss for completed consultations — results persisted before display
- NFR26: Automated health checks for AI provider connectivity with alerting on degradation

---

## Business & Monetization Model

### Revenue Model: Pay-Per-Consultation

| Tier | Price | What's Included |
|------|-------|----------------|
| **Free** | €0 | Face shape detection + basic explanation only |
| **First Consultation** | €5.99 | Full analysis, 2-3 recommendations, AI previews ("Ver como fico"), styles to avoid, barber reference card, styling tips, saved to history |
| **Repeat Consultation** | €2.99 | Same as above — new photo, fresh analysis |

**Rationale:**
- €5.99 anchor for first "wow" experience (12x margin on ~€0.50 AI cost)
- €2.99 repeat removes friction for returning (kills "one-time problem" objection)
- No subscription — male audience buys transactions, not commitments
- One-tap mobile payment (Apple Pay / Google Pay)

### Free Tier Strategy

Free face shape detection proves AI competence, creates desire (knowing your shape without knowing what to DO is incomplete), and requires no payment info.

### Future Add-ons (À La Carte)

| Feature | Price | Description |
|---------|-------|-------------|
| 🎨 Paleta de Cores | €3.99 | Color analysis — hair and clothing colors that suit skin tone + face shape |
| 👔 Estilo Completo | €9.99 | Full image consulting: hair + beard + glasses + clothing style |
| 📊 Evolução | €2.99 | Compare consultations over time — style evolution tracking |

### B2B2C — Barber/Salon SaaS (Phase 2)

Barbershops pay €29-49/month for branded integration: custom link, client pre-consultation data, booking CTA, trending styles dashboard. Positions mynewstyle as "barber's best friend" — helps clients communicate, doesn't replace barbers.

### Affiliate Revenue (Passive Layer)

Post-consultation product recommendations based on hair type + style. 5-15% affiliate commission. Natural, non-intrusive.

### Unit Economics

| Metric | Value |
|--------|-------|
| AI cost per consultation | ~€0.50 |
| Gross margin (first consultation) | 91.7% |
| Gross margin (repeat) | 83.3% |
| Break-even (covering €100/month infra) | ~20 consultations |

### Monetization Timeline

| Phase | Period | Action |
|-------|--------|--------|
| Validation | Month 1-2 | 100% free, validate PMF |
| Soft Launch | Month 3 | Introduce €5.99/€2.99 pricing |
| Upsells | Month 4-6 | Paleta de cores, estilo completo |
| Affiliate | Month 3+ | Product recommendations |
| B2B | Month 6-12 | Barber/salon SaaS |

### Payment Infrastructure

Stripe (EUR, BRL, global). Apple Pay + Google Pay. Pay after free face shape, before full consultation. Auto-refund on AI processing failure.
