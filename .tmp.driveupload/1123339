const fs = require('fs');
const path = require('path');

const base = 'C:\\Dev\\brandos\\apps\\web';

// 1. Clean up any broken auth folders
fs.rmSync(path.join(base, 'app', 'api', 'auth'), { recursive: true, force: true });
fs.rmSync(path.join(base, 'app', 'api', 'auth-handler'), { recursive: true, force: true });
fs.rmSync(path.join(base, 'pages'), { recursive: true, force: true });

// 2. Create the EXACT App Router catch-all folder
const dir = path.join(base, 'app', 'api', 'auth', '[...all]');
fs.mkdirSync(dir, { recursive: true });

// 3. Write the route file with the correct import path
const code = `import { auth } from "../../../../lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
`;
fs.writeFileSync(path.join(dir, 'route.ts'), code);

console.log('✅ Successfully created:', path.join(dir, 'route.ts'));