# SFA-licensed food businesses selling via a third-party app: rules and seller verification (Singapore, as of 17 October 2026)

Scope: seller type (a), verified SFA-licensed food businesses only. Home-based food businesses are covered in a separate note. Research date: 17 Oct 2026. Primary government sources are preferred; commentary is labelled. "UNVERIFIED" marks anything that could not be confirmed against a primary source. Several SFA pages show two dates (an in-body "Last Updated" date and a site-wide footer date of 16 or 17 Oct 2026); the in-body date is the page-specific one.

Method notes: the SFA e-commerce guideline PDF, SFA's *A Guide to Food Labelling and Advertisements* PDF and the SFA catered-meals PDF were downloaded and their text extracted. FSSA 2025 text (Part 1, Part 4, the First Schedule and the table of contents) was read directly from Singapore Statutes Online (SSO). The data.gov.sg catalogue was crawled through its public v2 API (`/v2/public/api/datasets?page=N`, about 400 pages) to find every SFA- or food-licence-related dataset. The MUIS halal directory and its Verify page were inspected through their public HTML and JavaScript. Some sites blocked automated fetches (SSO after several requests, ask.gov.sg, gobusiness.gov.sg via WebFetch, Malay Mail); those gaps are noted where they apply.

---

## 1. Which SFA licences and registrations exist, what does each permit, and how do they apply to online sales and delivery?

### Takeaway
Today, SFA licenses premises-based activities, not the act of selling online. Retail: Food Shop, Food Stall, Supermarket, Temporary Fair. Manufacturing and storage: food processing establishment, cold store, slaughterhouse, plus a free food storage warehouse registration. Trade: import, export and transhipment licences or registrations. An online seller needs a licence only if it imports, or if it prepares or handles food at physical premises. Pure resellers of prepacked food and intermediary platforms need no SFA licence. Licensed businesses may not source food from unlicensed home-based or online businesses.

### Cited Findings
**Retail licences (SFA food-retail page, in-body update 01 Sep 2026)**
- **Food Shop Licence** ($195/yr, 1 yr). Covers restaurants, caterers, coffeeshops, canteens (including third-party-run staff canteens), food courts, takeaway kiosks, herbal-tea medicine halls, standalone raw-meat butcher shops, private markets, mobile food wagons with full kitchens, pet cafés and certain vending machines. Caterers are licensed under it, not under a separate catering licence. — [SFA: Businesses that need licence/permit for food retail](https://www.sfa.gov.sg/food-retail/licence-permit/businesses-that-need-licence-permit-for-food-retail)
- **Food Stall Licence** ($32/yr or $64 for 2 yrs; $13/yr for school canteen stalls). Covers individual stalls inside multi-unit food shops (food courts, canteens, coffeeshops, private markets) and stalls in third-party-managed hawker centres. NEA-managed hawker stalls are handled through the NEA tenancy, with no separate SFA application. — [SFA retail licensing page](https://www.sfa.gov.sg/food-retail/licence-permit/businesses-that-need-licence-permit-for-food-retail)
- **Supermarket Licence** ($250/yr under 200 m², $500/yr above). Needed only if the store sells raw meat or seafood or prepares food on site. Shops selling only prepacked food (e.g. minimarts) need no SFA retail licence. — [SFA retail licensing page](https://www.sfa.gov.sg/food-retail/licence-permit/businesses-that-need-licence-permit-for-food-retail)
- **Temporary Fair Permit** ($60), plus Temporary Fair Food Stall Licences at no extra fee. — [SFA retail licensing page](https://www.sfa.gov.sg/food-retail/licence-permit/businesses-that-need-licence-permit-for-food-retail)
- **Exempt or unlicensed today:**
  - food not for sale (e.g. charity kitchens)
  - supermarkets selling only prepacked food from SFA-licensed processors or importers
  - market stalls selling lower-concern food such as prepacked items (no SFA licence from 1 Jan 2025)
  - home-based food businesses and online food businesses acting only as intermediaries
  - in-house staff canteens giving free meals
  - hostel kitchens for students' own use

  The same page says operating a food retail business without an SFA licence is an offence, licences are not transferable, and **licensed businesses may not source food from these unlicensed businesses**. — [SFA retail licensing page](https://www.sfa.gov.sg/food-retail/licence-permit/businesses-that-need-licence-permit-for-food-retail)
- Eligible Food Shop applicants: Singapore citizens, PRs, societies registered with MHA, or ACRA-registered entities. This comes from a search summary of SFA pages; the eligibility sentence was not seen in the fetched page body. — [SFA food stall licence page](https://sfa.gov.sg/food-retail/licensing-permits/food-stall-licence)

**Manufacturing and storage (SFA page, in-body update 24 Aug 2026)**

All licences are valid 1 year, with a $147.20 application fee.

| Type | Licence fee |
|---|---|
| Cold store (meat and seafood) | $260 |
| Meat and fish processing | $260 |
| Other processed food, small (<200 m²) | $180 |
| Other processed food, medium (200–750 m²) | $360 |
| Other processed food, large (>750 m²) | $600 |
| Hermetically sealed heat-treated meat/fish | $840 |
| Poultry slaughterhouse | $1,000 |
| Livestock slaughterhouse | $4,000 |
| Food storage warehouse registration (non-meat/fish) | Free; encouraged for traceability |

In-principle approval is valid 3 years. — [SFA: Application process & fees for food manufacturing/storage licences](https://www.sfa.gov.sg/food-manufacturing-storage/licence-registration/application-process-fees-for-licence-registration-for-food-manufacturing-storage)
- Applications go through GoBusiness. Applicants must first be ACRA-registered. Cold stores, processing plants and slaughterhouses should be in a food zone or compatible industrial area. — [SFA licence & registration (manufacturing/storage)](https://www.sfa.gov.sg/food-manufacturing-storage/licence--registration) (search-result summary of SFA page)

**Import trade**
- Meat and fish need a *Licence for Import/Export/Transhipment of Meat and Fish Products* (S$84/yr). Fresh fruit and vegetables need a licence under the Control of Plants Act (S$378/yr). Processed food and food appliances need a free *Registration to Import Processed Food Products and Food Appliances*. Every consignment also needs a TradeNet permit. Figures come from a search summary of SFA pages. — [SFA: Licence/permit/registration for import & export](https://www.sfa.gov.sg/food-import-export/licence-permit-registration); [SFA fees page](https://www.sfa.gov.sg/food-import-export/licence-permit-registration/application-process-fees-for-licence-permit-registration-for-import-export)
- "Food importers… must obtain either a licence or register with the SFA and apply for an import permit (cargo clearance permit)". "All commercial food imports that enter Singapore must be brought in by licensed/registered traders". Food brought in by travellers or parcel post is "only allowed for personal consumption and not for sale". — [SFA Guidelines for food sellers selling food online via e-commerce platforms (updated as at 20 Sep 2021)](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)

**How licensing applies to online sales (SFA guidance)**
- "Online food businesses may require relevant licences from SFA based on the nature of their business activity". Importing (e.g. meat for online sale) needs an import licence. A physical shop that handles, cooks or processes food needs a food shop licence. Reselling food from a local distributor with no handling and no physical store needs no licence. Sellers must still obtain food "from SFA-regulated sources". The page was updated 19 Feb 2025. — [SFA: Requirements for online food sellers](https://sfa.gov.sg/food-retail/online-food-businesses/requirements-for-online-food-sellers)
- E-commerce platforms acting as intermediaries "do not carry out any handling, cooking or other forms of food processing. Hence, they do not require a licence from SFA". — [SFA: Requirements for online food sellers](https://sfa.gov.sg/food-retail/online-food-businesses/requirements-for-online-food-sellers) (from search-result extract of the SFA page)
- The 2021 FAQ: "Food sellers that operate as businesses at physical premises (e.g. restaurants, cafés, supermarkets, food manufacturers) are required to have a licence". HBFBs and those who "purchase food products from licensed wholesalers/importers and resell them via e-commerce platforms" are not, but remain subject to the Sale of Food Act (SOFA) and the Environmental Public Health Act (EPHA). — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- The guideline applies to "bricks and clicks", online marketplaces, social media platforms and food delivery platforms. A "food seller" includes importers, distributors, manufacturers, producers, packers, retailers and food retail establishment operators. — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- SFA's "Businesses that currently do not need licence/permit" section lists online food sellers (platforms and resellers), group-buy organisers, food delivery services and home-based food businesses. "All types of food businesses, whether online or physical, must comply with prevailing food laws". In-body update 10 Mar 2025. — [SFA: Businesses that currently do not need licence/permit](https://sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit)

**Business types that appear in SFA's own categorisation (SAFE framework)**
- Category 1: restaurants with kitchens ≥16 m², caterers, central kitchens, food processing establishments and slaughterhouses. Category 2: restaurants with kitchens <16 m², cold stores, takeaways, supermarkets, **bakeries**, bars, **cloud kitchens**, food stalls, vending machines, mobile food wagons and food carts. — [SFA: Understanding the SAFE framework](https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines/understanding-the-safety-assurance-for-food-establishments-framework)

### Inferences
- App-selling businesses map to licences roughly as follows: cafés, restaurants, takeaways, cloud kitchens, retail bakeries with kitchens and caterers hold Food Shop (or Food Stall) licences. Packaged-food makers supplying other businesses hold food processing establishment licences. Importers hold import licences or registrations. A licence covers premises and activity; there is no separate "online sales" licence.
- Under the new QuinTaste rule ("only SFA-licensed businesses"), some lawful sellers would be excluded because SFA does not license them. Examples: minimarts selling only prepacked food, pure online resellers sourcing from licensed distributors, and lower-concern market stalls. This is a product-policy choice, not a legal requirement.
- A packaged-food producer licensed as a food processing establishment and a processed-food importer are both "SFA-regulated" but cannot be checked the same way. The second has a trade registration that does not appear in establishment track records (see Section 3).
- Because licensed businesses may not source from HBFBs or unlicensed online businesses, the platform should not let a licensed seller list resold HBFB products under its licence.

### Gaps
- SFA farm licences (local farms selling produce online) were not researched.
- The exact current statutory basis for retail licences was not confirmed from statute text in this research. It is presumably the EPHA and its food hygiene regulations; the 2021 guideline cites SOFA/EPHA obligations generally.
- No current SFA page states whether a Food Shop licence condition restricts delivery radius or online channels; no such restriction was found.
- Fees and eligibility for Food Stall and import licences are from search-result summaries of SFA pages, not fetched page bodies.

---

## 2. Licensed caterers and cooked-food delivery: temperature, consume-by limits and time-stamp labelling

### Takeaway
Licensed caterers must time-stamp every catered packed meal, tingkat and buffet. This has been mandatory since 15 Feb 2012. The "CONSUME BY" time may be no later than 4 hours after the food is cooked or ready-to-eat and held between 5 °C and 60 °C. The stamp carries the caterer's name and licence number. Delivery of ready-to-eat (RTE) food must keep hot or cold chains; the delivery standard SS 672:2021 is voluntary.

### Cited Findings
- "No food should be kept at room temperature for more than 4 hours from the time it was cooked at the caterer's kitchen to the time it is consumed". "Always keep hot food hot above 60 °C and cold food cold below 5 °C". — [SFA Guidelines for Ordering Catered Meals for Functions and Events (updated as at 31 May 2019)](https://sfa.gov.sg/docs/default-source/food-retail/guidelines-for-ordering-catered-meals-for-functions-and-events.pdf)
- A time-stamp label on the packed meal, or a sign for each buffet table, "is a mandatory requirement with effect from 15 February 2012". The "CONSUME BY" time "should not be later than 4 hours from the time the food is cooked or ready-to-eat and kept between 5 °C and 60 °C". Removing or altering the sign "is an offence". — [SFA catered-meals guideline, 31 May 2019](https://sfa.gov.sg/docs/default-source/food-retail/guidelines-for-ordering-catered-meals-for-functions-and-events.pdf)
- The guideline also advises delivery at most 1 hour before meal time, hot boxes above 60 °C, coolers below 5 °C, and raw seafood delivered chilled below 5 °C. It says to "Engage only licensed food caterers", pointing to a list on SFA's website. — [SFA catered-meals guideline, 31 May 2019](https://sfa.gov.sg/docs/default-source/food-retail/guidelines-for-ordering-catered-meals-for-functions-and-events.pdf)
- Time-stamp format rules:
  - lettering at least 3 mm on packed meals and tingkat
  - signs at least A4 with lettering of at least 10 mm for buffets
  - the stamp includes the company name and licence number

  These come from search-result extracts of SFA consumer postcards and posters. — [SFA time-stamping postcard](https://www.SFA.gov.sg/docs/default-source/our-services/postcard-on-time-stamping-for-consumers_chi-compressed.pdf); [SFA poster 688a](https://www.SFA.gov.sg/docs/default-source/our-services/688a_nea_444x420_eng_mandarin.pdf)
- RTE delivery: hot or cold chains "should be maintained… for the duration of the delivery". Outlets should "pack RTE meals in a clean and sanitised area, separated from raw food". SS 672:2021 (*Guidelines on the delivery of RTE food*) is "not mandatory" and applies to self-delivery by outlets, freelance riders and delivery companies. Delivery workers need not attend WSQ Food Safety Course Level 1. Page updated 24 Oct 2024. — [SFA: Requirements for food delivery businesses](https://www.sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit/food-delivery-businesses/requirements-for-food-delivery-businesses)
- Food being delivered must be transported hygienically. Vehicles must be clean, and receptacles must prevent contamination. Sellers should keep perishables at appropriate temperatures. — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- **FSSA 2025 (not yet in force for licensing).** The First Schedule lists catering as its own licensable retail class: food prepared and served away from the business's premises under an agreement fixing type, number of people, time and cost. Takeaway and delivery from premises "(but not a home)" is a separate class (Part 1 item 4). Commissary or central kitchens are non-retail item 7. — [FSSA 2025, First Schedule (SSO)](https://sso.agc.gov.sg/Act/FSSA2025?ProvIds=P14-,Sc1-)
- Enforcement example: Gourmetz Pte Ltd, a food supplier linked to 45 gastroenteritis cases at a primary school in Jan 2026, was fined $13,000 on 9 Oct 2026. Offences included food storage violations and false food labelling, under SOFA, the Sale of Food (Non-Retail Food Business) Regulations and the Food Regulations. — [SFA newsroom, 9 Oct 2026](https://www.sfa.gov.sg/news-publications/newsroom/gourmetz-pte-ltd-fined--13-000-for-food-safety-lapses)

### Inferences
- For caterer listings, QuinTaste could show the caterer's licence number and add a consume-by expectation ("Consume within 4 hours of ready time") to catered-order confirmations. Scheduling should not allow delivery windows that make the 4-hour rule hard to meet, for example delivery more than 1 hour before the event.
- The 4-hour time-stamp rule is stated for catering. SFA does not impose a numeric delivery time limit on ordinary restaurant delivery; it relies on hot or cold chain maintenance and SS 672.

### Gaps
- The catered-meals guideline is dated 31 May 2019, and its "list of SFA-licensed caterers" URL is the old licences page. Track Records (Section 3) appears to have replaced it, but no newer catering guideline was found.
- The legal instrument making time-stamping mandatory (licence condition versus regulation) was not confirmed.
- SS 672:2021 and SS 687:2022 are paid standards. Their numeric delivery temperatures and time limits were not accessed.

---

## 3. Public licence lookups and registers (Track Records, SAFE grades, GoBusiness, data.gov.sg)

### Takeaway
The authoritative public check is SFA's **Track Records for Licensed Food Establishments** web tool. It can be searched by licence number, business name, licensee name, address, postal code, food business type, grade and suspension in the past year. It shows licence number, licensee, business name, address, food business type and SAFE grade, and exports to Excel or PDF. It has **no API, no UEN field, and no expiry date or demerit points** in results. SFA licences carry a QR code that resolves to the grade record. data.gov.sg no longer hosts any SFA-managed licence dataset: the grading datasets return "does not exist", and the only licence-level dataset is a stale 2016 NEA snapshot. GoBusiness has a "Verify an Entity's Licence" tool, but it requires login and its SFA coverage is unverified.

### Cited Findings
- **Track Records tool.** Search fields: Postal Code, Establishment Address, Licence Number, Business Name, Licensee Name, Type of Food Business, Grade (All, A, B, C, New, Not Under SAFE, "Under Review" variants) and a checkbox for "licences suspended in the past year". At least one field is required.
  - Result columns: S/N, Establishment Address, Grade, Licence Number, Licensee Name, Business Name, Type of Food Business.
  - Exports to Excel and PDF; no API is mentioned.
  - Renewals appear "within 3 working days after the expiry date", and grade changes within 3 working days of the effective date.

  — [SFA: Track Records](https://www.sfa.gov.sg/tools-and-resources/track-records)
- The tool covers licensed establishments "such as food stalls, caterers and food manufacturers". — [SFA: Track Records](https://www.sfa.gov.sg/tools-and-resources/track-records); [SFA staging copy](https://www.stg.sfa.gov.sg/track-records-for-licensed-food-establishments)
- **SAFE framework (Phase 1 from 19 Jan 2026).** It replaced the previous grading decals.
  - Grades: A means no major lapse for more than 3 years (Category 1 can fast-track with 1 year plus an Advanced Food Hygiene Officer and a certified Food Safety Management System); B means 1–3 years; NEW means under 1 year in operation; C means a major lapse.
  - A "major lapse" is a Points Demerit System suspension (12 points within 12 months) or a court conviction for food safety offences.
  - Main operators of canteens, coffeeshops, food courts and private markets are excluded, as are market stalls selling raw produce.
  - Grades are published on Track Records or via "the QR code on the establishment's SFA licence". Phase 2 details are due "by 2027".

  — [SFA: Understanding the SAFE framework](https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines/understanding-the-safety-assurance-for-food-establishments-framework); commentary: [Rajah & Tann Asia](https://www.rajahtannasia.com/viewpoints/sfa-implements-new-safety-assurance-for-food-establishments-safe-framework-to-enhance-food-safety-phase-1-commences-on-19-january-2026/)
- **QR code on expired licences.** A 2023 SFA enforcement release reportedly says that once a licence expires, scanning its QR code shows "Record not found". This is UNVERIFIED: it comes from a search-result summary, and the release URL returned 404 when fetched. — [SFA release (as indexed)](https://sfa.gov.sg/newsroom/press-releases/enforcement-action-taken-against-14-food-establishments-for-operating-without-a-valid-licence)
- **SFA's own guidance for online listings.** For non-prepacked food sold online, sellers "are encouraged to display… SFA licence/registration number (where applicable)" and "Grading details (where applicable)". — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- **GoBusiness.** The Licences page lists "Verify an Entity's Licence" (link: `https://dashboard.gobusiness.gov.sg/verify-licence`) marked "Login Required". The tool is a JavaScript single-page app; its search keys and agency coverage could not be inspected. — [GoBusiness: About business licences](https://www.gobusiness.gov.sg/licences/) (page HTML retrieved 17 Oct 2026); [GoBusiness FAQ: find approved licences](https://www.gobusiness.gov.sg/dashboard-faqs/find-approved-licences)
- **data.gov.sg (verified via the v2 API on 17 Oct 2026):**
  - "Certificate Grading Info of Licensed Eating Establishments" (`d_996c0e2023d90266cb62ce67f0a28970`, GeoJSON/KML), "Licensed Food Establishments By Grade" (`d_203c698549799927dd74aed8d226528b`) and "Licensed Food Factories" (`d_3995b7317bd9b550f814b117efde0097`) all return `DATASET_DOES_NOT_EXIST` from `api-production.data.gov.sg/v2/public/api/datasets/{id}/metadata`. Search engines still index their old pages. — [data.gov.sg dataset page (indexed)](https://data.gov.sg/datasets/d_996c0e2023d90266cb62ce67f0a28970/view); [data.gov.sg grade dataset (indexed)](https://data.gov.sg/datasets/d_203c698549799927dd74aed8d226528b/view)
  - A crawl of the full active catalogue (`/v2/public/api/datasets?page=1..400`) found **no dataset managed by the Singapore Food Agency**. — [data.gov.sg datasets API](https://api-production.data.gov.sg/v2/public/api/datasets)
  - The only licence-level dataset is **"List of NEA Licensed Eating Establishments"** (`d_227473e811b09731e64725f140b77697`), managed by NEA, coverage ending 6 Sep 2016, metadata updated 6 Jun 2024, 36,687 rows. Fields: `licensee_name`, `licence_number` (e.g. "W99288X000"), `premises_address`, `grade`, `demerit_points`, `suspension_start_date`, `suspension_end_date`. It predates SFA's formation and is stale. — [data.gov.sg datastore API](https://data.gov.sg/api/action/datastore_search?resource_id=d_227473e811b09731e64725f140b77697&limit=2)
  - Aggregate-only datasets: "Licensed Food Establishments (End Of Period), Annual" (SingStat, `d_a9e81ab29216b10b69e23e7957b680b9`, to 2025); NEA "Licensed Food Shops" (to 2014); "Licensed Food Establishments by Category, Annual" (`d_dbf37846568f6a5595b4f16f110b4619`, NEA, metadata updated 6 Jun 2024). HPB "Healthier Caterers (GEOJSON)" (`d_a93d46bbf91f3a9126a2e08a1982d5ad`, updated 4 Jan 2026) lists HPB-programme caterers, not licences. — [data.gov.sg datasets API](https://api-production.data.gov.sg/v2/public/api/datasets)
- Some data.gov.sg pages showed a notice that "Rate limits will be enforced on 31 December 2025". This is UNVERIFIED (search-result snippet). — [data.gov.sg](https://data.gov.sg/dataset/licensed-food-establishments-by-grade)

### Inferences
- The practical verification workflow is manual or semi-manual. Collect the SFA licence number, licensee name, business name and premises address, plus a photo or PDF of the licence showing the QR code. Then confirm in Track Records that a record exists with matching licence number, licensee, address and type of food business, and check the "suspended in past year" filter. Re-check periodically and at renewal; licences are 1-year, and renewals appear within 3 working days after expiry.
- Track Records has no expiry dates and no UEN. To link a licence to a legal entity, compare Licensee Name with the ACRA entity name (Section 4).
- SAFE grade "C" (a major lapse in the past) or a recent suspension could trigger heightened review rather than automatic rejection. That is a policy choice.
- Automated scraping of Track Records or GoBusiness was not assessed against those sites' terms of use. Treat it as requiring permission; the safer default is manual review with saved evidence.
- There is no public register of SFA **import** licences or registrations found. Importer sellers would need document-based verification, such as a licence or registration letter or TradeNet permit details. Ask SFA whether a verification channel exists.

### Gaps
- No public SFA API or bulk dataset of current licences was found. Track Records has no documented machine interface.
- The current SFA licence number format was not confirmed. The NEA-era format (e.g. W99288X000) may differ.
- The GoBusiness "Verify an Entity's Licence" search keys, its coverage of SFA licences, and whether login means Singpass, Corppass or either, could not be inspected.

---

## 4. ACRA BizFile / UEN verification: free checks and APIs

### Takeaway
UEN, entity name, entity type, status (e.g. Live or Struck Off), registration date, address and SSIC activity codes are free in bulk on data.gov.sg. That data is updated monthly, latest 14 Oct 2026, under the Open Data Licence. Single lookups are free on Bizfile and uen.gov.sg. Officer and owner details need a paid Business Profile ($5.50 each) or a paid ACRA API Marketplace subscription. The Business Profile API has been live since 18 Nov 2025. Myinfo Business, via a Corppass login, gives consented, government-verified entity data but no licence data.

### Cited Findings
- **data.gov.sg collection "ACRA Information on Corporate Entities"** (collection 2). "Updated monthly… 27 CSV files, one for each letter… and an 'others' dataset". `lastUpdatedAt` is 2026-10-14. "A significant number of columns have been removed in consideration of Section 12(2A) of the Companies Act which apply to gazetted companies." — [data.gov.sg collection 2 metadata API](https://api-production.data.gov.sg/v2/public/api/collections/2/metadata); [dataset page](https://data.gov.sg/dataset/acra-information-on-corporate-entities)
- Fields, verified via `datastore_search` on dataset `d_af2042c77ffaf0db5d75561ce9ef5688` ('W'): `uen`, `issuance_agency_id`, `entity_name`, `entity_type_description`, `business_constitution_description`, `company_type_description`, `entity_status_description`, `registration_incorporation_date`, `uen_issue_date`, address fields (`block`, `street_name`, `level_no`, `unit_no`, `building_name`, `postal_code`), `account_due_date`, `annual_return_date`, `primary_ssic_code` / `primary_ssic_description` / `primary_user_described_activity`, the secondary SSIC equivalents, `no_of_officers`, `former_entity_name1..15`, and audit-firm UENs. — [data.gov.sg datastore_search](https://data.gov.sg/api/action/datastore_search?resource_id=d_af2042c77ffaf0db5d75561ce9ef5688&limit=2)
- The datasets are licensed under the Open Data Licence, "free… for personal or commercial use". An API key gives higher rate limits. These points come from search summaries of data.gov.sg pages. — [data.gov.sg ACRA dataset](https://data.gov.sg/datasets/d_c0650f23e94c42e7a20921f4c5b75c24/view)
- **Collection 1, "Registered Entities with Unique Entity Number"**, covers entities from all UEN issuance agencies (ACRA, ROS, MUIS, MOH, etc.). Frequency is "ad-hoc"; metadata updated 2026-10-14. — [data.gov.sg collection 1 metadata API](https://api-production.data.gov.sg/v2/public/api/collections/1/metadata)
- **Bizfile Business Profile**: $5.50, downloadable for 7 days. Since 4 Mar 2023 it comes as a PDF plus an OA (OpenAttestation) file "for product verification". It is free to newly registered entities and on renewal or annual return. — [ACRA: Business Profile](https://www.acra.gov.sg/how-to-guides/buying-information/business-profile)
- **ACRA API Marketplace** launched 26 May 2024. The Entity Information Query (EIQ) subscription is paid. The **Business Profile API** (available from 18 Nov 2025) returns the same data as the Bizfile Business Profile (UEN, name, activities, incorporation date, position holders, owners, partners) and needs an EIQ subscription via `bizfile.gov.sg/apimarketplace/management`. New API Mall subscriptions are no longer offered. — [ACRA: New Business Profile API (13 Nov 2025)](https://www.acra.gov.sg/news-events/news-announcements/905/); [ACRA API Marketplace](https://www.acra.gov.sg/about-bizfile/api-marketplace); [ACRA API Mall notice](https://www.acra.gov.sg/announcements/acra-api-mall)
- **Free single lookups**: the UEN and status of any entity can be searched free on Bizfile or uen.gov.sg; a "Live" status means active. Bizfile replaced BizFile+ in Dec 2024. — commentary: [SingaporeLegalAdvice](https://singaporelegaladvice.com/?p=17533); [Terra Advisory](https://terraadvisoryservices.com/uen-guide-for-businesses-in-singapore/) (not verified on uen.gov.sg directly)
- **Myinfo Business (Corppass)**:
  - Returns `entity_info` (basic profile, address, appointments) from verified government sources (e.g. ACRA), with source and last-updated metadata.
  - Only for ACRA-registered entities with authorised Corppass users.
  - New integrations must use Myinfo Business v3 on the Corppass Authorization API (FAPI 2.0); legacy integrations must migrate by 31 May 2027 (changelog, May 2026).
  - Corppass FAQ: "grants and licenses information are presently not available".

  — [Corppass docs: Myinfo Business entity scopes](https://docs.corppass.gov.sg/technical-specifications/corppass-authorization-api-fapi-2.0/scopes/myinfo-business-scopes/entity-scopes); [Corppass docs: changelog](https://docs.corppass.gov.sg/technical-specifications/corppass-authorization-api-fapi-2.0/changelog/myinfo-business-support); [ask.gov.sg Corppass FAQ](https://ask.gov.sg/corppass/questions/cm1q0y3qp0011wdnwrhee81ky) (search summary; FAQ undated)

### Inferences
- A low-cost stack has four steps:
  1. The seller signs in with Corppass via Myinfo Business, which proves the person is authorised for that UEN and pre-fills verified entity data.
  2. Cross-check `entity_status_description` and SSIC codes against the monthly ACRA open dataset. Food SSICs are expected in 10xxx manufacturing, 46xxx wholesale, 47xxx retail and 56xxx food services; mapping UNVERIFIED.
  3. Match the ACRA entity name to the Track Records licensee name.
  4. Pay for a Business Profile only when officer or owner identity matters.
- Sole proprietors and partnerships have UENs from ACRA. Societies registered with ROS (eligible for Food Shop licences) appear in the UEN collection, not in the ACRA collection.
- Myinfo Business integration requires QuinTaste itself to onboard as a Corppass/Myinfo relying party. Eligibility rules for private platforms were not checked.

### Gaps
- uen.gov.sg was not fetched directly; free-lookup claims rest on secondary sources.
- ACRA API pricing was not found on the pages fetched.
- Whether Myinfo Business will add licence data (e.g. GoBusiness licences) was not found.
- Whether a private marketplace may use Myinfo Business for seller onboarding needs confirmation from the Singpass developer docs or prerequisites.

---

## 5. Halal certification verification and rules on "halal", "vegetarian" and "vegan" wording

### Takeaway
Only MUIS may issue halal certificates in Singapore (AMLA s 88A). Issuing a certificate or using the MUIS mark or a colourable imitation without approval carries a fine of up to $10,000, up to 12 months' jail, or both. MUIS runs a public establishment directory (`halal.muis.gov.sg/halal/establishments`) and a **Verify** e-service that validates a MUIS-issued PDF certificate. New eating-establishment certificates carry QR codes. Singapore has no statutory definition of "vegetarian" or "vegan" that this research could find. False or misleading descriptions are prohibited under Food Regulations reg 9, and SFA expects alternative-protein products to be qualified ("mock", "plant-based").

### Cited Findings
- "MUIS is vested with the sole legal powers to issue Halal certificates in Singapore". Section 88A(5) creates offences for issuing a halal certificate without MUIS approval and for using "any specified Halal certification mark or any colourable imitation thereof". Penalty: fine up to $10,000, imprisonment up to 12 months, or both. MUIS certification is voluntary (since 1978). Page updated 16 Oct 2026. — [MUIS: Halal – About](https://www.muis.gov.sg/halal/about/)
- MUIS's halal page links "halal-certified eating establishments" search to `https://halal.muis.gov.sg/halal/establishments`. — [MUIS: Halal](https://www.muis.gov.sg/halal)
- **Directory mechanics**, from the page HTML and JavaScript on 17 Oct 2026, footer "last updated 09 October 2026":
  - free-text search of at least 3 characters
  - results show establishment name, sub-scheme, certificate number, a "virtual brand" type tag and address, plotted on a OneMap map
  - data comes from an undocumented `POST /api/halal/establishments` endpoint behind a CSRF token and bot protection

  — [MUIS e-Service: Halal Establishments](https://halal.muis.gov.sg/halal/establishments)
- **MUIS Verify e-service**: "Service to verify issued documents by MUIS in PDF (.pdf) format (e.g. Halal Certificate). The validity of documents issued in the PDF format can be verified in real-time". Results show "Issued To", "Issued On", "Expires On" and whether the document is genuine. — [MUIS e-Service: Verify](https://halal.muis.gov.sg/verify)
- **QR certificates**: "for the new Eating Establishment certificate, you may scan the QR code to get the real-time certification details", including the expiry date. A Malay Mail report (24 Sep 2025) says QR-coded certificates started 1 Oct 2025 and replace physical ones by March 2026. Both were seen only via search summaries; the pages were blocked. — [ask.gov.sg MUIS](https://ask.gov.sg/muis/questions/cmpdr7i1t008g5o01mwnly5g9); [Malay Mail, 24 Sep 2025](https://www.malaymail.com/news/singapore/2025/09/24/singapore-to-introduce-qr-coded-halal-certificate-from-oct-1-replacing-physical-versions-by-march-2026/192270)
- Certified eating establishments must display the valid original certificate prominently. The 2023 government reply directed the public to verify against the MUIS list or the MuslimSG app, and gave MUIS contacts for reporting (6359 1199, info@muis.gov.sg). — [MCCY: Verifying the authenticity of Halal certificates](https://www.mccy.gov.sg/about-us/news-and-resources/verifying-the-authenticity-of-halal-certificates/)
- A MUIS resources page lists "Transition of MUIS Halal Endorsement Letters to Digital Format (24 July 2026)". Details were not read. — [MUIS: Halal resources](https://www.muis.gov.sg/halal/resources)
- "No pork no lard" is not halal certification. HalalSG guidance notes halal "encompasses more than just the exclusion of pork and lard". This is community guidance, not a statute. No Singapore statute specifically banning "no pork no lard" or "Muslim-friendly" wording was found; Malaysia's JAIS ban does not apply in Singapore. — [muslim.sg / HalalSG](https://muslim.sg/articles/navigating-the-ramadan-bazaar-halalsg-s-guide-to-halal-food); [SAYS (Malaysia)](https://says.com/my/news/no-pork-no-lard-signs-prohibited-non-halal-certified-businesses-jais)
- **Food Regulations reg 9** prohibits false or misleading statements, words, brands, pictures or marks about the "nature… composition… origin…" of food on labels **and advertisements**. Signs and logos implying endorsement are covered. — [SFA: A Guide to Food Labelling and Advertisements (amended to Nov 2025)](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf)
- Products "marketed as an alternative to / substitute for conventional food products should be accompanied by appropriate qualifying terms", e.g. "mock", "cultured" or "plant-based". — [SFA Labelling Guide](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf)
- The Jan 2026 Food Regulations amendments define gluten-free terms; no vegetarian or vegan definitions were reported. — commentary: [Keller and Heckman](https://www.khlaw.com/index%2ephp/insights/singapore-revises-food-labeling-rules-and-refines-food-regulatory-framework)
- **FSSA Part 10** (misleading or deceptive conduct; s 178 "falsely describe"; s 182 "Meat substitution"; s 183 "Mislabelling food for supply"; s 184 non-compliant advertising) exists in the enacted Act. Of Part 10, only ss 177(2), 185 and 188 commenced on 28 Nov 2025. — [FSSA 2025 (SSO)](https://sso.agc.gov.sg/Act/FSSA2025)

### Inferences
- QuinTaste's "not halal-certified" default is legally safe. A seller should be marked "MUIS halal-certified" only after one of two checks: the certificate PDF passes MUIS Verify (store the result with issued-to and expiry), or the directory shows a matching name, address and certificate number. Re-check before expiry.
- Calling uncertified food "halal", or using the MUIS logo, risks AMLA s 88A (for marks) and reg 9 (for false descriptions). The platform should block "halal" and the MUIS mark in uncertified listings, and treat "no pork no lard" or "Muslim-friendly" as seller claims, not certification.
- With no legal definition of vegetarian or vegan, QuinTaste's own definitions (e.g. egg, dairy and five-pungent rules) should be displayed as platform or seller declarations. A false "vegan" claim on a product containing dairy would likely be "false or misleading" under reg 9; this is an inference, not confirmed by SFA guidance specific to these words.

### Gaps
- No primary SFA, MUIS or CCCS guidance was found on the words "vegetarian" or "vegan", or on "Muslim-friendly" claims by uncertified sellers.
- The MUIS directory has no documented API or bulk download, and scraping it would need MUIS permission.
- The QR certificate rollout details (all schemes or only eating establishments; full phase-out date) rely on blocked pages.

---

## 6. Labelling, date marking and allergen rules for prepacked food sold online

### Takeaway
All prepacked food sold in Singapore, including online, must carry an English label with seven items:
- name
- ingredients (with allergens)
- net quantity
- name and address of the Singapore entity
- country of origin
- lot identification (from 30 Jan 2026)
- directions for use (from 30 Jan 2026)

Online, SFA "encourages" showing the label information on the listing and says a clearly legible label photo "will suffice". A proposed rule forcing platforms to display it was dropped in favour of voluntary SS 687:2022. Selling any prepacked food past its date mark is prohibited, whether the mark says "use by", "best before", "sell by" or "expiry".

### Cited Findings
- Prepacked food must carry at point of sale: common name, complete ingredient list including allergens, net contents, name and address of the local food business operator, and country of origin. For online listings, sellers "are encouraged to display the same labelling information… declared on the online platform or presented in the form of a photo of the product label that is clearly legible". FAQ: "attaching a photograph of the food product which clearly displays the required food labelling information on the online listing will suffice." — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- Non-prepacked food (fresh produce, raw meat, cooked meals) is exempt from general labelling. Sellers are encouraged to show:
  - name or photo
  - net contents
  - origin
  - operator name and address
  - storage instructions
  - allergens
  - **SFA licence/registration number**
  - **grading details**

  — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- SFA "will not require online platforms to display the labelling information". The proposed regulation "has been removed from this set of amendments", with SFA focusing instead on voluntary **SS 687:2022 Guidelines for Food E-commerce**. Food businesses must still ensure label information is declared on prepacked food sold physically or online. The requirements apply only to persons or businesses based or registered in Singapore. These points come from a search extract of SFA's consultation response (05 Feb 2025). — [SFA: Responses to feedback on Food Regulations labelling consultation (05 Feb 2025)](https://sfa.gov.sg/docs/default-source/public-consultation/responses-to-feedback-from-consultation-food-regs-labelling-requirements-05022025.pdf)
- SS 687 is "not mandatory". It covers online food sellers, e-commerce platforms and delivery companies: "roles across the supply chain, standardised information at the point of sale and delivery, and traceability and recall responsibilities", and is "designed for small-scale or micro-businesses". — [SFA: Requirements for online food sellers (19 Feb 2025)](https://sfa.gov.sg/food-retail/online-food-businesses/requirements-for-online-food-sellers)
- The Labelling Guide was first published Feb 2010 and last amended Nov 2025 (revision history 28 Nov 2025 and 15 Jul 2025). The general labelling list adds "6) Lot identification" and "7) Directions for use" with effect from 30 Jan 2026, under the Food (Amendment) Regulations 2025. An "Ingredients" heading, added-water declaration and minimum font sizes also apply from 30 Jan 2026. — [SFA Labelling Guide](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf)
- **Allergens** ("foods and ingredients known to cause hypersensitivity", Table 2):
  - cereals containing gluten (wheat, rye, barley, oats, spelt)
  - crustacea
  - eggs
  - fish (including molluscs)
  - peanuts and soybeans
  - milk (including lactose)
  - tree nuts
  - sulphites ≥10 mg/kg

  They must be declared in the ingredient list and must not use generic terms. An optional "Contains" statement covers intentional allergens only. Precautionary "May contain" labelling is voluntary, for unintentional cross-contact. From 30 Jan 2026 this includes allergens transferred via biotechnology. — [SFA Labelling Guide](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf)
- **Date marking**: the expiry date may be shown as USE BY, EXPIRY DATE, SELL BY or BEST BEFORE. "While the above-mentioned terms have different technical meanings, under the Food Regulations, these terms are taken to mean the same and the sale of foods that have passed their expiry dates are prohibited."
  - The date mark must be permanent, at least 3 mm high, and must not be "removed, altered, obscure, superimposed or tampered".
  - Table 3 lists the foods that must be date-marked: creams; cultured, pasteurised and liquid milk; yoghurt; pasteurised and vitaminised juices; tofu and taufu products including tauhui; chilled foods including cut fruit and vegetables; flour; salad dressing; mayonnaise; raisins and sultanas; chocolate; infant food; and others.

  — [SFA Labelling Guide](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf)
- A 2024 parliamentary reply confirms that "Use By" and "Best Before" both indicate an expiry date "beyond which, the food product is not permitted to be sold in Singapore". — [MSE: Oral reply on standardising date labels](https://www.mse.gov.sg/latest-news/oral-reply-to-pq-on-standardising-date-labels-for-food/)
- **Penalties.** Food Regulations reg 261: fine up to $1,000, or $2,000 for a repeat conviction. SOFA s 49 general penalty: up to $5,000, or for a repeat conviction up to $10,000 and/or 3 months' jail. — [SFA Labelling Guide](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf); a fraudulent date-marking case: [SFA release (Feb 2019)](https://sfa.gov.sg/newsroom/press-releases/company-fined-for-fraudulent-expiry-date-marking)

### Inferences
- The current QuinTaste listing model (required label photo, full ingredient text and Contains / May contain choices) already aligns with SFA's e-commerce guidance and Table 2. For licensed sellers it should also capture lot ID and directions for use, which are mandatory on labels from 30 Jan 2026. It should block publishing or keep selling once the date mark passes, whatever the wording.
- For cooked or non-prepacked meals from Food Shop licensees, the listing should show the SFA licence number and SAFE grade, because SFA explicitly encourages this for non-prepacked food sold online.
- The platform has no statutory duty to display label information, since that proposal was dropped. Sellers remain liable for label compliance.

### Gaps
- The text of SS 687:2022 (paid) was not accessed, so its exact point-of-sale information list is unknown.
- The full Table 3 date-marking list continues beyond item 16 and was not fully transcribed.
- The consultation-response details come from a search extract; the PDF was not opened.

---

## 7. Categories a food marketplace should exclude or gate (alcohol, supplements, novel foods, personal imports)

### Takeaway
- **Alcohol**: any online supply needs a Liquor Control Act licence (off-premises classes 3A, 3B or 4). Since 2 Jan 2024, licensees must not supply under-18s online, must warn buyers, and may sell through a third-party platform only if the platform takes reasonable age-verification steps.
- **Health supplements**: regulated by HSA, not SFA, with no pre-market approval today. HSA proposed mandatory notification from 2028 (consultation July 2026).
- **Novel and GM foods, and uncatalogued insects**: supplying them without pre-market approval is an FSSA offence in force since 28 Nov 2025.
- **Personal imports**: food imported for personal use cannot be resold.

### Cited Findings
- From 2 Jan 2024, "persons or businesses, including electronic commerce platforms, who supply liquor online or through a telecommunication service, need a licence".
  - Licensees "must not supply any liquor to an individual who is younger than 18 years online". They must warn buyers it is an offence and state the penalty.
  - A licensee must not use a third-party platform if it knows the operator does not "take all reasonable steps to ascertain that the individual is 18 years or older".
  - Breach of Regulation 11 carries a fine of up to $10,000.
  - Liquor may be stored off the licensed premises but not sold from the storage premises.

  — [SPF news release, 18 Nov 2023](https://www.police.gov.sg/media-hub/news/2023/20231118_new_requirements_to_regulate_supply_of_liquor_online_or_through_telecommunication_services)
- There are 8 liquor licence classes. Class 3A, 3B and 4 holders (including online liquor businesses) may deliver outside trading hours to non-public places. E-commerce platforms are asked to warn sellers of the licence requirement and help take down unlicensed listings. These points come from search extracts of SPF pages. — [SPF: Liquor Licence](https://www.police.gov.sg/e-Services/Police-Licences/Liquor-Licence); [SPF Liquor Licence FAQ (PDF)](https://www.police.gov.sg/-/media/SPF/Images/Licences-Documents/Liquor-Licence-FAQ.pdf)
- HSA: ingredients in health supplements "are not evaluated by HSA before local sale". Products presented as food or beverages (biscuits, coffee, juice) are not health supplements; "food and supplements of food nature" fall under SFA. HSA publishes a Food-Health Product Classification Tree. — [HSA: Regulatory overview of health supplements](https://www.hsa.gov.sg/health-supplements/overview/); [HSA: How health supplements are regulated](https://www.hsa.gov.sg/announcements/how-health-supplements-are-regulated-by-hsa/)
- HSA consultation (1–29 Jul 2026) proposed **mandatory notification** of health supplements under a Complementary Health Products framework. Record-keeping, safety reporting and advertisement controls would start Q3 2028, with full implementation by Q3 2030 after a two-year grace period. "Products that have not undergone mandatory notification would not be allowed on the market." This is a proposal, not law. — [NutraIngredients, 2 Jul 2026](https://www.nutraingredients.com/Article/2026/07/02/singapore-regulator-proposes-mandatory-health-supplements-notification/)
- HSA monitors Instagram, Telegram and local e-commerce platforms, and has had thousands of listings removed. — [NutraIngredients, 7 Nov 2023](https://www.nutraingredients.com/Article/2023/11/07/singapore-supplements-crackdown-thousands-of-online-listings-removed-illegal-products-seized/)
- **FSSA Tranche 1 (28 Nov 2025).** Supplying "defined food" is an offence. Defined food covers novel food without pre-market approval, GM food without pre-market approval, and edible insect-like species not catalogued (Catalogued Insect-like Species Order 2025). Part 5 commenced in full on 28 Nov 2025, as did s 185 "Advertising defined food". — [FSSA 2025 commencement note (SSO)](https://sso.agc.gov.sg/Act/FSSA2025); commentary: [Rajah & Tann Asia](https://www.rajahtannasia.com/viewpoints/first-tranche-of-food-safety-and-security-act-comes-into-force/)
- Food brought in by travellers or by parcel post is for personal consumption only. Selling it without an import permit is an offence. — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- FSSA s 160 ("Supplying food imported for private consumption") exists but was **not** in the 28 Nov 2025 commencement list. — [FSSA 2025 (SSO)](https://sso.agc.gov.sg/Act/FSSA2025)

### Inferences
- Simplest compliant default: exclude liquor entirely. If it is ever allowed, require the seller's Class 3A, 3B or 4 liquor licence plus platform age verification and an under-18 warning, because licensees can only use platforms that take reasonable age-check steps.
- Exclude HSA health supplements, which are outside the food remit and hard to verify. Allow food-form products (teas, snacks) under normal SFA rules.
- Gate novel foods (insects, cultivated or precision-fermentation proteins, novel ingredients) behind evidence of SFA pre-market approval or catalogued status, because supply and advertising of defined food is already an offence.
- Block resale of personally imported or overseas-parcel food. For imported products from importer-sellers, require the import licence or registration.

### Gaps
- The chewing gum ban and raw or unpasteurised milk restrictions (already blocked in the QuinTaste form) were not re-researched here.
- Liquor penalty amounts beyond Reg 11, and licence class definitions, were not verified from the Act.
- Whether HSA's 2028 proposal was finalised after the July 2026 consultation was not found.

---

## 8. Food Safety and Security Act 2025: Part 4 licensing, timeline and online platforms

### Takeaway
The FSSA (Act 7 of 2025, assented 3 Feb 2025) has commenced only partly. Section 402 commenced on 27 Feb 2025. Tranche 1 commenced on 28 Nov 2025: Parts 5, 6 and 16, most of Parts 13 and 14, key definitions, and ss 4, 5, 7 and 185. **Part 4 (food business licensing, Food Control Plans, traceability, unlicensed-business offences) is not in force** as of 17 Oct 2026. SOFA, EPHA and the Food Regulations still apply, as shown by the 9 Oct 2026 Gourmetz prosecution.

The Act expressly **excludes platform intermediaries from "food business"** (s 5(3)(a)). It **includes home businesses** in "food business" (s 5(2)). Its licensable retail classes exclude homes. Firms describe a phased rollout to 2028; no official date for Part 4 was found.

### Cited Findings
**Commencement and status**
- SSO shows two commencements only: "27 February 2025 Section 402" and "28 November 2025". The 28 Nov list includes definitions in s 3(1) (including "food business", "online location", "online material", "retail food business"), ss 4, 5(1)–(3), 7, 8–10, …, 152–153, 158–159, …, 177(2), 185, 188, …, and Parts 5, 6, 13 (with exceptions), 14 (with exceptions) and 16. The list does not include Part 4 (ss 90–104). The SSO footer read "Last updated 17 Oct 2026". — [FSSA 2025 (SSO)](https://sso.agc.gov.sg/Act/FSSA2025)
- Tranche 1 effective 28 Nov 2025 covered defined food (Parts 5 and 8 offences) and non-packaged drinking water (Part 6). Commentary from Rajah & Tann. — [Rajah & Tann Asia](https://www.rajahtannasia.com/viewpoints/first-tranche-of-food-safety-and-security-act-comes-into-force/)
- Timeline commentary:
  - "Second half of 2025… By 2028: full implementation is expected". — [Shook Lin & Bok (1 Apr 2025)](https://shooklin.com/singapore-enacts-comprehensive-food-safety-and-security-act/)
  - "rolled out in phases from late 2025 to 2028". — [SingaporeLegalAdvice (6 Feb 2026)](https://singaporelegaladvice.com/faq-singapore-new-food-safety-security-act/)
  - Government statement: importers and licensed food businesses at key distribution nodes must keep traceability and recall records "by 2028". — [MSE written reply, 25 Feb 2026](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-product-recall---traceability-/)

**Statute text (enacted, Part 4 not yet in force)**
- **s 5(1)**: "food business" means a business or activity involving production of primary produce, handling of food for supply or export, or supply of food, "regardless of whether… commercial, charitable or community… or… on one occasion only".
- **s 5(2)**: "a 'food business' includes a food business carried on as a home business or… within the individual's private residence."
- **s 5(3)(a)**: a food business does **not** include an activity "that carries on any other business besides trading in food and… acts as an intermediary between persons who trade in food by providing, for reward, premises or a place… or services (such as an internet service provider or an online auction location)". Under s 5(3)(b), market or event organisers are also excluded. s 5 commenced 28 Nov 2025.

— [FSSA 2025 (SSO)](https://sso.agc.gov.sg/Act/FSSA2025)
- **s 6**: a "licensable food business" is a food business in a retail or non-retail class in the **First Schedule**, which the Minister may amend by Gazette order. — [FSSA 2025 (SSO)](https://sso.agc.gov.sg/Act/FSSA2025)
- **First Schedule, Part 1 (Retail)**:
  1. eat-in food preparation on premises "(but not a home)" (restaurants, cafés, bars), including ancillary catering
  2. multi-unit food courts and coffeeshops
  3. their stalls
  4. preparing, packing and delivering takeaway or RTE food from premises "(but not a home)" (e.g. bubble tea, sandwich kiosks, cut fruit, "but not a shop selling wholly prepacked food")
  5. mobile and temporary vendors
  6. butchers, fishmongers and fresh perishable retail on premises "(but not a home)"
  7. markets
  8. catering services
  9. self-serve supermarkets with raw, prepared or perishable food
  10. certain vending machines
  11. temporary fair stalls

  **Part 2 (Non-retail)**:
  1. primary production, with small-scale exceptions
  2. meat and fish processing for sale to other businesses or export
  3. slaughtering
  4. manufacturing and processing for sale to other food businesses or export (kneading, marinating, cold-pressing, cold-brewing, cell-based food, retorting, etc.)
  5. meat and fish cold storage for reward
  6. hire of facilities and equipment to food businesses (shared kitchens)
  7. commissary or central kitchens
  8. airline catering

  — [FSSA 2025 First Schedule (SSO)](https://sso.agc.gov.sg/Act/FSSA2025?ProvIds=P14-,Sc1-)
- **Part 4 contents.** Food business licences need an accepted **Food Control Plan** (or farm management plan). The plan covers premises, equipment and conveyances, hazard identification and control, monitoring and corrective action, and record-keeping (s 90 ff, s 93(2)).
  - s 93: conditions may include disruption and food-defence plans, performance bonds, and more.
  - s 94: licences valid "not exceeding 5 years".
  - ss 98–101: traceability one step back and one step forward, sufficient "to allow an effective recall… under Part 7". It applies only to businesses prescribed by Gazette order.
  - s 102 (unlicensed licensable business): individuals face up to $15,000 and/or 6 months, or for repeat offenders $30,000 and/or 12 months; non-individuals face up to $30,000, or $60,000 for repeat offenders.
  - s 103: deployment of untrained food workers.
  - s 104: proprietors of **non-licensable** food businesses commit an offence (fine up to $5,000) if they engage in conduct that regulations prescribe as prohibited or disallowed for that business.

  — [FSSA 2025 Part 4 (SSO)](https://sso.agc.gov.sg/Act/FSSA2025?ProvIds=P14-,Sc1-)
- **"Advertise" (s 7, in force since 28 Nov 2025).** Publishing includes "posting the content as online material" and "publishing the content on an app". Under s 7(3)(b), a person is treated as causing or authorising publication if they "receive consideration for the display, placement or location of the content" where placement is set by agreed systems or processes. Individuals sharing opinions or forwarding content unpaid are excluded (s 7(4)). The s 3 "menu" definition covers menus "displayed on an online location of a person who sells… food online". — [FSSA 2025 (SSO)](https://sso.agc.gov.sg/Act/FSSA2025)
- Other enacted but uncommenced parts relevant to sellers:
  - Part 7 directions, including s 128 "Direction to recall food" and s 131 "Direction to publish statement"
  - Part 8 offences: supplying unsafe or unsuitable food, with strict-liability variants; ss 146–151 not in the Tranche 1 list
  - Part 10 offences: misleading conduct, falsely described food, mislabelling, non-compliant advertising

  — [FSSA 2025 table of contents (SSO)](https://sso.agc.gov.sg/Act/FSSA2025)
- **Penalties (commentary)**: serious offences up to $50,000 for corporations; individuals up to $25,000 and/or 24 months; disqualification up to 3 years after revocation. — [Shook Lin & Bok](https://shooklin.com/singapore-enacts-comprehensive-food-safety-and-security-act/)
- SingaporeLegalAdvice says Tranche 1 included "selected licensing and control-plan requirements". That conflicts with the SSO commencement list, which does not include Part 4. Treat the SSO list as authoritative. — [SingaporeLegalAdvice](https://singaporelegaladvice.com/faq-singapore-new-food-safety-security-act/)

### Inferences
- The FSSA confirms in statute what SFA guidance already says: a platform that only intermediates food trades for reward is not a "food business". QuinTaste would not need a food business licence as long as it does not handle, store, pack or deliver food itself. If QuinTaste ever runs fulfilment, cold storage or kitchen hire, it could fall into a First Schedule class.
- **Possible platform exposure under advertising rules (needs legal review).** s 7 is in force. If QuinTaste charges for promoted or boosted placement, it may be treated as "causing or authorising" publication of those advertisements. That matters now for s 185 (advertising defined food) and later for s 184 (non-compliant advertising) once commenced. s 188 provides an advertising defence, whose text was not read.
- **Under the future regime:**
  - Licensed businesses will hold multi-year licences (up to 5 years) tied to Food Control Plans. Verification by annual expiry may change.
  - Home businesses are explicitly "food businesses" but outside licensable classes. s 104 lets regulations prohibit specific activities for non-licensable businesses (relevant to HBFB scope in the companion note).
  - Licensed businesses in prescribed classes must keep one-up, one-down traceability. For a QuinTaste-type platform, the "next person" is usually the consumer, which s 100(1)(b)(iii) excludes.
- No FSSA provision found imposes duties on online platforms to verify sellers. Verification remains a platform policy choice, not a statutory duty.

### Gaps
- No official SFA or MSE timetable for Part 4 commencement or the First Schedule taking effect was found; "by 2028" is commentary plus the MSE traceability statement.
- The text of ss 178–188 (Part 10 defences and the advertising defence s 188), Part 7 recall directions and Part 13 take-down or online powers was not read in full, because SSO began returning empty responses.
- No subsidiary legislation under Part 15 for s 104 (disallowed activities) was found.

---

## 9. Recall and incident expectations, and SFA enforcement against online sellers

### Takeaway
SFA runs recalls by **direction**. Implicated businesses must remove products from all points of distribution and report compliance; non-compliance is an offence. SFA's e-commerce guideline asks online sellers to keep one-step-back and one-step-forward records, delist recalled items, notify buyers and work with suppliers and SFA. Enforcement against online sellers has mainly targeted illegal imports and unlicensed cold storage by online grocers.

### Cited Findings
- During a recall, SFA "issues a direction to implicated businesses to remove affected products from all points of distribution". Businesses must inform SFA upon compliance, and SFA checks consolidated recalled products afterwards. "Failure to comply with a direction constitutes an offence and may result in prosecution in court." SFA also publishes press releases. Reply dated 25 Feb 2026. — [MSE written reply, 25 Feb 2026](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-product-recall---traceability-/)
- Online sellers should set up traceability systems and recall plans. Records should capture batch or lot, expiry and brand; one step back (supplier); and one step forward (recipients). On recall they should:
  - check their online listings and inventory
  - "remove all online listings from the platforms"
  - display online notices
  - "contact all customers who had purchased the affected food product"
  - work with suppliers and SFA on follow-up

  Sellers should also put contact details on listings. — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- Importer recall procedures: voluntary recall or a mandatory recall ordered by SFA; inform SFA, retrieve, dispose and report preventive action. This comes from a search extract of the SFA PDF. — [SFA Food Recall Plan (importers)](https://www.sfa.gov.sg/docs/default-source/food-import-and-export/food-recall-plan.pdf)
- **Enforcement cases.** Only Gourmetz was opened; the others come from search-result extracts of SFA or ICA releases.
  - **Lui Fammart** (sole proprietor): fined $8,000 for illegally importing seafood, meat and processed food from China and selling online. — [SFA release](https://sfa.gov.sg/newsroom/press-releases/sole-proprietor-of-lui-fammart-fined-8000-for-illegal-import-of-assorted-food-products) (2022 per search; date UNVERIFIED)
  - **OurPasar Essentials Pte Ltd** (online grocer): $11,000 for an unlicensed cold store and storing raw meat without a chiller; its managing director was fined $9,000. — [SFA release](https://sfa.gov.sg/newsroom/press-releases/ourpasar-essentials-pte-ltd-and-muhammad-shafizan-bin-saikh-abdul-kader-fined-for-unlicensed-cold-store-and-storing-raw-meat-for-sale-without-a-chiller) (date UNVERIFIED)
  - **Fish&Meatz LLP** (online grocer): $10,000 each for the company and its representative for an unlicensed cold store. — [SFA release](https://sfa.gov.sg/newsroom/press-releases/fish-meatz-llp-and-its-company-representative-fined-10-000-dollars-each-for-illegally-operating-an-unlicensed-cold-store) (2023 per search; UNVERIFIED)
  - **H&Z Mart** (online retailer): $10,000 each for the company and its director for an unlicensed cold storage room. — [Seth Lui report](https://sethlui.com/?p=188310) (2022 per search; UNVERIFIED)
  - An individual was fined $5,000 for illegally importing about 36 kg of meat and salted duck eggs and advertising the meat for sale on Facebook. — [ICA media release](https://www.ica.gov.sg/news-and-publications/newsroom/media-release/woman-fined-5-000-for-illegal-import-of-food-products-and-sentenced-to-4-weeks-imprisonment-for-threatening-public-servant) (date not shown; roughly 2022, UNVERIFIED)
  - **Gourmetz Pte Ltd**: fined $13,000 on 9 Oct 2026 for food-storage violations and false labelling; not an online case. — [SFA newsroom](https://www.sfa.gov.sg/news-publications/newsroom/gourmetz-pte-ltd-fined--13-000-for-food-safety-lapses)
  - SFA is investigating alleged illegal dog-meat sales advertised on social media (Sept 2026; no outcome reported). — [The Online Citizen, 25 Sep 2026](https://news.theonlinecitizen.com/2026/09/25/singapore-food-agency-investigates-online-allegation-of-illegal-dog-meat-sales)
- Consumers are told to report errant online sellers via SFA's online feedback form. — [SFA e-commerce guidelines](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)

### Inferences
- The platform should be able to support SFA recall directions quickly. That means order-level records of product, lot or batch, expiry and buyer for each order (the "one step forward" the guideline asks sellers to keep), plus a mechanism to delist all matching listings and message affected buyers.
- The enforcement pattern (illegal imports sold online; online grocers storing meat or seafood without cold-store licences) suggests where to focus verification. Meat or seafood sellers should show a cold-store or processing licence where applicable. Importer-sellers should show import licences or registrations. Imported goods should not come from personal parcels.

### Gaps
- No SFA case was found in which an e-commerce platform itself was penalised.
- No SFA guidance requiring platforms, as opposed to sellers, to delist recalled products was found; it is only implied by the seller-focused guideline and SS 687.
- Exact dates of the older cases were not verified.

---

## 10. Synthesis: practical ways a platform can verify a seller is genuinely SFA-licensed and compliant

### Takeaway
No single API proves "SFA-licensed". A defensible process layers four checks:
1. Corppass/Myinfo Business sign-in, or ACRA data, for entity identity and authority.
2. A Track Records match for the SFA establishment licence (licence number, licensee, address, food business type, SAFE grade, suspension filter), plus the licence document with QR code.
3. Activity-specific documents: import licence or registration, cold-store or processing licence, liquor licence, MUIS halal certificate validated via MUIS Verify.
4. Ongoing re-checks at licence expiry, grade change or suspension, with SFA's recall and labelling expectations built into listings.

### Cited Findings
- Track Records covers licensed establishments, searchable by licence number, licensee or business name, address and type, with a suspension filter, Excel/PDF export, and renewal and grade updates within 3 working days. — [SFA: Track Records](https://www.sfa.gov.sg/tools-and-resources/track-records)
- The QR code on an SFA licence gives access to the establishment's grade. — [SFA: SAFE framework](https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines/understanding-the-safety-assurance-for-food-establishments-framework)
- SFA encourages online sellers of non-prepacked food to display their SFA licence or registration number and grading. — [SFA e-commerce guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)
- The ACRA open dataset (monthly) gives UEN, entity status, address and SSIC. The Business Profile, at $5.50 or via API with an EIQ subscription, adds officers and owners. — [data.gov.sg ACRA collection](https://api-production.data.gov.sg/v2/public/api/collections/2/metadata); [ACRA Business Profile API](https://www.acra.gov.sg/news-events/news-announcements/905/)
- Myinfo Business returns government-verified entity data for an authorised Corppass user, but "grants and licenses information are presently not available". — [Corppass docs](https://docs.corppass.gov.sg/technical-specifications/corppass-authorization-api-fapi-2.0/scopes/myinfo-business-scopes/entity-scopes); [ask.gov.sg Corppass](https://ask.gov.sg/corppass/questions/cm1q0y3qp0011wdnwrhee81ky)
- MUIS Verify validates a MUIS-issued PDF certificate (issued to, issued on, expires on). The directory lists certificate number, scheme and address. — [MUIS Verify](https://halal.muis.gov.sg/verify); [MUIS directory](https://halal.muis.gov.sg/halal/establishments)
- GoBusiness's "Verify an Entity's Licence" exists but needs login; coverage is unverified. — [GoBusiness licences](https://www.gobusiness.gov.sg/licences/)
- Licensed businesses may not source from unlicensed HBFBs or online businesses. Licences are not transferable. — [SFA retail licensing page](https://www.sfa.gov.sg/food-retail/licence-permit/businesses-that-need-licence-permit-for-food-retail)

### Inferences
Proposed QuinTaste checks. These are design suggestions for review, not legal advice.
1. **Identity.** Seller signs in with Corppass (Myinfo Business v3). Store UEN, entity name, status and source timestamps. Reject entities that are not "Live". Fallback: manual UEN entry checked against the monthly ACRA dataset.
2. **Licence.** Seller enters SFA licence number(s) and premises address(es) and uploads the licence. A reviewer, or a permissioned automated check, confirms a Track Records record. The licence number, licensee name (matching the ACRA entity name or a recorded trading name), address and Type of Food Business must all match. Record grade and the suspension flag, and keep a screenshot or export as evidence with the date checked.
3. **Scope matching.** Allow only listing types consistent with the licence type:
   - Food Shop or Stall: cooked meals and RTE items from that premises.
   - Caterer: catered orders with a 4-hour consume-by stamp.
   - Food processing establishment: prepacked products with full labels.
   - Importer: imported prepacked goods with the import licence or registration.
   - Meat or seafood: cold-store or processing licence where storage applies.
4. **Listing compliance.** For prepacked items, require a full label photo or text including the 30 Jan 2026 additions (lot ID, directions for use) and Table 2 allergens. Block listings past the date mark. For non-prepacked food, show the licence number and SAFE grade. Exclude liquor, HSA health supplements and unapproved novel foods or insects.
5. **Re-verification.** Re-check Track Records monthly or around each licence's anniversary. Note renewals post within 3 working days after expiry. Re-check on any SAFE grade change to C or a suspension. Re-verify halal certificates before expiry. Plan for multi-year FSSA licences once Part 4 commences.
6. **Incident readiness.** Keep order-level lot and expiry data for recall support, plus seller contact details on listings. Provide a way to delist and notify buyers when SFA issues a recall.

### Gaps
- Whether SFA would confirm licence validity to a platform directly (e.g. a B2B verification channel or bulk check) is unknown. Ask SFA via its feedback form, csp.sfa.gov.sg.
- Whether automated checks of Track Records are permitted under its terms of use was not checked.
- No public verification channel was found for import licences or registrations, farm licences or liquor licences. Those rely on documents unless the agency offers a check.
