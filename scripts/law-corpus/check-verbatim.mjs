// node check-verbatim.mjs <corpus.json> : every passage (every line, for HPD) must appear in its source text,
// compared with all whitespace removed. Independent of the section/subdivision splitting in build-corpus.mjs.
import { readFileSync } from "node:fs";
import { htmlToText } from "./html2text.mjs";

const dir = new URL(".", import.meta.url).pathname;
const squash = (s) => s.replace(/\s+/g, "");
const hmc = squash(
  readFileSync(dir + "hmc-dob.txt", "utf8")
    .split(/\n|\f/)
    .filter((l) => !/^\s*(\d*TITLE 27 – CHAPTER 2|NEW YORK CITY HOUSING MAINTENANCE CODE|\d+)\s*$/.test(l))
    .join("\n"),
);
const cert = squash(readFileSync(dir + "cert.txt", "utf8"));
const pages = {};
let bad = 0;
for (const p of JSON.parse(readFileSync(process.argv[2], "utf8"))) {
  let ok;
  if (p.id.startsWith("hmc-")) ok = hmc.includes(squash(p.text));
  else if (p.id === "hpd-class-c-report") ok = cert.includes(squash(p.text));
  else {
    const page = new URL(p.url).pathname.split("/").pop().replace(".page", "");
    pages[page] ??= squash(htmlToText(readFileSync(`${dir}hpd-${page}.html`, "utf8")));
    ok = p.text.split("\n").every((line) => pages[page].includes(squash(line)));
  }
  if (!ok) {
    bad++;
    console.log("NOT VERBATIM:", p.id);
  }
}
console.log(bad ? `${bad} failed` : "all passages verbatim");
