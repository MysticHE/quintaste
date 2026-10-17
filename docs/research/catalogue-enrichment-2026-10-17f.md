**Owner review checkpoint, 17 October 2026:** `20261017-branch-hours9` is deployed and verified. Further research is paused. See [the branch checklist](review-checkpoint-2026-10-17.md) for all reviewed fields, remaining gaps and saved pending work.

# Gallery and hours coverage — 17 October 2026, batch f

**Deployed and live verified: `20261017-branch-hours9`**, based on `20261017-cook-cleanup2`.54covers and88schedules across174browse venues;120cover gaps and86hours gaps remain. Further research is paused at the user’s request; full coverage is not complete. Main cards open exact location details, Menu remains separate.

## New opening hours

- **research-boneless-irving**: Daily: 11:00–21:00. Business hours from the venue’s linked reservation page. [Source](https://tableagent.com/singapore/the-boneless-kitchen-korean/), checked17October2026. Direct operator homepage/reservation page links and embeds this exact TableAgent business.1IrvingPlace and84576464 match; Business Hours explicitly lists all7days11-21.17Oct captured source preferred over unclaimed Burpple12-21/Monclosed; Oddle11:30-20:45 is delivery only. No reservation made. Earlier hold resolved by stronger operator-linked business-hours evidence, not booking-slot inference.

- **research-merle-lentor-modern**: Mon–Thu: 09:30–21:00; Fri: 09:30–22:00; Sat: 08:30–22:00; Sun: 08:30–21:00. Business hours from the venue’s linked reservation page. [Source](https://tableagent.com/singapore/merle-co/), checked17October2026. Operator homepage directly links this exact TableAgent business, same1LentorCentral address and97578449. Business Hours explicitly statesAM opening. Operator locate-us page contains apparent9.30pm weekday typo (MonThu opening after closing), while linked reservation schedule and exact-branch secondary evidence agree09:30AM; weekdayAM not silently inferred from typo. Both captured17Oct. Earlier secondary-only hold resolved by operator-linked source.

- **research-egg-plant-marina-bay-source**: Mon–Fri: 11:00–20:00; Sat, Sun and public holidays: Closed. Last order 19:30. [Source](https://bythebay.com.sg/directory), checked17October2026. Actual property manager directory loads publicassets/includes/cache/retail.json. Exactegg.plantMBLM#B2-33row explicitly openingMonFri11am-8pm,last7.30pm,SatSunPHclosed. Captured17Oct. Landlord schedule preferred over conflicting secondary directories and delivery windows; hold resolved by exact primary tenant record.

## New covers

| Branch | Source and mapping |
| --- | --- |
| research-egg-plant-marina-bay-source | [Source](https://bythebay.com.sg/directory). Actual landlord directory publicly loads assets/includes/cache/retail.json. Exact egg.plant row bd741b07-d4d5-11f0-80af-545200000005 identifiesMBLM#B2-33 and associates this headerPicPath. Both directory and JSON checked17Oct. Food composition retained; no current stock/ingredient certification inferred. |
| research-tofu-g-waterway-point | [Source](https://www.tofug.sg/waterwaypoint). Dedicated operator Waterway Point page at83PunggolCentral#01-53 displays this reference. Original filename explicitly ChatGPT Image Jul27,2026; operator-supplied AI imagery, not independently verified physical-site photography. Enhancement retains operator scene. |
| research-tofu-g-suntec-city | [Source](https://www.tofug.sg/suntec). Dedicated operator Suntec page exact3TemasekBoulevard#B1-K5 displays this s2 reference. Other images on page have ChatGPT filenames; original production method of selected s2 is not independently known. No independent current-condition guarantee. |
| research-merle-lentor-modern | [Source](https://www.merleandco.com/). Operator homepage exact1LentorCentral#01-36 displays grilled-portobello-with-black-pepper-sauce image. Source captured16Oct and reviewed17Oct. Exact food arrangement retained; no ingredient/current availability inference. |
| research-daehwa-fusionopolis | [Source](https://daehwavegetarian.com/). Operator homepage exact1FusionopolisPlace#01-35 displays selected top-down vegetarian Korean meal spread. Source captured16Oct and reviewed17Oct; no transfer from affiliated BonelessKitchen branch. |
| research-baomaker-ang-mo-kio-447 | [Source](https://baomaker.com/). Operator ordering page explicitly lists fresh baos for447AngMoKioAvenue10#01-1675 and attaches selected reference to Char Siew Bun. Food/basket crop excludes poster title and badges; existing source attribution retained. No animal meat ingredient inference from dish name. |

Each original/output was visually compared. Six builtin imagegen enhancements are stored as hashed JPEGs in `server-assets/catalogue`; private originals, PNGs and prompts stay in `.local/coverage-2026-10-17`. Full source image URLs, hashes, dates and prompts are in [the JSON audit](../../data/menu-research/catalogue-enrichment-2026-10-17f.json). The Waterway operator reference explicitly has a ChatGPT filename; metadata preserves that fact and does not claim independent site photography. Baomaker retains the photographed food/basket and crops out poster text. Two image406 responses succeeded with one ordinary browser-header retry each; receipts retained. Source rights/attribution stay; enhancement does not establish a new licence.

## Verification and storage

All seven affected cards render locally, including six new covers and three hours additions. Main-card navigation reaches the exact location page and available schedule; Baomaker remains honestly unconfirmed. Menu search/40-row paging, catalogue/publication/register checks, three API load orders, clean export and module consistency pass. Source code is byte-identical to the prior TypeScript/scoped-lint verified release. All16API bundles come from the same export. Unrelated Cook source/assets are preserved by archive comparison.320pxdark/1440pxlight cache QA passes:13Greendot cards use four unique image requests, with none added on back navigation. No provider calls or runtime errors.

45unique JPEG assets total5,996,219bytes; new814,335bytes. Server catalogue index143,624bytes. Existing20summary pages, bounded image/summary/menu caches, account isolation, cancellation/deduplication and offline limits remain. Menus175IDs/223source menus/12084occurrences unchanged;2527food holds,109zero-foodbranches,1828unnamedIDs and8coordinateholds remain. Original44-file Google photo backup unchanged; exact MakanVegan/SoonLai screenshot images unrecovered.

Google research ledger2419/2500,81left; SHA256`c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. No duplicate extraction. Physical-device UI remains unverified.

Live acceptance passes all175menu fingerprints,174browse entries,88schedules,54photo metadata records,45asset hashes,204/304 responses,location boundaries,seven rendered cards and cache reuse. Exact web/Android/iOS transport and scope match. First20payload15076bytes; one sample53.2ms, not a benchmark. Transient memory/disk snapshots are in release evidence. Live Google counters100/8/19/545unchanged.

Archive811files,SHA256`5accba33fd87fb2b5b86021711267ace52e8f940f5e74117aecd1ecf4c6d444d`. Backup,zeroactivejobs and guarded promotion passed; rollback`deployment-backups/20261017-branch-hours9`. Onlyapp/preview changed;admin/database untouched. PackagedJSON/assets serve the VPS app; no PostgreSQL menu-table migration. Evidence`.local/coverage-2026-10-17f/release.json`.
