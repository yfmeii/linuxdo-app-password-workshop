import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const shell = await readFile('index.html', 'utf8');
const template = await readFile('src/template.html', 'utf8');
const scriptIntegrity = `sha384-${createHash('sha384').update(await readFile('dist/app.js')).digest('base64')}`;
const styleIntegrity = `sha384-${createHash('sha384').update(await readFile('dist/app.css')).digest('base64')}`;
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none'";
await writeFile('dist/index.html', shell.replace('<!--app-->', template)
  .replace('<script type="module" src="/src/main.jsx"></script>', `<script defer src="./app.js" integrity="${scriptIntegrity}"></script>`)
  .replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}">\n    <meta name="referrer" content="no-referrer">`)
  .replace('</head>', `<link rel="stylesheet" href="./app.css" integrity="${styleIntegrity}">\n  </head>`));
await copyFile('src/strings.json', 'dist/strings.json');
