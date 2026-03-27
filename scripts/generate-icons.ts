/**
 * Generate PWA icons from an SVG template.
 * Run: npx tsx scripts/generate-icons.ts
 *
 * Creates PNG icons at all required sizes using a canvas-free SVG approach.
 * For production, replace with actual designed icons.
 */
import { writeFileSync } from "fs";
import { join } from "path";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateSvg(size: number): string {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0f172a"/>
  <g transform="translate(${pad},${pad})">
    <rect x="${inner * 0.15}" y="${inner * 0.55}" width="${inner * 0.7}" height="${inner * 0.35}" rx="${inner * 0.04}" fill="#3b82f6"/>
    <path d="M${inner * 0.5},${inner * 0.12} L${inner * 0.82},${inner * 0.48} L${inner * 0.18},${inner * 0.48} Z" fill="#3b82f6"/>
    <rect x="${inner * 0.38}" y="${inner * 0.32}" width="${inner * 0.24}" height="${inner * 0.08}" rx="${inner * 0.02}" fill="#0f172a"/>
    <text x="${inner * 0.5}" y="${inner * 0.78}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${inner * 0.16}" fill="white">SP</text>
  </g>
</svg>`;
}

const outDir = join(process.cwd(), "public", "icons");

for (const size of sizes) {
  const svg = generateSvg(size);
  writeFileSync(join(outDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Generated icon-${size}x${size}.svg`);
}

// Also generate apple-touch-icon (180x180)
writeFileSync(join(outDir, "apple-touch-icon.svg"), generateSvg(180));
console.log("Generated apple-touch-icon.svg");
console.log("Done. For production, replace SVGs with designed PNG icons.");
