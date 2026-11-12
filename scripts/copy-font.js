// Copies the Outfit font (OFL) from @fontsource/outfit into renderer/fonts so the app ships it locally.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', '@fontsource', 'outfit');
const dest = path.join(__dirname, '..', 'renderer', 'fonts');
fs.mkdirSync(dest, { recursive: true });

for (const file of ['outfit-latin-300-normal.woff2', 'outfit-latin-400-normal.woff2']) {
  fs.copyFileSync(path.join(src, 'files', file), path.join(dest, file));
}
if (fs.existsSync(path.join(src, 'LICENSE'))) {
  fs.copyFileSync(path.join(src, 'LICENSE'), path.join(dest, 'OFL-LICENSE.txt'));
}
console.log('Outfit font copied to renderer/fonts');
