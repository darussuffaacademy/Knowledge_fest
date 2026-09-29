import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// 1. High-fidelity Vector SVG for standard & maskable icons
// Safe zone: All important visual elements are within center 80% circle (radius ~195 in 512x512)
const svgFullBleed = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DE2338" />
      <stop offset="50%" stop-color="#C21D2E" />
      <stop offset="100%" stop-color="#8E0F1E" />
    </linearGradient>

    <!-- Gold Foil Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE082" />
      <stop offset="40%" stop-color="#F9B344" />
      <stop offset="100%" stop-color="#C87A14" />
    </linearGradient>

    <!-- Inner Crest Radial Gradient -->
    <radialGradient id="crestGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#3A080E" />
      <stop offset="100%" stop-color="#140205" />
    </radialGradient>

    <!-- Drop Shadow Filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.45" />
    </filter>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#F9B344" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Full Bleed Solid Background (Ensures zero black or white borders on Android Adaptive Launcher) -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Subtle Ambient Corner Accents -->
  <circle cx="256" cy="256" r="235" fill="none" stroke="#F9B344" stroke-width="2" stroke-opacity="0.25" stroke-dasharray="8 8" />

  <!-- Safe-zone Medallion Circle (Radius 184, well inside 80% 204px safe zone) -->
  <g filter="url(#shadow)">
    <!-- Outer Gold Ring -->
    <circle cx="256" cy="256" r="184" fill="none" stroke="url(#goldGrad)" stroke-width="9" />
    <!-- Secondary Thin Gold Trim -->
    <circle cx="256" cy="256" r="172" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-opacity="0.8" />
    <!-- Inner Deep Dark Medallion -->
    <circle cx="256" cy="256" r="170" fill="url(#crestGrad)" />
  </g>

  <!-- Crown / Star at Top of Medallion -->
  <g transform="translate(256, 126)" filter="url(#glow)">
    <!-- 4-Point Diamond Star -->
    <path d="M 0 -22 L 6 -5 L 22 0 L 6 5 L 0 22 L -6 5 L -22 0 L -6 -5 Z" fill="url(#goldGrad)" />
    <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
  </g>

  <!-- Central Stylized 'A' Crest -->
  <g filter="url(#shadow)">
    <!-- Left Leg of A -->
    <path d="M 256 160 L 194 308 L 226 308 L 243 264 L 269 264 L 286 308 L 318 308 Z M 256 220 L 263 242 L 249 242 Z"
          fill="url(#goldGrad)" stroke="#FFE899" stroke-width="1.5" />
    <!-- Inner Cross Accent -->
    <path d="M 235 254 L 277 254" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
  </g>

  <!-- Laurel Garland Leaves at Bottom -->
  <g fill="url(#goldGrad)" stroke="#C87A14" stroke-width="0.75" opacity="0.95">
    <!-- Left Leaf Branch -->
    <path d="M 188 322 C 176 332 172 344 178 350 C 188 348 198 338 202 328 Z" />
    <path d="M 206 336 C 196 348 196 360 204 364 C 212 360 218 348 220 338 Z" />
    <path d="M 228 346 C 222 358 224 370 234 372 C 240 366 242 354 240 344 Z" />

    <!-- Right Leaf Branch -->
    <path d="M 324 322 C 336 332 340 344 334 350 C 324 348 314 338 310 328 Z" />
    <path d="M 306 336 C 316 348 316 360 308 364 C 300 360 294 348 292 338 Z" />
    <path d="M 284 346 C 290 358 288 370 278 372 C 272 366 270 354 272 344 Z" />

    <!-- Center Ribbon Knot -->
    <circle cx="256" cy="358" r="6" fill="#F9B344" />
  </g>

  <!-- Typography: AMAZIO 2026 -->
  <!-- Top Arc Text Label -->
  <text x="256" y="162" text-anchor="middle" font-family="'Montserrat', 'Arial Black', sans-serif" font-weight="900" font-size="16" fill="#FFE082" letter-spacing="7">AMAZIO</text>
  
  <!-- Year Banner in Center -->
  <rect x="224" y="322" width="64" height="18" rx="9" fill="#C21D2E" stroke="url(#goldGrad)" stroke-width="1.5" />
  <text x="256" y="335" text-anchor="middle" font-family="'Arial Black', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" letter-spacing="2">2026</text>
</svg>
`;

async function generateAssets() {
  console.log('Generating high-resolution PWA and Android Launcher icons with sharp...');

  const dirs = [
    './public',
    './public/icons',
    './icons',
    '.'
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  // Save SVG
  fs.writeFileSync('./public/icon.svg', svgFullBleed.trim());
  fs.writeFileSync('./icon.svg', svgFullBleed.trim());

  const svgBuffer = Buffer.from(svgFullBleed);

  // Generate 512x512 base PNG
  const png512 = await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  // Generate 192x192 base PNG
  const png192 = await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  // Generate 180x180 Apple Touch PNG
  const png180 = await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  // Write all standard and maskable icons into all standard paths
  const targets = [
    // public/icons
    { path: './public/icons/pwa-512x512.png', buf: png512 },
    { path: './public/icons/pwa-maskable-512x512.png', buf: png512 },
    { path: './public/icons/pwa-192x192.png', buf: png192 },
    { path: './public/icons/pwa-maskable-192x192.png', buf: png192 },
    { path: './public/icons/apple-touch-icon-180x180.png', buf: png180 },
    { path: './public/icons/apple-touch-icon.png', buf: png180 },
    { path: './public/icons/shortcut-data-entry.png', buf: png192 },
    { path: './public/icons/shortcut-scoring.png', buf: png192 },
    { path: './public/icons/shortcut-schedule.png', buf: png192 },

    // public root (direct fallback access)
    { path: './public/pwa-512x512.png', buf: png512 },
    { path: './public/pwa-maskable-512x512.png', buf: png512 },
    { path: './public/pwa-192x192.png', buf: png192 },
    { path: './public/pwa-maskable-192x192.png', buf: png192 },
    { path: './public/apple-touch-icon.png', buf: png180 },
    { path: './public/favicon.png', buf: png192 },

    // repository root icons/
    { path: './icons/pwa-512x512.png', buf: png512 },
    { path: './icons/pwa-maskable-512x512.png', buf: png512 },
    { path: './icons/pwa-192x192.png', buf: png192 },
    { path: './icons/pwa-maskable-192x192.png', buf: png192 },
    { path: './icons/apple-touch-icon-180x180.png', buf: png180 },
    { path: './icons/apple-touch-icon.png', buf: png180 },

    // repository root
    { path: './apple-touch-icon.png', buf: png180 },
    { path: './favicon.png', buf: png192 }
  ];

  for (const t of targets) {
    fs.writeFileSync(t.path, t.buf);
    console.log(`Created: ${t.path} (${t.buf.length} bytes)`);
  }

  console.log('All icons successfully created with sharp!');
}

generateAssets().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
