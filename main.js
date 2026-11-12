const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

app.setName('DialTimer');

const DEFAULTS = { opacity: 0.45, digitOpacity: 1, lastDuration: 300 };

let win = null;
let ahk = null;

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
  } catch (err) {
    console.error('Could not save settings:', err);
  }
}

function findAutoHotkey() {
  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'AutoHotkey', 'v2', 'AutoHotkey64.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'AutoHotkey', 'v2', 'AutoHotkey32.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AutoHotkey', 'v2', 'AutoHotkey64.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AutoHotkey', 'v2', 'AutoHotkey32.exe')
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function startAutoHotkey() {
  const exe = findAutoHotkey();
  if (!exe) {
    console.error('AutoHotkey v2 not found; the knob will not work.');
    return;
  }
  const script = path.join(app.getAppPath(), 'ahk', 'dialtimer.ahk');
  ahk = spawn(exe, [script, String(process.pid)], { windowsHide: true, stdio: 'ignore' });
  ahk.on('error', (err) => console.error('AutoHotkey failed to start:', err));
}

function stopAutoHotkey() {
  if (ahk && !ahk.killed) ahk.kill();
  ahk = null;
}

function secondaryDisplay() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().find((d) => d.id !== primary.id) || primary;
}

function createWindow() {
  const bounds = secondaryDisplay().bounds;

  win = new BrowserWindow({
    ...bounds,
    title: 'DialTimer',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false
    }
  });

  win.on('page-title-updated', (e) => e.preventDefault());

  // Always on top only while focused.
  win.on('focus', () => win.setAlwaysOnTop(true));
  win.on('blur', () => win.setAlwaysOnTop(false));

  win.once('ready-to-show', () => {
    win.setBounds(bounds);
    win.show();
    win.focus();
    // Windows can mis-size a window created across monitors with different DPI scaling; apply twice.
    setTimeout(() => win && win.setBounds(bounds), 200);
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) win.focus();
  });

  ipcMain.handle('settings:get', () => loadSettings());
  ipcMain.on('settings:set', (_e, patch) => saveSettings(patch));
  ipcMain.on('app:quit', () => app.quit());

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    startAutoHotkey();
    createWindow();
  });

  app.on('will-quit', stopAutoHotkey);
  app.on('window-all-closed', () => app.quit());
}
