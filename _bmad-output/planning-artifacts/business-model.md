# Business Model — mynewstyle

**Date:** 2026-03-01

---

## Revenue Model: Pay-Per-Consultation

### Core Pricing

| Tier | Price | What's Included |
|------|-------|----------------|
| **Free** | €0 | Face shape detection + basic explanation. Hook, not enough to act. |
| **First Consultation** | €5.99 | Full analysis, 2-3 recommendations with justifications, AI previews ("Ver como fico"), styles to avoid, barber reference card, styling tips, saved to history forever |
| **Repeat Consultation** | €2.99 | Same as above — new photo, fresh analysis, updated recommendations |

### Why This Pricing Works

- **€5.99 first** = anchor price, feels fair for full discovery experience, 12x margin on ~€0.50 AI cost
- **€2.99 repeat** = removes friction for coming back, kills the "one-time problem" objection
- **No subscription** = male audience buys transactions, not commitments
- **One-tap payment** = Apple Pay / Google Pay on mobile, impulse-buy friendly

### Free Tier Strategy

Free face shape detection serves three purposes:
1. **Proves AI competence** — user sees "the AI actually understands my face"
2. **Creates desire** — knowing your face shape without knowing what to DO about it is incomplete
3. **Zero-risk trial** — no payment info needed to experience value

---

## Future Add-ons (À La Carte)

| Feature | Price | Description | AI Cost |
|---------|-------|-------------|---------|
| 🎨 Paleta de Cores | €3.99 | Color analysis — hair colors, clothing colors that suit skin tone + face shape | ~€0.20 |
| 👔 Estilo Completo | €9.99 | Full image consulting: hair + beard + glasses shape + clothing style | ~€0.80 |
| 🔄 Re-consultation | €2.99 | New photo with existing profile data (faster, cheaper) | ~€0.40 |
| 📊 Evolução | €2.99 | Compare consultations over time — style evolution tracking | ~€0.15 |

### Upsell Flow

```
Free (face shape) → €5.99 (first consultation) → €3.99 (paleta de cores upsell on results page)
                                                → €2.99 (repeat consultation in 4-6 weeks)
                                                → €9.99 (estilo completo bundle)
```

---

## B2B2C — Barber/Salon SaaS (Phase 2, Month 6-12)

**Model:** Barbershops pay €29-49/month for branded mynewstyle integration.

**What barbers get:**
- Custom link: `mynewstyle.com/barbershop-name`
- Clients do consultation → results include "Agendar neste salão" CTA
- Barber sees client's face shape + recommended cut BEFORE appointment
- Dashboard: trending styles among their clients

**What mynewstyle gets:**
- Recurring B2B revenue
- Barbers as distribution channel (they share link with clients)
- Each barbershop = organic acquisition channel

**Positioning:** "Barber's best friend" — helps clients communicate clearly, NOT a replacement.

---

## Affiliate Revenue (Passive Layer, Month 3+)

After consultation, recommend specific hair products based on hair type + recommended style.

- 5-15% affiliate commission per sale
- Natural part of the consultation (not intrusive ads)
- Revenue estimate: €0.50-2.00 per consultation at 20-30% click-through

---

## Unit Economics

| Metric | Value |
|--------|-------|
| AI cost per consultation | ~€0.50 |
| First consultation revenue | €5.99 |
| Repeat consultation revenue | €2.99 |
| Gross margin (first) | 91.7% |
| Gross margin (repeat) | 83.3% |
| Break-even consultations/month (covering €100 infra) | ~20 |

---

## Revenue Projections

### Conservative (Month 6)

| Stream | Volume | Revenue |
|--------|--------|---------|
| First consultations | 500/month | €2,995 |
| Repeat consultations | 150/month | €448 |
| Paleta de cores | 100/month | €399 |
| **Total** | | **€3,842** |

### Growth (Month 12)

| Stream | Volume | Revenue |
|--------|--------|---------|
| First consultations | 3,000/month | €17,970 |
| Repeat consultations | 1,000/month | €2,990 |
| Paleta de cores | 800/month | €3,192 |
| Estilo completo | 200/month | €1,998 |
| B2B barbershops | 50 × €39 | €1,950 |
| Affiliate | passive | €500 |
| **Total** | | **€28,600** |

---

## Monetization Timeline

| Phase | Period | Action |
|-------|--------|--------|
| Validation | Month 1-2 | 100% free. Validate PMF. Track completion + share rates. |
| Soft Launch | Month 3 | Introduce €5.99/€2.99 pricing. Free tier = face shape only. |
| Upsells | Month 4-6 | Add paleta de cores, estilo completo add-ons. |
| Affiliate | Month 3+ | Product recommendations in results. |
| B2B | Month 6-12 | Barber/salon SaaS partnerships. |

---

## Payment Infrastructure

- **Provider:** Stripe (supports EUR, BRL, global cards)
- **Methods:** Credit/debit card, Apple Pay, Google Pay
- **Flow:** Pay AFTER free face shape → before full consultation generates
- **Receipts:** Email receipt with consultation summary
- **Refunds:** Auto-refund if AI processing fails completely
