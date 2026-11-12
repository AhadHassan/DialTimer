// Assembles dist/DialTimer-win32-x64/DialTimer.exe from the cached Electron release zip.
// (The usual packagers' zip extraction exits silently on Node 26, so this uses Windows' built-in tar.)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const rceditModule = require('rcedit');
const rcedit = rceditModule.rcedit || rceditModule.default || rceditModule;

const root = path.join(__dirname, '..');
const version = require(path.join(root, 'node_modules', 'electron', 'package.json')).version;
const out = path.join(root, 'dist', 'DialTimer-win32-x64');

function findElectronZip() {
  const cache = path.join(process.env.LOCALAPPDATA || os.homedir(), 'electron', 'Cache');
  const name = `electron-v${version}-win32-x64.zip`;
  for (const dir of fs.readdirSync(cache)) {
    const candidate = path.join(cache, dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${name} not found in ${cache}; run "node node_modules/electron/install.js" first.`);
}

async function main() {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  execFileSync('tar', ['-xf', findElectronZip(), '-C', out], { stdio: 'inherit' });

  const exe = path.join(out, 'DialTimer.exe');
  fs.renameSync(path.join(out, 'electron.exe'), exe);
  fs.rmSync(path.join(out, 'resources', 'default_app.asar'), { force: true });

  const app = path.join(out, 'resources', 'app');
  fs.mkdirSync(app, { recursive: true });
  for (const entry of ['main.js', 'preload.js', 'package.json', 'renderer', 'ahk']) {
    fs.cpSync(path.join(root, entry), path.join(app, entry), { recursive: true });
  }

  await rcedit(exe, {
    'version-string': {
      FileDescription: 'DialTimer',
      ProductName: 'DialTimer',
      InternalName: 'DialTimer',
      OriginalFilename: 'DialTimer.exe'
    },
    'product-version': '1.0.0',
    'file-version': '1.0.0'
  });

  console.log('Built:', exe);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
