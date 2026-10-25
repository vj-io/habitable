// osascript -l JavaScript pdftext.js <in.pdf> : prints the PDF's text layer (PDFKit), pages separated by form feeds.
ObjC.import("PDFKit");
function run(argv) {
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  const out = [];
  for (let i = 0; i < doc.pageCount; i++) out.push(doc.pageAtIndex(i).string.js);
  return out.join("\f");
}
