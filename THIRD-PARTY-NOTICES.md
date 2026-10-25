# Third-Party Notices

Habitable's own code is released under the MIT License (see [LICENSE](LICENSE)). This file lists the third-party material the project uses or learned from, who made it, and under what terms. No other pre-existing code was used. The sample scene images in `public/samples/` were drawn for this project.

## 1. Devpost Learn skill pack

- **What:** the "Build With AI: Basics" skill pack, `challengepost/learn-ai-basics` (<https://github.com/challengepost/learn-ai-basics>).
- **How it is used:** copied into `.agents/skills/` and used to plan and build the project (the planning documents in `devpost/` follow its templates).
- **License:** MIT, Copyright (c) 2026 Devpost. The full text, as shipped in `.agents/skills/LICENSE`:

```text
MIT License

Copyright (c) 2026 Devpost

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 2. Next.js and create-next-app

- **What:** the project was scaffolded with `create-next-app`; Next.js, React and the generated configuration boilerplate come from that scaffold.
- **License:** Next.js is MIT, Copyright (c) 2025 Vercel, Inc. (see `node_modules/next/license.md`). React and React DOM are MIT, Copyright (c) Meta Platforms, Inc. and affiliates.

## 3. Visual style: the "doodle" set of the brag-styles kit

- **What:** the look of the app (hand-drawn ink lines on grid paper, lime highlighter swipe, stamp badges, springy cards) is derived from the "doodle" visual system in the brag-styles kit by Bhavya Dhoot (<https://github.com/Bhavya-Dhoot/brag-scaled>).
- **How it is used:** design reference only. No assets, code or files from the kit were copied; the components in `src/components/doodle/` and the companion pages in `devpost/` were written for this project.

## 4. Fonts

Archivo, Patrick Hand and JetBrains Mono are used in the web app (via `next/font/google`) and embedded in the notice PDF (WOFF files from the `@fontsource/*` packages). The planning companions in `devpost/*.html` can optionally load the same families from Google Fonts and fall back to system fonts when offline. All three are licensed under the **SIL Open Font License 1.1**:

- Archivo: Copyright 2020 The Archivo Project Authors (<https://github.com/Omnibus-Type/Archivo>)
- Patrick Hand: Copyright (c) 2010-2012 Patrick Wagesreiter (mail@patrickwagesreiter.at)
- JetBrains Mono: Copyright 2020 The JetBrains Mono Project Authors (<https://github.com/JetBrains/JetBrainsMono>)

License text (the same text ships with each `@fontsource` package):

```text
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

## 5. Data and services

Public data and public web services, used at runtime. The repository redistributes three kinds of data files: short fixtures of public building records for the demo buildings (`src/lib/demo/fixtures/`), and `src/lib/law/corpus.json`, which holds 65 passages copied word for word from the NYC Housing Maintenance Code (NYC Department of Buildings compilation, Apr 17 2026, <https://www.nyc.gov/assets/buildings/pdf/HousingMaintenanceCode.pdf>) and from HPD pages on nyc.gov. Statutory text is public law. The HPD excerpts are short quotations of public government pages; each passage links to its source.

| Source | What Habitable uses | Terms |
|---|---|---|
| NYC Open Data, HPD Housing Maintenance Code Violations (`wvxf-dwi5`) | open violations for a building (BBL): counts, class, recent related items | NYC Open Data Terms of Use: <https://www.nyc.gov/html/data/terms.html> (public data; dataset page: <https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5>) |
| NYC Open Data / NYC Planning, PLUTO (`64uk-42ks`) | year built for the tax lot | same Open Data terms; NYC Planning data page: <https://www.nyc.gov/site/planning/data-maps/open-data.page> (dataset page: <https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks>) |
| NYC Open Data, HPD Multiple Dwelling Registrations (`tesw-yqqr`) and Registration Contacts (`feu5-w2e2`) | the building's registered managing agent, owner and head officer (names and business addresses as published) | same Open Data terms |
| NYC Open Data, HPD Complaints and Problems (`ygpa-z7cr`), HPD Litigations (`59kj-x8nc`), Alternative Enforcement Program (`hcir-3275`) | aggregate counts per building (no apartments, no names) and the AEP flag | same Open Data terms |
| NYC Open Data, 311 Service Requests from 2020 to Present (`erm2-nwe9`) | heat and hot water complaint counts per building for the landlord track record (aggregates only) | same Open Data terms |
| National Weather Service API (`api.weather.gov`) | latest outdoor temperature at Central Park, LaGuardia or JFK for the heat log | US government work, public domain; docs: <https://www.weather.gov/documentation/services-web-api> |
| NYC Planning Labs GeoSearch | address autocomplete, borough, BBL and BIN | public API, no key; docs and terms: <https://geosearch.planninglabs.nyc/docs/> |
| Google Gemini API (direct key), or Vercel AI Gateway (Anthropic and Google models) | proposes a problem type for a photo; answers law questions only in quotes that code checks; drafts message wording around facts code fills in | commercial services used under the account holder's own agreements; model output is not redistributed |
| Vercel | hosting | Vercel's terms, under the account holder's plan |

Terms links on nyc.gov were not machine-checked when this file was written (the site rejects automated requests); please confirm them in a browser before relying on them.

## 6. NYC HPD, NYC311 and Local Law sources behind the rules table

The cited rules table (`src/lib/rules.json`, shown in `devpost/spec.html`) states **facts** about the NYC Housing Maintenance Code, correction windows and violation classes, with citations and short quotations from official pages. Facts are not copyrightable; quotations are kept short and each row links its source. Sources:

- HPD, "Clear Violations": <https://www.nyc.gov/site/hpd/services-and-information/clear-violations.page>
- HPD, heat and hot water: <https://www.nyc.gov/site/hpd/services-and-information/heat-and-hot-water-information.page>
- HPD, indoor allergen hazards, mold and pests: <https://www.nyc.gov/site/hpd/services-and-information/indoor-allergen-hazards-mold-and-pests.page>
- HPD, lead-based paint: <https://www.nyc.gov/site/hpd/services-and-information/lead-based-paint.page> and <https://www.nyc.gov/site/hpd/services-and-information/lead-based-paint-violations-correct-certify-corrections.page>
- HPD, self-closing doors: <https://www.nyc.gov/site/hpd/services-and-information/self-closing-doors.page>
- HPD, report a maintenance issue: <https://www.nyc.gov/site/hpd/services-and-information/report-a-maintenance-issue.page>
- HPD certification of corrections, CY25: <https://www.nyc.gov/assets/hpd/downloads/pdfs/services/certification-of-corrections-cy25.pdf>
- NYC311 articles: [KA-01074](https://portal.311.nyc.gov/article/?kanumber=KA-01074) (apartment maintenance), [KA-02262](https://portal.311.nyc.gov/article/?kanumber=KA-02262) (mold), [KA-02278](https://portal.311.nyc.gov/article/?kanumber=KA-02278) (pests), [KA-01036](https://portal.311.nyc.gov/article/?kanumber=KA-01036) (heat and hot water), [KA-02134](https://portal.311.nyc.gov/article/?kanumber=KA-02134) (lead paint)
- Local Law 55 of 2018: <https://www.nyc.gov/assets/buildings/local_laws/ll55of2018.pdf>; Local Law 86 of 2017: <https://www.nyc.gov/assets/buildings/local_laws/ll86of2017.pdf>

Habitable is not legal advice and is not affiliated with, or endorsed by, NYC HPD, NYC311 or the City of New York.

## 7. Direct npm dependencies

Versions are the ones installed in `node_modules/` (read from each package's `package.json`); the declared range is from `package.json`. Transitive dependencies are not listed one by one; `package-lock.json` pins them and `npm ls --all` shows the tree. Development dependencies are used to build, test and lint and are not shipped to users. Packages licensed under Apache-2.0 are covered by <https://www.apache.org/licenses/LICENSE-2.0>; each package carries its own license file.

| Package | Declared | Installed | License | Kind |
|---|---|---|---|---|
| `@ai-sdk/google` | `^4.0.104` | 4.0.104 | Apache-2.0 | runtime |
| `@react-pdf/renderer` | `^4.9.0` | 4.9.0 | MIT | runtime |
| `ai` | `^7.0.152` | 7.0.152 | Apache-2.0 | runtime |
| `exifr` | `^7.1.3` | 7.1.3 | MIT | runtime |
| `idb-keyval` | `^6.3.0` | 6.3.0 | Apache-2.0 | runtime |
| `next` | `16.4.3` | 16.4.3 | MIT | runtime |
| `react` | `19.3.0` | 19.3.0 | MIT | runtime |
| `react-dom` | `19.3.0` | 19.3.0 | MIT | runtime |
| `zod` | `^4.6.7` | 4.6.7 | MIT | runtime |
| `@fontsource/archivo` | `^5.3.0` | 5.3.0 | OFL-1.1 | dev |
| `@fontsource/jetbrains-mono` | `^5.3.0` | 5.3.0 | OFL-1.1 | dev |
| `@fontsource/patrick-hand` | `^5.3.0` | 5.3.0 | OFL-1.1 | dev |
| `@playwright/test` | `^1.64.1` | 1.64.1 | Apache-2.0 | dev |
| `@tailwindcss/turbopack` | `^4` | 4.3.3 | MIT | dev |
| `@types/node` | `^24.19.2` | 24.19.2 | MIT | dev |
| `@types/react` | `^19` | 19.3.0 | MIT | dev |
| `@types/react-dom` | `^19` | 19.3.0 | MIT | dev |
| `eslint` | `^9` | 9.39.5 | MIT | dev |
| `eslint-config-next` | `16.4.3` | 16.4.3 | MIT | dev |
| `tailwindcss` | `^4` | 4.3.3 | MIT | dev |
| `typescript` | `^5` | 5.9.3 | Apache-2.0 | dev |
| `vitest` | `^5.0.5` | 5.0.5 | MIT | dev |

## 8. Everything else

No other pre-existing code, images or text were copied into this project. If something here is wrong or missing, please open an issue so it can be corrected.
