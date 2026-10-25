# Law corpus build (src/lib/law/corpus.json)

The corpus is copied word for word from official text; nothing is typed by hand.

1. Download the sources into this folder (they are not committed):
   - `HousingMaintenanceCode.pdf` from https://www.nyc.gov/assets/buildings/pdf/HousingMaintenanceCode.pdf
     (NYC Buildings compilation, created Apr 17, 2026), then
     `osascript -l JavaScript pdftext.js HousingMaintenanceCode.pdf > hmc-dob.txt` (macOS PDFKit text layer).
   - HPD's CY25 certification report PDF cited in `src/lib/rules.json`, the same way, into `cert.txt`.
   - The HPD pages named in `build-corpus.mjs` as `hpd-<page>.html` (e.g. `hpd-clear-violations.html`).
2. `node build-corpus.mjs . ../../src/lib/law/corpus.json`
3. `node check-verbatim.mjs ../../src/lib/law/corpus.json`: every passage must appear in its source with
   whitespace removed (independent of how build-corpus split the sections).

Not yet included: NYS Real Property Law §235-b and §223-b (nysenate.gov served a bot challenge to scripted
requests on 2026-10-25). The /ask page says state law isn't covered.
