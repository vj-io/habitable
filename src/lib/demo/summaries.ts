// Precomputed building summaries for the three demo buildings; used when the live Open Data call fails or ?demo=1.
// Headline counts (openTotal, byClass, byIssue) are the all-time open totals from NYC Open Data (HPD violations
// wvxf-dwi5, PLUTO 64uk-42ks) on 2026-10-24, with self-closing doors counted as lock_door. `recent` is summarize()
// over the saved rows in ./fixtures/<bbl>-violations.json (building.test.ts keeps the two in sync).
// `registration` is read from ./fixtures/<bbl>-registration.json: HPD registration rows and contacts (tesw-yqqr,
// feu5-w2e2) fetched on 2026-10-25; the file snapshot behind them is dated in each fixture's `asOf`.
// `signals` is read from ./fixtures/<bbl>-signals.json: the raw answers for complaints in the 12 months from `since`
// (ygpa-z7cr), litigation count (59kj-x8nc) and AEP rows (hcir-3275), fetched the same day.
import { registrationInfo, type ContactRow, type RegistrationRow } from "../registration";
import { buildSignals, type SignalRows } from "../signals";
import type { BuildingRecord } from "../types";
import r1020020091 from "./fixtures/1020020091-registration.json";
import r2043220010 from "./fixtures/2043220010-registration.json";
import r3051900075 from "./fixtures/3051900075-registration.json";
import s1020020091 from "./fixtures/1020020091-signals.json";
import s2043220010 from "./fixtures/2043220010-signals.json";
import s3051900075 from "./fixtures/3051900075-signals.json";

export const DEMO_BUILDINGS: Record<string, BuildingRecord> = {
  "1020020091": {
    "bbl": "1020020091",
    "yearBuilt": 1905,
    "openTotal": 291,
    "byClass": {
      "A": 54,
      "B": 154,
      "C": 82
    },
    "byIssue": {
      "leak": 37,
      "mold": 18,
      "heat_hot_water": 1,
      "pests": 22,
      "lock_door": 9,
      "peeling_paint": 88
    },
    "recent": [
      {
        "id": "19292528",
        "date": "2026-10-12",
        "hazardClass": "B",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling in the bathroom located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": "leak"
      },
      {
        "id": "19292529",
        "date": "2026-10-12",
        "hazardClass": "A",
        "description": "Trace and repair the source and abate the visible mold condition... less than 10 sq ft at east wall and ceiling in the bathroom located at apt 1E, 2nd story,…",
        "issue": "mold"
      },
      {
        "id": "19301437",
        "date": "2026-10-12",
        "hazardClass": "A",
        "description": "Paint with light colored paint to the satisfaction of this department all peeling paint surfaces in the foyer, the bathroom located at apt 1E, 2nd story, 1st…",
        "issue": "peeling_paint"
      },
      {
        "id": "19292530",
        "date": "2026-10-12",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective doors at west base cabinet in the kitchen located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": null
      },
      {
        "id": "19282505",
        "date": "2026-10-06",
        "hazardClass": "B",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling in the 5th room from east at south located at apt 3C, 4th story, 1st apartment…",
        "issue": "leak"
      },
      {
        "id": "19282497",
        "date": "2026-10-06",
        "hazardClass": "C",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color at ceiling in the 1st room from east located at apt 3C, 4th story, 1st…",
        "issue": "peeling_paint"
      },
      {
        "id": "19282504",
        "date": "2026-10-06",
        "hazardClass": "B",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color at ceiling in the 5th room from east at south located at apt 3C, 4th story, 1st…",
        "issue": "peeling_paint"
      },
      {
        "id": "19282501",
        "date": "2026-10-06",
        "hazardClass": "B",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color at ceiling in the bathroom located at apt 3C, 4th story, 1st apartment from…",
        "issue": "peeling_paint"
      },
      {
        "id": "19254880",
        "date": "2026-09-25",
        "hazardClass": "B",
        "description": "Properly repair with similar material the broken or defective base cabinet in the kitchen located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": null
      },
      {
        "id": "19254873",
        "date": "2026-09-25",
        "hazardClass": "C",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling in the bathroom located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": "leak"
      },
      {
        "id": "19254879",
        "date": "2026-09-25",
        "hazardClass": "A",
        "description": "Trace and repair the source and abate the visible mold condition... less than 10 sq feet, at east wall in the bathroom located at apt 1E, 2nd story, 1st…",
        "issue": "mold"
      },
      {
        "id": "19254881",
        "date": "2026-09-25",
        "hazardClass": "B",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color at ceiling in the bathroom located at apt 1E, 2nd story, 1st apartment from…",
        "issue": "peeling_paint"
      },
      {
        "id": "19221396",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling in the foyer located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": "leak"
      },
      {
        "id": "19227888",
        "date": "2026-09-16",
        "hazardClass": "A",
        "description": "Paint with light colored paint to the satisfaction of this department all peeling paint surfaces in the bathroom, the foyer, the 1st room from north at east…",
        "issue": "peeling_paint"
      },
      {
        "id": "19221397",
        "date": "2026-09-16",
        "hazardClass": "C",
        "description": "Abate the infestation consisting of roaches in the entire apartment located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": "pests"
      },
      {
        "id": "19221393",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Repair, replace or provide an approved and operational carbon monoxide detecting device, installed in accordance with applicable law and rules missing in the…",
        "issue": null
      },
      {
        "id": "19221394",
        "date": "2026-09-16",
        "hazardClass": "C",
        "description": "Abate the infestation consisting of roaches in the entire apartment located at apt 3B, 4th story, 2nd apartment from east at south",
        "issue": "pests"
      },
      {
        "id": "19221392",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Repair, replace or provide an approved and operational smoke detecting device, installed in accordance with department of buildings rules and regulations…",
        "issue": null
      },
      {
        "id": "19221395",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Properly repair the source and abate the evidence of a water leak at east wall, west wall and ceiling in the bathroom located at apt 1E, 2nd story, 1st…",
        "issue": "leak"
      },
      {
        "id": "19200528",
        "date": "2026-09-07",
        "hazardClass": "A",
        "description": "Properly repair or replace the broken or defective wood cabinet doors at the sink in the kitchen located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": null
      },
      {
        "id": "19200529",
        "date": "2026-09-07",
        "hazardClass": "A",
        "description": "Properly repair with similar material the broken or defective wood west door frame in the bathroom located at apt 1E, 2nd story, 1st apartment from north at…",
        "issue": null
      },
      {
        "id": "19200527",
        "date": "2026-09-07",
        "hazardClass": "B",
        "description": "Properly repair with similar material the broken or defective ceramic floor tiles in the bathroom located at apt 1E, 2nd story, 1st apartment from north at east",
        "issue": null
      },
      {
        "id": "19150364",
        "date": "2026-08-20",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective spring balance at lower window sash at north wall in the 1st room from north at west located at apt 3B, 3rd…",
        "issue": null
      },
      {
        "id": "19150365",
        "date": "2026-08-20",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective base cabinet at north wall in the kitchen located at apt 3B, 3rd story, 2nd apartment from east at south",
        "issue": null
      },
      {
        "id": "19150366",
        "date": "2026-08-20",
        "hazardClass": "B",
        "description": "Properly repair with similar material the broken or defective ceramic tile at south wall in the bathroom located at apt 3B, 3rd story, 2nd apartment from east…",
        "issue": null
      }
    ],
    "sourceUrl": "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5",
    "fetchedAt": "2026-10-24T00:00:00.000Z",
    "source": "demo-fixture"
  },
  "2043220010": {
    "bbl": "2043220010",
    "yearBuilt": 1930,
    "openTotal": 269,
    "byClass": {
      "A": 65,
      "B": 131,
      "C": 73
    },
    "byIssue": {
      "leak": 27,
      "mold": 10,
      "heat_hot_water": 2,
      "pests": 23,
      "lock_door": 16,
      "peeling_paint": 102
    },
    "recent": [
      {
        "id": "19317203",
        "date": "2026-10-19",
        "hazardClass": "C",
        "description": "Replace or repair the self-closing doors that is missing or defective door and frame at hopper door at compactor closet at public hall, 2nd story, section…",
        "issue": "lock_door"
      },
      {
        "id": "19317205",
        "date": "2026-10-19",
        "hazardClass": "C",
        "description": "Properly repair or replace the broken or defective counter-balances at west 1 window top sash in the kitchen located at apt 517, 5th story, 2nd apartment from…",
        "issue": null
      },
      {
        "id": "19317206",
        "date": "2026-10-19",
        "hazardClass": "C",
        "description": "Properly repair or replace the broken or defective counter-balances at west 2 window top sash in the 3rd room from north at west located at apt 517, 5th…",
        "issue": null
      },
      {
        "id": "19317216",
        "date": "2026-10-19",
        "hazardClass": "B",
        "description": "Refit west 2 window top sash in the 4th room from north located at apt 512, 5th story, 1st apartment from south at west, section ''2148''",
        "issue": null
      },
      {
        "id": "19317214",
        "date": "2026-10-19",
        "hazardClass": "B",
        "description": "Refit south 1 window top sash in the 4th room from north located at apt 512, 5th story, 1st apartment from south at west, section ''2148''",
        "issue": null
      },
      {
        "id": "19317212",
        "date": "2026-10-19",
        "hazardClass": "A",
        "description": "Trace and repair the source and abate the visible mold condition... less than 10 square feet observed at ceiling in the bathroom located at apt 512, 5th…",
        "issue": "mold"
      },
      {
        "id": "19317211",
        "date": "2026-10-19",
        "hazardClass": "B",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling in the bathroom located at apt 512, 5th story, 1st apartment from south at west,…",
        "issue": "leak"
      },
      {
        "id": "19317210",
        "date": "2026-10-19",
        "hazardClass": "B",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color at ceiling in the bathroom located at apt 512, 5th story, 1st apartment from…",
        "issue": "peeling_paint"
      },
      {
        "id": "19317207",
        "date": "2026-10-19",
        "hazardClass": "A",
        "description": "Paint with light colored paint to the satisfaction of this department at ceiling & all walls in the bathroom located at apt 517, 5th story, 2nd apartment from…",
        "issue": "peeling_paint"
      },
      {
        "id": "19317200",
        "date": "2026-10-19",
        "hazardClass": "A",
        "description": "Paint with light colored paint to the satisfaction of this department at ceiling at public hall, 5th story, section ''2148'', at south",
        "issue": "peeling_paint"
      },
      {
        "id": "19317201",
        "date": "2026-10-19",
        "hazardClass": "C",
        "description": "Replace or repair the self-closing doors that is missing or defective hinges at compactor closet door at public hall, 2nd story, section ''2148'', at north",
        "issue": "lock_door"
      },
      {
        "id": "19248874",
        "date": "2026-09-25",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective upper window frames at west 2 window and south 1 windows in the 3rd room from north located at apt 512, 5th…",
        "issue": null
      },
      {
        "id": "19248867",
        "date": "2026-09-25",
        "hazardClass": "A",
        "description": "Trace and repair the source and abate the visible mold condition... less than 10sq ft at ceiling in the bathroom located at apt 512, 5th story, 1st apartment…",
        "issue": "mold"
      },
      {
        "id": "19248868",
        "date": "2026-09-25",
        "hazardClass": "B",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling in the bathroom located at apt 512, 5th story, 1st apartment from south at west",
        "issue": "leak"
      },
      {
        "id": "19248869",
        "date": "2026-09-25",
        "hazardClass": "A",
        "description": "Paint with light colored paint to the satisfaction of this department all walls, ceiling, frames, doors, closets, trims, baseboards. in the entire apartment…",
        "issue": "peeling_paint"
      },
      {
        "id": "19248870",
        "date": "2026-09-25",
        "hazardClass": "B",
        "description": "Properly repair with similar material the broken or defective cabinets at north wall in the kitchen located at apt 512, 5th story, 1st apartment from south at…",
        "issue": null
      },
      {
        "id": "19248871",
        "date": "2026-09-25",
        "hazardClass": "B",
        "description": "Replace the broken or defective wash basin in the bathroom located at apt 512, 5th story, 1st apartment from south at west",
        "issue": null
      },
      {
        "id": "19248872",
        "date": "2026-09-25",
        "hazardClass": "C",
        "description": "Abate the infestation consisting of mice in the entire apartment located at apt 512, 5th story, 1st apartment from south at west",
        "issue": "pests"
      },
      {
        "id": "19248873",
        "date": "2026-09-25",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective upper window frame at south 1 window in the 2nd room from north located at apt 512, 5th story, 1st…",
        "issue": null
      },
      {
        "id": "19221315",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Repair, replace or provide an approved and operational smoke detecting device, installed in accordance with department of buildings rules and regulations…",
        "issue": null
      },
      {
        "id": "19221314",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Repair, replace or provide an approved and operational carbon monoxide detecting device, installed in accordance with applicable law and rules missing in the…",
        "issue": null
      },
      {
        "id": "19221312",
        "date": "2026-09-16",
        "hazardClass": "A",
        "description": "Trace and repair the source and abate the visible mold condition... less than 10 sq ft observed at ceiling and west wall in the bathroom located at apt 316,…",
        "issue": "mold"
      },
      {
        "id": "19220307",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling and west wall in the bathroom located at apt 316, 3rd story, 1st apartment from…",
        "issue": "leak"
      },
      {
        "id": "19221313",
        "date": "2026-09-16",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective bell buzzer intrecom system from the building entrance door to the apartment wall panel at north wall in…",
        "issue": null
      },
      {
        "id": "19212546",
        "date": "2026-09-12",
        "hazardClass": "A",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling at vestibule at public hall, 1st story",
        "issue": "leak"
      }
    ],
    "sourceUrl": "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5",
    "fetchedAt": "2026-10-24T00:00:00.000Z",
    "source": "demo-fixture"
  },
  "3051900075": {
    "bbl": "3051900075",
    "yearBuilt": 1931,
    "openTotal": 277,
    "byClass": {
      "A": 41,
      "B": 117,
      "C": 116
    },
    "byIssue": {
      "leak": 16,
      "mold": 12,
      "heat_hot_water": 5,
      "pests": 37,
      "lock_door": 13,
      "peeling_paint": 57
    },
    "recent": [
      {
        "id": "19297933",
        "date": "2026-10-14",
        "hazardClass": "C",
        "description": "Replace or repair the self-closing doors that is missing or defective latch set at door, 1st story",
        "issue": "lock_door"
      },
      {
        "id": "19290471",
        "date": "2026-10-09",
        "hazardClass": "C",
        "description": "Trace and repair the source and abate the visible mold condition... at ceiling and north wall morethan 20 sq.ft. in the bathroom located at apt 4F, 4th story,…",
        "issue": "mold"
      },
      {
        "id": "19290479",
        "date": "2026-10-09",
        "hazardClass": "A",
        "description": "Paint with light colored paint to the satisfaction of this department the south wall in the 4th room from north located at apt 4F, 4th story, 1st apartment…",
        "issue": "peeling_paint"
      },
      {
        "id": "19290478",
        "date": "2026-10-09",
        "hazardClass": "B",
        "description": "Properly repair with similar material the broken or defective caulk around bathtub trim in the bathroom located at apt 4F, 4th story, 1st apartment from east…",
        "issue": null
      },
      {
        "id": "19290477",
        "date": "2026-10-09",
        "hazardClass": "C",
        "description": "Properly repair or replace the broken or defective shut-off valve in the 2nd room from north at east located at apt 4F, 4th story, 1st apartment from east at…",
        "issue": null
      },
      {
        "id": "19290481",
        "date": "2026-10-09",
        "hazardClass": "B",
        "description": "Repair, replace or provide an approved and operational smoke detecting device, installed in accordance with department of buildings rules and regulations…",
        "issue": null
      },
      {
        "id": "19290310",
        "date": "2026-10-09",
        "hazardClass": "B",
        "description": "Properly repair with similar material the broken or defective wood flooring in the private hallway located at apt 6B, 6th story, 1st apartment from south at…",
        "issue": null
      },
      {
        "id": "19290463",
        "date": "2026-10-09",
        "hazardClass": "C",
        "description": "Properly repair or replace the broken or defective air valve at radiator in the 2nd room from north at east located at apt 4F, 4th story, 1st apartment from…",
        "issue": null
      },
      {
        "id": "19290480",
        "date": "2026-10-09",
        "hazardClass": "B",
        "description": "Repair, replace or provide an approved and operational carbon monoxide detecting device, installed in accordance with applicable law and rules device…",
        "issue": null
      },
      {
        "id": "19288619",
        "date": "2026-10-07",
        "hazardClass": "C",
        "description": "Provide an adequate supply of gas to the fixtures range in the entire apartment located at apt 3F, 3rd story, 1st apartment from east at south",
        "issue": null
      },
      {
        "id": "19288620",
        "date": "2026-10-07",
        "hazardClass": "B",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color at north wall in the kitchen located at apt 3F, 3rd story, 1st apartment from…",
        "issue": "peeling_paint"
      },
      {
        "id": "19288621",
        "date": "2026-10-07",
        "hazardClass": "B",
        "description": "Replace with new the missing electric outlet cover in the kitchen located at apt 3F, 3rd story, 1st apartment from east at south",
        "issue": null
      },
      {
        "id": "19264560",
        "date": "2026-10-01",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective locking device at entrance door north wall in the foyer located at apt 2C, 2nd story, 2nd apartment from…",
        "issue": "lock_door"
      },
      {
        "id": "19264540",
        "date": "2026-10-01",
        "hazardClass": "C",
        "description": "Properly repair the source and abate the evidence of a water leak at ceiling ceiling in the bathroom located at apt 2C, 2nd story, 2nd apartment from east at…",
        "issue": "leak"
      },
      {
        "id": "19274145",
        "date": "2026-10-01",
        "hazardClass": "C",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color the ceiling in the 3rd room from north located at apt 1B, 1st story, 1st…",
        "issue": "peeling_paint"
      },
      {
        "id": "19274672",
        "date": "2026-10-01",
        "hazardClass": "A",
        "description": "Paint with light colored paint to the satisfaction of this department all peeling paint surfaces in the kitchen, the foyer, the bathroom located at apt 2C,…",
        "issue": "peeling_paint"
      },
      {
        "id": "19264533",
        "date": "2026-10-01",
        "hazardClass": "C",
        "description": "Properly repair with similar material the broken or defective carcked,dislodged brick wall with deterioartaed and missing mortar at joints, 6th story and,…",
        "issue": null
      },
      {
        "id": "19264534",
        "date": "2026-10-01",
        "hazardClass": "C",
        "description": "Abate the nuisance consisting of evidence of rats and all underlying causes creating the pest infestations, by using integrated pest management (ipm),…",
        "issue": "pests"
      },
      {
        "id": "19264535",
        "date": "2026-10-01",
        "hazardClass": "B",
        "description": "Properly repair or replace the broken or defective bowed steel lintels with deteriorated and missing mortar at joints to 3rd windows openings from north,…",
        "issue": null
      },
      {
        "id": "19264536",
        "date": "2026-10-01",
        "hazardClass": "B",
        "description": "Fire egress defective. remove the obstruction in fireproof passageway the storage of construction materials at north wall to exit corridor, northwest section,…",
        "issue": null
      },
      {
        "id": "19264537",
        "date": "2026-10-01",
        "hazardClass": "C",
        "description": "Properly repair or replace the broken or defective cracked wired glass at, lower sash window to, north wall, west section at public hall, 2nd story",
        "issue": null
      },
      {
        "id": "19264538",
        "date": "2026-10-01",
        "hazardClass": "A",
        "description": "Trace and repair the source and abate the visible mold condition... less than 10 sqft observed at 1st window frame from north at east wall in the bathroom…",
        "issue": "mold"
      },
      {
        "id": "19264539",
        "date": "2026-10-01",
        "hazardClass": "A",
        "description": "Trace and repair the source and abate the visible mold condition... less tgan 10 sqft observed at ceiling in the bathroom located at apt 2C, 2nd story, 2nd…",
        "issue": "mold"
      },
      {
        "id": "19264541",
        "date": "2026-10-01",
        "hazardClass": "A",
        "description": "Repair the broken or defective plastered surfaces and paint in a uniform color the west wall in the 1st room from north at west located at apt 2C, 2nd story,…",
        "issue": "peeling_paint"
      },
      {
        "id": "19264542",
        "date": "2026-10-01",
        "hazardClass": "A",
        "description": "Paint metal in accordance with dept. regulation the 1st radiator from south at west wall in the 2nd room from north at west located at apt 2C, 2nd story, 2nd…",
        "issue": "peeling_paint"
      }
    ],
    "sourceUrl": "https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5",
    "fetchedAt": "2026-10-24T00:00:00.000Z",
    "source": "demo-fixture"
  }
};

const REGISTRATIONS: Record<string, { asOf: string; rows: RegistrationRow[]; contacts: ContactRow[] }> = {
  "1020020091": r1020020091,
  "2043220010": r2043220010,
  "3051900075": r3051900075,
};

const SIGNALS: Record<string, SignalRows & { since: string }> = {
  "1020020091": s1020020091,
  "2043220010": s2043220010,
  "3051900075": s3051900075,
};

/** The saved summary for a demo BBL (with its saved HPD registration and signals), or null for any other building. */
export function demoBuilding(bbl: string): BuildingRecord | null {
  const record = DEMO_BUILDINGS[bbl];
  const reg = REGISTRATIONS[bbl];
  const sig = SIGNALS[bbl];
  return record && reg && sig
    ? { ...record, registration: registrationInfo(reg.rows, reg.contacts, {}, reg.asOf), signals: buildSignals(sig.since, sig) }
    : null;
}
