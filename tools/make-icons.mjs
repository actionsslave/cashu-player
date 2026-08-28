/**
 * Erzeugt die PWA-Icons als PNG (FR-31: 192 und 512 Pixel).
 * Läuft einmalig über `node tools/make-icons.mjs`; kein Laufzeit-Code.
 * Eigener Encoder statt Bildbibliothek — zlib bringt Node schon mit.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CRC_TABLE = Array.from({ length: 256 }, (_unused, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // Farbtyp: RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // Filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const LILA = [124, 58, 237];
const WEISS = [250, 250, 250];

/** Lila Fläche, weißer Ring, lila Kern — als Marke reicht das. */
function icon(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const distance = Math.hypot(x - cx + 0.5, y - cy + 0.5);
  if (distance < size * 0.16) return LILA;
  if (distance < size * 0.34) return WEISS;
  return LILA;
}

const target = join(import.meta.dirname, '..', 'public');
for (const size of [192, 512]) {
  writeFileSync(join(target, `icon-${size}.png`), png(size, icon));
  process.stdout.write(`icon-${size}.png geschrieben\n`);
}
