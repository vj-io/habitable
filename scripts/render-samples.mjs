// Renders scripts/samples/*.jpg (real photos, credited below) -> public/samples/*.jpg (+ EXIF) and writes manifest.json.
// Usage: node scripts/render-samples.mjs   (needs `npx playwright install chromium` once)
import { chromium } from '@playwright/test';
import exifr from 'exifr';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'scripts/samples');
const outDir = path.join(root, 'public/samples');
const MAX_BYTES = 250 * 1024;

// id, label, expectedIssue, EXIF capture time (NYC local, EDT = -04:00 on all of these dates), output size, credit
// Photos from Wikimedia Commons, cropped and resized; each keeps its own license (listed in THIRD-PARTY-NOTICES.md).
const SCENES = [
  ['leak-ceiling', 'Water-stained ceiling tile', 'leak', '2026:10:15 07:42:10', [1200, 900],
    { author: 'Atomicdragon136', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:Ceiling_water_damage.jpg' }],
  ['mold-bathroom', "Black mold along the tub's edge", 'mold', '2026:10:12 19:05:33', [1200, 900],
    { author: 'Tony Webster', license: 'CC BY-SA 2.0', source: 'https://commons.wikimedia.org/wiki/File:Moldy_Shower_-_Black_Mold_Growth_in_Bathroom_(46195388355).jpg' }],
  ['cold-radiator', 'Old cast-iron radiator, no heat', 'heat_hot_water', '2026:10:20 06:58:02', [1200, 900],
    { author: 'Dominic Alves', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Ornate_Cast_Iron_Radiator_-_Brian_Eno_Speaker_Flowers_Sound_Installation_at_Marlborough_House.jpg' }],
  ['mice-kitchen', 'Mouse caught in a snap trap', 'pests', '2026:10:18 22:14:47', [900, 1200],
    { author: 'Rathfelder', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Caught_a_mouse.jpg' }],
  ['broken-lock', 'Door with the lock torn out', 'lock_door', '2026:10:21 23:31:09', [900, 1200],
    { author: 'SeppVei', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Broken_door_lock.JPG' }],
  ['peeling-paint', 'Cracked, peeling paint', 'peeling_paint', '2026:10:09 16:20:55', [1200, 900],
    { author: 'Lamiot', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Peinture_blc.jpg' }],
  ['ambiguous-stain', 'Faint stain where wall meets ceiling', 'ambiguous', '2026:10:22 12:03:40', [1200, 900],
    { author: 'Ed! (Photography Gallery)', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Water_Damage.JPG' }],
];

// Minimal EXIF APP1: little-endian TIFF, IFD0 {Make, Model, DateTime, ExifIFD ptr} + Exif IFD {DateTimeOriginal}. No GPS.
function exifSegment(dt) {
  const asc = (s) => Buffer.from(s + '\0', 'latin1');
  const make = asc('Habitable');
  const model = asc('Sample scene');
  const date = asc(dt);
  const even = (n) => n + (n & 1);
  const ifd0 = 8; // IFD0 starts right after the 8-byte TIFF header: 2 + 4*12 + 4 bytes
  let off = ifd0 + 54;
  const oMake = off; off += even(make.length);
  const oModel = off; off += even(model.length);
  const oDate = off; off += even(date.length);
  const oExif = off; off += 2 + 12 + 4; // Exif IFD: count + 1 entry + next ptr
  const oDTO = off; off += even(date.length);
  const t = Buffer.alloc(off);
  t.write('II', 0, 'latin1'); t.writeUInt16LE(42, 2); t.writeUInt32LE(8, 4);
  const entry = (p, tag, type, count, val) => {
    t.writeUInt16LE(tag, p); t.writeUInt16LE(type, p + 2); t.writeUInt32LE(count, p + 4); t.writeUInt32LE(val, p + 8);
  };
  t.writeUInt16LE(4, ifd0);
  entry(ifd0 + 2, 0x010f, 2, make.length, oMake);
  entry(ifd0 + 14, 0x0110, 2, model.length, oModel);
  entry(ifd0 + 26, 0x0132, 2, date.length, oDate);
  entry(ifd0 + 38, 0x8769, 4, 1, oExif);
  make.copy(t, oMake); model.copy(t, oModel); date.copy(t, oDate);
  t.writeUInt16LE(1, oExif);
  entry(oExif + 2, 0x9003, 2, date.length, oDTO);
  date.copy(t, oDTO);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), t]);
  return Buffer.concat([Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 0xff]), body]);
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium' });
const manifest = [];
let failed = false;

for (const [id, label, expectedIssue, dt, [w, h], credit] of SCENES) {
  const file = path.join(srcDir, `${id}.jpg`);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0}img{display:block;width:${w}px;height:${h}px;object-fit:cover}</style><img src="data:image/jpeg;base64,${readFileSync(file).toString('base64')}">`);
  await page.locator('img').evaluate((img) => img.decode());
  let jpg;
  for (const quality of [85, 80, 75, 70, 65]) {
    jpg = await page.screenshot({ type: 'jpeg', quality });
    if (jpg.length < MAX_BYTES) break;
  }
  await page.close();
  jpg = Buffer.concat([jpg.subarray(0, 2), exifSegment(dt), jpg.subarray(2)]); // APP1 right after SOI
  writeFileSync(path.join(outDir, `${id}.jpg`), jpg);

  const tags = await exifr.parse(jpg, { reviveValues: false });
  const gps = await exifr.gps(jpg);
  const ok = tags?.DateTimeOriginal === dt && tags?.ModifyDate === dt && tags?.Make === 'Habitable' && tags?.Model === 'Sample scene' && !gps && jpg.length < MAX_BYTES;
  if (!ok) failed = true;
  const revived = (await exifr.parse(jpg)).DateTimeOriginal;
  console.log(`${ok ? 'ok ' : 'BAD'} ${id}.jpg ${w}x${h} ${(jpg.length / 1024).toFixed(1)} KB DateTimeOriginal=${tags?.DateTimeOriginal} (revived ${revived?.toString()}) ModifyDate(DateTime)=${tags?.ModifyDate} Make=${tags?.Make} Model=${tags?.Model} gps=${gps ? 'PRESENT' : 'none'}`);

  const [d, tm] = dt.split(' ');
  manifest.push({ id, file: `/samples/${id}.jpg`, label, expectedIssue, capturedAt: `${d.replaceAll(':', '-')}T${tm}-04:00`, credit });
}

await browser.close();
writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (failed) { console.error('verification failed'); process.exit(1); }
