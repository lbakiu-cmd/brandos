const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

// Simple pure Node.js ZIP archive creator compliant with ZIP spec (APPNOTE.TXT)
// storing UNIX forward slashes in header paths
class ZipWriter {
  constructor() {
    this.entries = [];
  }

  addFile(zipPath, buffer) {
    // Normalise to forward slashes, no leading slash
    const cleanPath = zipPath.replace(/\\/g, "/").replace(/^\/+/, "");
    this.entries.push({ path: cleanPath, data: buffer });
  }

  toBuffer() {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const entry of this.entries) {
      const pathBuf = Buffer.from(entry.path, "utf8");
      const uncompressedData = entry.data;
      const crc = crc32(uncompressedData);
      
      // Deflate
      const compressedData = zlib.deflateRawSync(uncompressedData, { level: 9 });
      const compSize = compressedData.length;
      const uncompSize = uncompressedData.length;

      // Local file header (30 bytes + path + extra)
      const localHeader = Buffer.alloc(30 + pathBuf.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // signature
      localHeader.writeUInt16LE(20, 4);         // version needed (2.0)
      localHeader.writeUInt16LE(0x0800, 6);     // flags (UTF-8)
      localHeader.writeUInt16LE(8, 8);          // compression method (Deflate = 8)
      localHeader.writeUInt16LE(0, 10);         // mod time
      localHeader.writeUInt16LE(0, 12);         // mod date
      localHeader.writeUInt32LE(crc, 14);       // crc32
      localHeader.writeUInt32LE(compSize, 18);  // compressed size
      localHeader.writeUInt32LE(uncompSize, 22);// uncompressed size
      localHeader.writeUInt16LE(pathBuf.length, 26); // file name length
      localHeader.writeUInt16LE(0, 28);         // extra field length
      pathBuf.copy(localHeader, 30);

      const localOffset = offset;
      localHeaders.push(localHeader, compressedData);
      offset += localHeader.length + compSize;

      // Central directory header (46 bytes + path + extra)
      const centralHeader = Buffer.alloc(46 + pathBuf.length);
      centralHeader.writeUInt32LE(0x02014b50, 0); // signature
      centralHeader.writeUInt16LE(20, 4);          // version made by
      centralHeader.writeUInt16LE(20, 6);          // version needed
      centralHeader.writeUInt16LE(0x0800, 8);      // flags (UTF-8)
      centralHeader.writeUInt16LE(8, 10);          // compression method
      centralHeader.writeUInt16LE(0, 12);          // mod time
      centralHeader.writeUInt16LE(0, 14);          // mod date
      centralHeader.writeUInt32LE(crc, 16);        // crc32
      centralHeader.writeUInt32LE(compSize, 20);   // compressed size
      centralHeader.writeUInt32LE(uncompSize, 24); // uncompressed size
      centralHeader.writeUInt16LE(pathBuf.length, 28); // file name length
      centralHeader.writeUInt16LE(0, 30);          // extra field length
      centralHeader.writeUInt16LE(0, 32);          // file comment length
      centralHeader.writeUInt16LE(0, 34);          // disk number start
      centralHeader.writeUInt16LE(0, 36);          // internal file attributes
      centralHeader.writeUInt32LE(0, 38);          // external file attributes
      centralHeader.writeUInt32LE(localOffset, 42);// relative offset of local header
      pathBuf.copy(centralHeader, 46);

      centralHeaders.push(centralHeader);
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const ch of centralHeaders) {
      centralSize += ch.length;
    }

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature
    eocd.writeUInt16LE(0, 4);          // disk number
    eocd.writeUInt16LE(0, 6);          // disk where central dir starts
    eocd.writeUInt16LE(this.entries.length, 8); // total entries on this disk
    eocd.writeUInt16LE(this.entries.length, 10); // total entries
    eocd.writeUInt32LE(centralSize, 12);         // size of central dir
    eocd.writeUInt32LE(centralStart, 16);        // offset of central dir
    eocd.writeUInt16LE(0, 20);                  // comment length

    return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  }
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function collectFiles(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (entry.name.endsWith(".zip") || entry.name === "package.json" || entry.name === "package-lock.json") continue;
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      results.push({ fullPath, relPath });
    }
  }

  return results;
}

function getPluginVersion(pluginDir) {
  const mainPhpPath = path.join(pluginDir, "aivision-seo.php");
  if (!fs.existsSync(mainPhpPath)) return "1.0.0";
  const content = fs.readFileSync(mainPhpPath, "utf8");
  const match = content.match(/Version:\s*([0-9.]+)/i);
  return match ? match[1].trim() : "1.0.0";
}

function extractChangelogForVersion(readmePath, version) {
  if (!fs.existsSync(readmePath)) return [];
  const content = fs.readFileSync(readmePath, "utf8");
  const escapedV = version.replace(/\./g, "\\.");
  const regex = new RegExp(`=\\s*${escapedV}\\s*=\\s*([\\s\\S]*?)(?=\\n=\\s*[0-9.]+\\s*=|\\n==|$)`, "i");
  const match = content.match(regex);
  if (!match) return [];

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("*"))
    .map((line) => line.replace(/^\*\s*/, ""));
}

function updateVersionRegistry(version, zipBuffer, files) {
  const versionsFilePath = path.resolve(__dirname, "versions.json");
  const webPublicVersionsPath = path.resolve(__dirname, "..", "apps", "web", "public", "versions.json");
  const readmePath = path.resolve(__dirname, "aivision-seo", "readme.txt");

  let registry = {
    latest: version,
    name: "aivision-seo",
    description: "AIVision SEO WordPress Plugin for Search Engines (SEO), Answer Engines (AEO), and Generative AI (GEO)",
    versions: [],
  };

  if (fs.existsSync(versionsFilePath)) {
    try {
      registry = JSON.parse(fs.readFileSync(versionsFilePath, "utf8"));
    } catch (e) {
      console.warn("Could not parse existing versions.json, initializing fresh registry.");
    }
  }

  const sha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");
  const sizeBytes = zipBuffer.length;
  const sizeFormatted = `${(sizeBytes / 1024).toFixed(1)} KB`;
  const filename = `aivision-seo-v${version}.zip`;
  const extractedChangelog = extractChangelogForVersion(readmePath, version);

  const newEntry = {
    version,
    releasedAt: new Date().toISOString(),
    filename,
    size: sizeBytes,
    sizeFormatted,
    sha256,
    fileCount: files.length,
    status: "stable",
    minPhp: "8.0",
    minWp: "6.0",
    changelog: extractedChangelog.length > 0 ? extractedChangelog : [
      `Release of AIVision SEO v${version}`
    ],
  };

  // Mark all older versions as archived
  if (Array.isArray(registry.versions)) {
    registry.versions = registry.versions.map((v) => {
      if (v.version !== version) {
        return { ...v, status: v.status === "deprecated" ? "deprecated" : "archived" };
      }
      return v;
    });

    const existingIndex = registry.versions.findIndex((v) => v.version === version);
    if (existingIndex >= 0) {
      // Retain previous changelog if existing has richer notes
      const existing = registry.versions[existingIndex];
      registry.versions[existingIndex] = {
        ...existing,
        ...newEntry,
        changelog: existing.changelog && existing.changelog.length >= newEntry.changelog.length
          ? existing.changelog
          : newEntry.changelog,
      };
    } else {
      registry.versions.unshift(newEntry);
    }
  } else {
    registry.versions = [newEntry];
  }

  registry.latest = version;
  registry.updatedAt = new Date().toISOString();

  const formattedJson = JSON.stringify(registry, null, 2);
  fs.writeFileSync(versionsFilePath, formattedJson);
  console.log(`📋 Updated version registry: ${versionsFilePath}`);

  if (fs.existsSync(path.dirname(webPublicVersionsPath))) {
    fs.writeFileSync(webPublicVersionsPath, formattedJson);
    console.log(`📋 Synchronized version registry to web public: ${webPublicVersionsPath}`);
  }

  return newEntry;
}

function buildPluginZip() {
  const pluginDir = path.resolve(__dirname, "aivision-seo");
  const version = getPluginVersion(pluginDir);
  const versionedFilename = `aivision-seo-v${version}.zip`;
  console.log(`\n📦 Building AIVision SEO Plugin v${version}...`);

  const files = collectFiles(pluginDir);

  const zip = new ZipWriter();
  for (const file of files) {
    const zipEntryPath = `aivision-seo/${file.relPath}`;
    const buffer = fs.readFileSync(file.fullPath);
    zip.addFile(zipEntryPath, buffer);
    console.log(`  Added: ${zipEntryPath}`);
  }

  const zipBuffer = zip.toBuffer();

  const outPaths = [
    path.resolve(__dirname, versionedFilename),
    path.resolve(__dirname, "aivision-seo.zip"),
    path.resolve(__dirname, "aivision-seo", versionedFilename),
    path.resolve(__dirname, "aivision-seo", "aivision-seo.zip"),
    path.resolve(__dirname, "..", "apps", "web", "public", versionedFilename),
    path.resolve(__dirname, "..", "apps", "web", "public", "aivision-seo.zip"),
  ];

  console.log(`\n💾 Writing distribution packages:`);
  for (const outPath of outPaths) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, zipBuffer);
    console.log(`  Wrote ${zipBuffer.length} bytes to ${outPath}`);
  }

  // Update version tracking registry
  const meta = updateVersionRegistry(version, zipBuffer, files);

  console.log(`\n✅ AIVision SEO v${version} packaged successfully!`);
  console.log(`   Archive: ${versionedFilename} (${meta.sizeFormatted})`);
  console.log(`   SHA256:  ${meta.sha256}`);
  console.log(`   Files:   ${meta.fileCount} items\n`);
}

buildPluginZip();
