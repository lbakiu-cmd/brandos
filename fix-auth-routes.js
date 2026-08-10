const fs = require('fs');
const path = require('path');

const base = 'C:\\Dev\\brandos\\apps\\web\\app\\api\\auth';

// Remove broken catch-all folders
fs.rmSync(base, { recursive: true, force: true });

const endpoints = [
  ['sign-up', 'email'],
  ['sign-in', 'email'],
  ['get-session'],
  ['session'],
  ['sign-out'],
];

for (const parts of endpoints) {
  const dir = path.join(base, ...parts);
  fs.mkdirSync(dir, { recursive: true });
  const depth = parts.length + 3; // levels back to apps/web
  const code =
    `import { auth } from "${'../'.repeat(depth)}lib/auth";\n` +
    `import { toNextJsHandler } from "better-auth/next-js";\n\n` +
    `export const { GET, POST } = toNextJsHandler(auth);\n`;
  fs.writeFileSync(path.join(dir, 'route.ts'), code);
  console.log('created', path.join(dir, 'route.ts'));
}