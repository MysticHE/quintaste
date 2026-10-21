# AI recipes pricing and paywall (research, 21 October 2026)

Owner request, 21 October 2026: research how a successful price model should be designed and displayed for better conversion, and enhance the AI Recipes plans screens. Confirmed prices: Starter S$9.99/month for 5 AI recipes, Pro S$24.99/month for 20. Payments are not connected (`paymentsLive = false`).

## 1. What the evidence says

| Finding | Evidence | Strength |
|---|---|---|
| Asking for payment before use (hard paywall) converts about 5× better than freemium: median day-35 conversion 10.7% vs 2.1%; revenue per install at day 60 US$3.09 vs US$0.38; first-year retention about the same (27% vs 28%) | RevenueCat State of Subscription Apps 2026 | Strong (large dataset) |
| Short trials lose people immediately: for 3-day trials, 55% of cancellations happen on day 0; 17–32 day trials convert 42.5% vs 25.5% for under 4 days | RevenueCat 2026 | Strong |
| AI apps earn more per payer in year 1 (median US$30.16 vs US$21.37) but churn faster; AI monthly plans retain 36% worse over 12 months | RevenueCat 2026 | Strong |
| South-East Asia converts lower than North America (median 1.4% vs 2.6% for this metric) | RevenueCat 2026 via secondary write-ups | Medium |
| The paywall works best at a moment of intent (right after the first value, or when a limit is hit), with a way to buy a little more instead of a hard stop | Practitioner guides (Superwall, Kinde, paywall CRO playbooks) | Medium (consistent, few controlled tests) |
| Pre-selecting the plan you want to sell, a "Best Value" label, and showing a price per unit move choice; judge tests on revenue per install, not conversion alone | Superwall, Adapty testing guides | Medium (vendor guidance) |
| A middle/anchor option shifts choice (decoy effect), but pushing people into a plan raises churn | Huber, Payne & Puto 1982; secondary summaries | Medium |
| For AI usage costs, a subscription with a monthly allowance plus top-ups (hybrid) beats pure credits or unlimited plans | Freemius, Vellum, Flexprice blogs | Medium (vendor) |
| App Store: billed amount must be the most prominent price; show title, length, price, and working links to Terms (EULA) and Privacy; Restore Purchases expected | Apple review rejections quoted on Apple developer forums | Strong for rejection risk |
| Singapore: a GST-registered business must show GST-inclusive prices everywhere (fine up to S$5,000) | IRAS | Strong |

## 2. What changed on the screens (built 21 October 2026, not deployed)

Owner direction after the first pass: a clean look, as few words as possible, no social platform names, no per-recipe figures, and a richer motion-led design.

- **Plans** (`/cook/ai-plans`): a gradient showcase where three real dishes fan out, the Mochi Chef pops in front and three sparkles appear (once, on opening); the heading "Any dish, ready to cook"; three one-word chips (Any dish, From videos, Nutrition); two plan tiles side by side (price large, "a month", recipe count), the chosen tile lifts with a check and Pro carries a "Best Value" ribbon (worked out from the prices); "Continue With AI Cook"; "Cancel anytime"; Privacy (and Apple's standard Terms of Use on iOS).
- **Checkout** (`/cook/ai-checkout`): a ticket card that rises in: gradient top with the plan, the billed amount largest and the Mochi Chef; Pay with, Renews (date), Cancel: Anytime; Subscribe ends in "Payments Aren't Open Yet · Nothing was charged".
- **AI Recipes** (`/cook/ai`): a gradient card "AI Recipes Plan · N of 3 today" with three dots that fill in turn (opens Plans); "Describe A Dish" and "From A Video" cards that rise in; "Paste a video link"; one limits line "Up to 20 min · 60 MB · Public videos"; "AI-written · Not kitchen-tested". At the daily limit or when everyone's total is used, a notice explains it and the buttons are off.
- Motion plays once per opening, nothing loops, and everything holds still with reduced motion (`src/components/recipes/AiShowcase.tsx`). Restore Purchases appears only once payments are live.

## 3. Recommended price model (owner decisions)

1. **Keep two monthly tiers** (confirmed). Lead with AI Cook selected; Pro anchors value through the cheaper price per recipe.
2. **No free tier** (owner decision, 21 October 2026): AI recipes are a paid feature; the screens carry no "free" wording. Until payments open, the server keeps its existing daily limit of 3 so costs stay bounded.
3. **Add a top-up for subscribers who run out**: for example +5 recipes for S$4.99 (one-time). Research favours "buy a little more" over forcing an upgrade at the limit.
4. **Consider annual plans later**, not at launch: annual cancellations in year 1 rose to about 72% (RevenueCat 2026), and the existing QuinTaste Plus plan already uses about 33% off for annual (S$5.98 / S$39.98). If added, mirror that discount (for example AI Cook S$79.99 a year) and test it on revenue per install.
5. **Avoid two separate subscriptions**: QuinTaste Plus (nutrition, S$5.98, not built) and AI Cook would ask members to pay twice. Recommended: one Plus family where AI recipes are the allowance that differs by tier.
6. **Prices and GST**: App Store and Google Play collect Singapore GST and show tax-inclusive store prices; if QuinTaste is GST-registered, every price shown in the app and on the web must be GST-inclusive. Confirm registration before the web card checkout.
7. **Before payments go live**: a Terms of Use page (Android and web; iOS can use Apple's standard EULA), a public privacy policy URL, store products for each plan, server receipt validation, and the monthly allowance check (see `docs/COOK_DISCOVERY_PLAN.md` §6).
8. **Measure**: plans-screen views, plan chosen, subscribe taps, revenue per member at day 30; test one change at a time (default plan, free allowance size) and judge on revenue, not taps.

## Sources

- RevenueCat, [State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) and [the 10-minute summary](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- Adapty, [State of in-app subscriptions 2025](https://adapty.io/reports/state-of-in-app-subscriptions-2025/) and [paywall A/B testing guide](https://adapty.io/blog/ab-testing-guide-part-1-how-to-approach-split-testing-and-avoid-mistakes)
- Superwall, [How to A/B test a paywall](https://superwall.com/blog/how-to-ab-test-a-paywall) and [paywall growth levers](https://superwall.com/blog/the-paywall-growth-lever-framework-how-to-build-smarter-experiments-faster)
- Kinde, [Freemium to premium for AI tools](https://kinde.com/learn/billing/conversions/freemium-to-premium-converting-free-ai-tool-users-with-smart-billing-triggers/)
- Freemius, [AI app pricing models](https://freemius.com/blog/ai-app-pricing-model/); Vellum, [Why subscriptions beat credits](https://www.vellum.ai/blog/why-subscriptions-beat-credits-for-ai-products)
- Apple developer forums on guideline 3.1.2: [thread 813493](https://developer.apple.com/forums/thread/813493), [thread 768364](https://developer.apple.com/forums/thread/768364)
- IRAS, [GST-registered businesses must display GST-inclusive prices](https://www.iras.gov.sg/news-events/newsroom/gst-registered-businesses-must-display-gst-inclusive-prices)
