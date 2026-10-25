// The law text "Ask the law" may quote: verbatim passages copied from official pages on the date in
// `retrieved`. NYC Housing Maintenance Code text comes from the NYC Buildings compilation
// (https://www.nyc.gov/assets/buildings/pdf/HousingMaintenanceCode.pdf, dated Apr 17, 2026), split at
// subdivision boundaries; HPD excerpts are whole lines of the cited nyc.gov page. Nothing is paraphrased.
import data from "./corpus.json";

export interface Passage {
  id: string;
  /** Where the text is from, e.g. "NYC Housing Maintenance Code (Admin. Code Title 27, Ch. 2)". */
  source: string;
  /** "§27-2029(a)", or "HPD guidance" for agency pages. */
  section: string;
  title: string;
  /** Official https page; PDF links carry #page=N. */
  url: string;
  /** Verbatim official text. Lines of an HPD page or table are separated by "\n". */
  text: string;
  /** YYYY-MM-DD the text was copied. */
  retrieved: string;
}

export const PASSAGES: Passage[] = data;
export const PASSAGE_BY_ID = new Map(PASSAGES.map((p) => [p.id, p]));

/** Law text (a code section) rather than an agency's own explanation. */
export const isLawText = (p: Passage) => p.section.startsWith("§");
