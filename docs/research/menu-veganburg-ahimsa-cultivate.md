# VeganBurg, Ahimsa and Cultivate

Checked 15 October 2026. [Research manifest](../../data/menu-research/menu-veganburg-ahimsa-cultivate.json) links three independent source packets with **161 food records**. This includes overlapping ordering/PDF sources and 20 older brand-only event choices; it is not a unique-dish or current-stock count.

| Location | Food records | Available-source coverage and gap |
| --- | ---: | --- |
| VeganBurg Eunos, 44 Jalan Eunos | 38 | All eligible dishes from the 83-product ordering catalogue. Food portions, modifiers, bundle sizes and source availability retained. Forty-five drinks, beverage meals, gift/merchandise retail and standalone condiments excluded. |
| VeganBurg Woodleigh, 11 Bidadari Park Drive #01-37 | 0 | Embedded record disables pickup/delivery; absent from the rendered store list and current official Singapore locator. Current operation remains unresolved. Eunos menu is not transferred; no permanent-closure inference. |
| Ahimsa Sanctuary, 76 Neil Road | 39 | All food names/base SKUs from 88 public guest catalogue products; 49 drinks excluded. Thirty-seven detail previews captured through normal UI. Details/options for “mamamia!” and “fishy bites” remain unread after one bounded recovery pass. |
| Cultivate, Maxwell Reserve, 2 Cook Street | 64 current-linked + 20 older brand-only | Twenty-eight ordering entries, 28 separately priced PDF entries and eight set-lunch food choices. Twenty older event-canapé choices remain held without a current branch assignment. |

## Scope and qualifications

VeganBurg's current official locator confirms Eunos and separately lists an overseas restaurant; no overseas menu was imported. Ready-to-eat burgers, wraps, side dishes, desserts and food-only event platters remain. Beverage-inclusive meal prices are excluded rather than represented as food-only prices. Bundle prices are not divided into individual-burger, per-box or per-person prices. Conditional option amounts retain their `priceUnderMinimumSelection` field: included selections are not automatically treated as extra charges. Source allium/vegan option names are retained as names, without setting ingredient or allium certification.

Ahimsa's merchant-linked ordering page permits **Continue without Logging In → Take Away → pickup-time confirmation**. This only selects viewing context; no cart addition or order was attempted. All 12 category controls were visited. The original pass captured 31 food details; scrolling the normal menu recovered another six. Two remaining previews produced no readable detail response, so their options remain unknown. Food bowls and overnight oats are included; drink smoothies and zero-calorie placeholders are excluded. SGD appears explicitly in the rendered menu.

Cultivate's current homepage links September 2026 food PDFs, but PDF metadata says “Temporary Menu (Aug)” and no effective end date is stated. Online prices explicitly use SGD; PDF dollar amounts without a currency code remain separate unknown-currency facts. Gelato flavours and the daily soup identity are unnamed. Set-lunch course pairing is unspecified and one dish-title/description conflict remains. Older July 2025 event choices have currentness holds in both the menu notice and branch gaps.

## Evidence and checks

- [VeganBurg official locator](https://www.veganburg.com/location), [ordering foods](https://veganburg.oddle.me/en_SG/) and [store](https://veganburg.oddle.me/stores).
- [Ahimsa official site](https://www.ahimsacommunityysg.com/) and its [public guest menu](https://smartweb-ecms.tabsquare.com/scan/39e28049-4d8c-4061-86d6-d3b0e39501ab).
- [Cultivate official site](https://cultivatecafe.sg/) and [ordering menu](https://cultivate.oddle.me/en_SG).

Managed headless Chromium category audits, observed public menu/detail responses, food-price inventories and actual food modals are preserved in private scratch evidence. Source IDs, exact branch ownership, menu rows, portion prices, modifier constraints, availability and dated publication holds are checked locally. Unread detail options are explicit gaps. No private endpoint replay, login bypass, Google API call, allowance change, installed Chrome session, merchant outreach or automatic app publication occurred.

The saved Cultivate packet was preserved when collection workers hit their account limit; the VeganBurg/Ahimsa packets were recovered from their saved captures and the bounded Ahimsa UI recovery. Collection across all 2,322 stored IDs remains in progress.
