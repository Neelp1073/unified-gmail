import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "icons");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, c]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width * 4 + 1);
    raw[offset] = 0;
    rgba.copy(raw, offset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}

function mix(a, b, t) {
  const k = Math.min(1, Math.max(0, t));
  return a + (b - a) * k;
}

function cover(dist, width = 0.65) {
  return Math.min(1, Math.max(0, 0.5 - dist / width));
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = size <= 32 ? 4 : 3;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          const nx = (px / size) * 32;
          const ny = (py / size) * 32;

          const plate = sdRoundRect(nx, ny, 16, 16, 13.2, 13.2, 7.2);
          const plateA = cover(plate);
          const glow = Math.min(1, Math.max(0, (18 - Math.hypot(nx - 12, ny - 11)) / 18));

          let cr = mix(67, 124, glow);
          let cg = mix(62, 92, glow);
          let cb = mix(215, 255, glow);

          const flap = sdRoundRect(nx, ny, 16, 14.6, 8.6, 6.4, 2.2);
          const body = sdRoundRect(nx, ny, 16, 17.4, 8.6, 6.6, 2.4);
          const mail = Math.min(flap, body);
          const mailA = cover(mail);

          const crease =
            Math.abs(ny - (11.4 + Math.abs(nx - 16) * 0.42)) - 0.55;
          const creaseA = cover(crease) * cover(Math.abs(nx - 16) - 7.4);

          const stack = sdRoundRect(nx + 1.6, ny + 2.1, 16, 17.6, 7.8, 5.8, 2);
          const stackA = cover(stack) * 0.45;

          if (stackA > 0) {
            cr = mix(cr, 255, stackA);
            cg = mix(cg, 255, stackA);
            cb = mix(cb, 255, stackA);
          }
          if (mailA > 0) {
            cr = mix(cr, 255, mailA);
            cg = mix(cg, 252, mailA);
            cb = mix(cb, 248, mailA);
          }
          if (creaseA > 0 && mailA > 0.2) {
            cr = mix(cr, 79, creaseA * 0.55);
            cg = mix(cg, 70, creaseA * 0.55);
            cb = mix(cb, 229, creaseA * 0.55);
          }

          r += cr;
          g += cg;
          b += cb;
          a += plateA * 255;
        }
      }

      const n = samples * samples;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }

  return rgba;
}

fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const png = encodePng(size, size, drawIcon(size));
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
}

console.log(`Wrote icons to ${outDir}`);
