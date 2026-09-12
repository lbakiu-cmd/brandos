const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create the Master SVG for BrandOS EYE
function createSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="50%" stop-color="#060911" />
      <stop offset="100%" stop-color="#020408" />
    </linearGradient>

    <!-- Border Glow Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6" />
      <stop offset="40%" stop-color="#3b82f6" stop-opacity="0.3" />
      <stop offset="80%" stop-color="#6366f1" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.2" />
    </linearGradient>

    <!-- Eye Outer Stroke Gradient -->
    <linearGradient id="eyeStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="45%" stop-color="#3b82f6" />
      <stop offset="80%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>

    <!-- Iris Glow Gradient -->
    <radialGradient id="irisGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="25%" stop-color="#67e8f9" />
      <stop offset="55%" stop-color="#0284c7" />
      <stop offset="85%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#090d16" stop-opacity="0" />
    </radialGradient>

    <!-- Pupil Core Gradient -->
    <linearGradient id="pupilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a5f3fc" />
      <stop offset="40%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>

    <!-- Beam / Flare Gradient -->
    <linearGradient id="beamGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0" />
      <stop offset="35%" stop-color="#38bdf8" stop-opacity="0.4" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="65%" stop-color="#6366f1" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
    </linearGradient>

    <!-- Subtle Drop Glow Filter -->
    <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="coreGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Squircle Rounded Base (Optimized for App Icons & Favicon visibility) -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)" />
  <rect x="16" y="16" width="480" height="480" rx="108" fill="none" stroke="url(#borderGrad)" stroke-width="4" />

  <!-- Ambient Backdrop Glow Behind Eye -->
  <circle cx="256" cy="256" r="140" fill="url(#irisGlow)" opacity="0.4" />

  <!-- Subtle Horizontal Vision Radar Line -->
  <path d="M 64 256 L 448 256" stroke="url(#beamGrad)" stroke-width="3" stroke-linecap="round" />

  <!-- Outer Upper & Lower Eyelids (Sleek Futuristic Eye) -->
  <!-- Upper Eyelid -->
  <path d="M 88 256 C 140 148, 372 148, 424 256" 
        fill="none" 
        stroke="url(#eyeStrokeGrad)" 
        stroke-width="32" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        filter="url(#cyanGlow)" />

  <!-- Lower Eyelid -->
  <path d="M 88 256 C 140 364, 372 364, 424 256" 
        fill="none" 
        stroke="url(#eyeStrokeGrad)" 
        stroke-width="32" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        filter="url(#cyanGlow)" />

  <!-- Iris Cybernetic Outer Ring -->
  <circle cx="256" cy="256" r="88" 
          fill="#070d1a" 
          stroke="url(#pupilGrad)" 
          stroke-width="12" />

  <!-- Iris Inner Concentric Aperture Ring -->
  <circle cx="256" cy="256" r="62" 
          fill="none" 
          stroke="#38bdf8" 
          stroke-width="5" 
          stroke-dasharray="14 8" 
          opacity="0.85" />

  <!-- Glowing Central Pupil -->
  <circle cx="256" cy="256" r="38" 
          fill="url(#pupilGrad)" 
          filter="url(#coreGlow)" />

  <!-- Center AI Spark / Glint (Vision Focus) -->
  <path d="M 256 230 Q 256 256 230 256 Q 256 256 256 282 Q 256 256 282 256 Q 256 256 256 230 Z" 
        fill="#ffffff" />
  <circle cx="256" cy="256" r="6" fill="#ffffff" />
  
  <!-- Subtle Top Glint Reflection -->
  <ellipse cx="242" cy="242" rx="7" ry="4" transform="rotate(-30 242 242)" fill="#ffffff" opacity="0.8" />
</svg>`;
}

// Function to generate a transparent SVG version (for direct SVG icon usage in browser tab bars)
function createSvgTransparent() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="eyeStrokeGradT" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="45%" stop-color="#3b82f6" />
      <stop offset="80%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <radialGradient id="irisGlowT" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6" />
      <stop offset="50%" stop-color="#2563eb" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="pupilGradT" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a5f3fc" />
      <stop offset="40%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
  </defs>

  <circle cx="256" cy="256" r="150" fill="url(#irisGlowT)" />

  <!-- Upper Eyelid -->
  <path d="M 64 256 C 120 128, 392 128, 448 256" 
        fill="none" 
        stroke="url(#eyeStrokeGradT)" 
        stroke-width="40" 
        stroke-linecap="round" 
        stroke-linejoin="round" />

  <!-- Lower Eyelid -->
  <path d="M 64 256 C 120 384, 392 384, 448 256" 
        fill="none" 
        stroke="url(#eyeStrokeGradT)" 
        stroke-width="40" 
        stroke-linecap="round" 
        stroke-linejoin="round" />

  <!-- Iris Ring -->
  <circle cx="256" cy="256" r="96" fill="#090d16" stroke="url(#pupilGradT)" stroke-width="16" />
  
  <!-- Dashed Ring -->
  <circle cx="256" cy="256" r="68" fill="none" stroke="#38bdf8" stroke-width="6" stroke-dasharray="16 10" opacity="0.9" />

  <!-- Pupil -->
  <circle cx="256" cy="256" r="42" fill="url(#pupilGradT)" />

  <!-- Center AI Spark -->
  <path d="M 256 226 Q 256 256 226 256 Q 256 256 256 286 Q 256 256 286 256 Q 256 256 256 226 Z" fill="#ffffff" />
  <circle cx="256" cy="256" r="7" fill="#ffffff" />
</svg>`;
}

// Function to assemble Windows/Browser ICO from PNG buffers
function createIco(pngBuffersWithSizes) {
  // pngBuffersWithSizes: Array of { size: number, buffer: Buffer }
  const count = pngBuffersWithSizes.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + count * dirEntrySize;

  let offset = totalHeaderSize;
  const dirEntries = [];

  for (const item of pngBuffersWithSizes) {
    const width = item.size >= 256 ? 0 : item.size;
    const height = item.size >= 256 ? 0 : item.size;
    const sizeInBytes = item.buffer.length;

    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(width, 0); // Width
    entry.writeUInt8(height, 1); // Height
    entry.writeUInt8(0, 2); // Color palette count (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(sizeInBytes, 8); // Image data size in bytes
    entry.writeUInt32LE(offset, 12); // Image data offset

    dirEntries.push(entry);
    offset += sizeInBytes;
  }

  // ICO header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved (must be 0)
  header.writeUInt16LE(1, 2); // Image type (1 = ICO)
  header.writeUInt16LE(count, 4); // Number of images

  return Buffer.concat([header, ...dirEntries, ...pngBuffersWithSizes.map((i) => i.buffer)]);
}

async function run() {
  console.log('🎨 Generating BrandOS EYE Favicons and Icons...');

  const svgContent = createSvg();
  const svgTransparent = createSvgTransparent();
  const svgBuffer = Buffer.from(svgContent);

  const publicDir = path.resolve(__dirname, '..', 'apps', 'web', 'public');
  const appDir = path.resolve(__dirname, '..', 'apps', 'web', 'src', 'app');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

  // 1. Save SVG icons
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'icon-transparent.svg'), svgTransparent);
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgContent);
  console.log('✅ Saved favicon.svg & app/icon.svg');

  // 2. Generate PNGs of different resolutions
  const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];
  const pngBuffers = {};

  for (const size of sizes) {
    const buf = await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    pngBuffers[size] = buf;
  }

  // Write PNG files to public
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), pngBuffers[16]);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), pngBuffers[32]);
  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), pngBuffers[48]);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffers[180]);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), pngBuffers[192]);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), pngBuffers[512]);

  // Next.js App Router root icons
  fs.writeFileSync(path.join(appDir, 'icon.png'), pngBuffers[512]);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), pngBuffers[180]);
  console.log('✅ Generated standard PNG icons (16, 32, 48, 180, 192, 512)');

  // 3. Create Multi-size ICO file
  const icoSizes = [16, 32, 48];
  const icoItems = icoSizes.map((s) => ({ size: s, buffer: pngBuffers[s] }));
  const icoBuffer = createIco(icoItems);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log('✅ Generated multi-size binary favicon.ico (16, 32, 48)');

  // 4. Create site.webmanifest
  const webmanifest = {
    name: 'AIVisibility SEO',
    short_name: 'AIVisibility SEO',
    description: 'AI Visibility & Omnichannel SEO Engine for Small Business',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: '#020617',
    background_color: '#020617',
    display: 'standalone',
  };
  fs.writeFileSync(
    path.join(publicDir, 'site.webmanifest'),
    JSON.stringify(webmanifest, null, 2)
  );
  console.log('✅ Generated site.webmanifest');

  console.log('\n🎉 Favicon & Icon Generation Complete!');
}

run().catch((err) => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
