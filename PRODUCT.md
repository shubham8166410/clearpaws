# PetBorder — Product Overview

---

## What is PetBorder?

Bringing a pet to Australia is one of the most complex biosecurity processes in the world. The government website has 15-page PDF guides. The rules differ depending on which country you are moving from. Miss one deadline and your pet gets sent back or faces 30 days in quarantine instead of 10. Most people have no idea where to start, and the people who do figure it out have spent hours reading government documents and calling agencies to piece together a plan.

PetBorder is a website where you enter three things — where you are moving from, when you want to travel, and what pet you have. In 60 seconds you get a personalised step-by-step compliance plan with exact dates, real cost estimates, and everything you need to know written in plain English. No jargon. No PDFs. Just a clear action plan that tells you exactly what to do and when to do it, so nothing gets missed.

---

## Who uses it?

**Expats moving to Australia**

People who have accepted a job offer in Sydney or Melbourne and have a dog or cat back home. The process is stressful, expensive, and genuinely confusing. Different rules apply depending on whether you are coming from the United Kingdom, the United States, or South-East Asia. PetBorder removes the confusion instantly and gives people a clear plan on day one so they can start taking action immediately instead of spending weeks researching.

**Australians relocating overseas**

People leaving Australia with their pet who need to understand what their destination country requires. The same principle applies — complex rules, long lead times, and serious consequences for missing deadlines.

**Pet transport agencies**

Companies like Petraveller, Dogtainers, and Jetpets that professionally relocate pets internationally. These businesses spend heavily on Google advertising to find customers who are already planning a pet relocation. PetBorder delivers those customers to them as warm, pre-educated leads who already understand the process and are ready to get a quote. Agencies also use PetBorder to embed the tool on their own websites so their customers can self-serve.

---

## How does PetBorder make money?

**Free to start, pay for the full pack — $49 AUD once**

The basic compliance timeline is free. Anyone can generate one without creating an account. Users who want the complete document pack — including a professional PDF checklist, vet letter templates, and a BICON import permit application guide — pay $49 AUD as a one-time purchase. They download it immediately and keep it forever. No subscription required.

**Monthly subscription — $9.90 AUD per month**

Users who want to save their timeline, track their progress step by step, receive email reminders before deadlines arrive, and manage timelines for multiple pets pay $9.90 per month. They can cancel at any time. This tier also includes a map of DAFF-approved export vets in Australia and a comparison of the leading pet transport agencies with real pricing information.

**Referral fees from agencies**

Every time a PetBorder user clicks through to Petraveller, Dogtainers, or Jetpets and becomes a paying client, PetBorder earns a referral fee. These agencies currently spend heavily on Google Ads to find exactly this type of customer — someone who has a pet, is planning an international move to or from Australia, and is actively researching the process. PetBorder delivers them as warm, pre-educated leads who already understand what is involved. The referral partnership benefits both sides.

**Agency white-label portal — $299 AUD per month**

Pet transport agencies pay $299 per month to put PetBorder on their own website under their own brand. Their customers see the agency's logo and colours, but the technology generating the compliance timelines is PetBorder. The agency gets a dedicated dashboard showing every lead that came through their branded portal — name, email, pet details, origin country, travel date, and follow-up status — so their sales team can contact them and convert them into clients.

**API access for developers — included with agency subscription**

Agencies that want to connect PetBorder directly into their own quote systems or booking platforms use the public API. When a customer fills in an enquiry form on a pet transport website, PetBorder generates the compliance timeline in the background automatically and returns it to the agency's system. This makes PetBorder infrastructure rather than a competing product.

---

## What does it cost to run?

At launch the product costs almost nothing to operate. Hosting is free on Vercel. The database is free on Supabase. The AI that generates each compliance timeline costs roughly one cent per request. Email reminders cost nothing up to 3,000 messages per month.

**Total monthly cost at launch: under $25 AUD.**

Two document pack sales at $49 each cover all running costs in full. Everything above that is profit. As the product scales, costs scale gradually with usage — not suddenly with headcount. There are no servers to manage, no infrastructure team required, and no minimum spend on the core components.

---

## How big is the market?

- 73% of Australian households own a pet
- Australia receives tens of thousands of skilled migrants every year — all of them must navigate the same compliance process to bring their pets
- Australians are among the most well-travelled people in the world
- The Australian pet industry is worth $21 billion per year
- Pet transport agencies like Petraveller and Dogtainers each handle thousands of international relocations annually and charge between $2,000 and $6,000 per pet

Even capturing a small fraction of the people who need help with pet travel compliance each year represents tens of thousands of potential users. The market is not large in the same way a social media platform is large — but it is highly specific, the need is acute, the alternatives are poor, and the users are motivated to pay because the consequences of getting it wrong are severe.

---

## Who are the competitors?

**The expensive agencies**

Petraveller, Dogtainers, and Jetpets charge between $2,000 and $6,000 to manage the entire relocation for you. They are not a digital product — they are a human-operated service. PetBorder does not compete with them. It is the affordable self-serve option that sits upstream and refers users to them when the process is too complex or they want a professional to handle everything. In that sense, PetBorder creates value for these agencies rather than taking it from them.

**The government website**

The Australian Department of Agriculture, Fisheries and Forestry publishes step-by-step guides on their website. They are accurate but written in government language, spread across many pages, not personalised to your specific situation, and contain no cost estimates or date calculations. The information is there — it is simply not useful without significant effort to interpret it. PetBorder does that interpretation automatically.

**Generic global tools**

PetVoyage.ai and Travel Ready Pets exist globally but are not built specifically for Australia. They give general summaries of country rules without the depth of Australian-specific knowledge. They do not know the 180-day RNATT blood test waiting period, the Melbourne-only airport requirement, or the identity verification timing rule that determines whether a pet quarantines for 10 days or 30 days. PetBorder encodes all of this in detail and monitors it weekly for changes.

**PadsPass**

The most credible future competitor. Launched in late 2025 out of the United States, building a global pet travel compliance platform with connections to international industry bodies. Their ambition is broad — covering all countries rather than specialising in one. They have not yet launched in Australia specifically. PetBorder has a 12 to 18 month head start in the Australian market and the depth of local knowledge that takes time to build and verify.

---

## What is the moat?

Three things make PetBorder difficult to replicate quickly.

**Depth of Australian-specific knowledge**

The DAFF rules for bringing pets to Australia are uniquely complex. The three-group country classification system. The 180-day mandatory waiting period that starts from when the laboratory receives the blood sample — not when it is drawn. The identity verification timing rule that most pet owners miss entirely, which determines whether quarantine is 10 days or 30 days. The Melbourne-only airport requirement. The Bengal cat ban that came into effect in March 2026. All of this knowledge is encoded into PetBorder, kept current with weekly monitoring, and would take a new competitor months to research, verify, encode, and maintain accurately. A mistake in this domain has real consequences for real animals.

**Agency relationships as a switching barrier**

Once a pet transport agency is using PetBorder as their white-label tool and their sales team is trained on the lead dashboard, they will not switch to a competitor unless the competitor offers something significantly better. The setup time, the staff training, and the disruption to their lead pipeline create a high switching cost. These relationships tend to become long-term and effectively exclusive once embedded.

**Data that compounds over time**

Every timeline generated teaches PetBorder which origin countries have the most traffic, which compliance steps cause the most confusion, which deadlines users miss most often, and what questions they ask that are not answered well. After six months of real usage this data makes the product meaningfully better — better prompts, better warnings, better step descriptions — in ways that a new entrant cannot replicate without going through the same period of real-world usage.

---

## How does it scale?

**Stage 1 — Organic growth through search**

People searching for "how to bring my dog to Australia", "DAFF pet import requirements", or "Mickleham quarantine booking" find PetBorder. No paid advertising is required at launch. The content is genuinely useful and specific, which means it ranks well because it answers real questions with accurate, detailed information that the government website does not present clearly.

**Stage 2 — Agency partnerships multiply the user base**

Once one major agency signs on as a white-label partner, their entire customer base becomes PetBorder users. Petraveller alone handles thousands of relocations per year. A single partnership can multiply the active user base significantly without any additional marketing spend. Each agency partnership also generates referral fees from the leads that convert.

**Stage 3 — Expand to new markets**

The same model works for other countries with complex pet import rules — New Zealand, the United Kingdom, Japan, Singapore. Each country has its own biosecurity requirements, its own quarantine facilities, and its own bureaucratic process that is difficult for ordinary people to navigate. Each country becomes a new product line using the same technology platform with a different knowledge base. The platform scales horizontally without rebuilding the core infrastructure.

---

## What has been built so far?

All four phases are complete and live at petborder.com.

**Phase 1 — The free timeline generator**

Anyone can generate a personalised DAFF compliance plan in 60 seconds without creating an account. The tool covers all origin countries, calculates exact dates for every compliance step, warns the user if their travel date is not achievable given the required lead times, shows realistic cost estimates including import permit fees and quarantine costs, and links to the official DAFF source for every requirement so users can verify each step independently.

**Phase 2 — Accounts and payments**

Users can create an account to save their timeline and return to it over the coming months as they work through each step. A $49 one-time payment unlocks a professional PDF document pack containing a formatted compliance checklist, vet letter templates, and an import permit application guide. Stripe handles all payments securely. Email reminders are sent automatically when compliance deadlines are approaching.

**Phase 3 — Subscription and premium features**

A $9.90 per month subscription gives users a step-by-step progress tracker so they can mark each compliance step as completed, multi-pet support for households with more than one animal, a map of DAFF-approved export vets searchable by Australian state and postcode, a directory of approved RNATT laboratories searchable by country, and a comparison of the three leading pet transport agencies with real pricing ranges and direct booking links.

**Phase 4 — B2B platform**

Pet transport agencies can white-label PetBorder on their own website for $299 per month. Their customers use the full timeline tool under the agency's branding and their leads flow directly into the agency's dashboard for follow-up. Vets can register at the vet portal and manage their export clients. Developers can access a public REST API to integrate the timeline engine into their own systems. An admin dashboard tracks all platform metrics including monthly recurring revenue, user growth, referral conversion rates, and API usage by partner.

---

## What would it take to acquire this?

**For a pet transport agency**

PetBorder is the digital customer acquisition channel that none of these agencies currently have. Their existing model relies on Google advertising and word of mouth, both of which are expensive and unpredictable. PetBorder delivers warm, pre-educated leads who have already done their research, already understand what the process involves, and are ready to get a quote. Acquiring PetBorder gives them that lead pipeline permanently, removes a growing competitive threat, and gives them the ability to offer the self-serve tool as a branded service to their own customers.

**For a pet insurance company**

Pet insurance penetration in Australia is under 10% despite 73% of households owning a pet. People who are relocating internationally with a pet are exactly the demographic most likely to take out pet insurance — they are already emotionally invested in their animal's wellbeing, already spending significant money on the process, and already at a moment of heightened anxiety about their pet's health and safety. PetBorder reaches them at precisely this moment and could deliver insurance upsell opportunities at very high conversion rates.

**For a global player such as PadsPass**

Rather than spending 12 to 18 months researching and encoding Australian-specific DAFF knowledge, building relationships with Australian pet transport agencies, and growing an Australian user base from zero — they could acquire PetBorder and have all of that immediately. The Australian market is a natural first expansion target for any global pet travel platform, and PetBorder has already done the hard work of building it correctly.

---

## Contact

petborder.com
