# DialTimer

A minimal, full-screen countdown timer for Windows, controlled by the rotary knob on an Epomaker RT100 keyboard. Big white digits on a translucent black background, and a line of text underneath for a quote you want in front of you all day.

Built with Electron plus a small AutoHotkey v2 script for the knob.

## Features

- Frameless, transparent window that fills your **secondary monitor** (falls back to the primary if you only have one), on top only while it has focus.
- Kitchen-timer behaviour: turn the knob to add or remove time, click to start/pause, hold to reset.
- A **quote line** under the digits in the same font. Type your own, or pull one from a bundled library of motivational lines about identity, discipline, focus and effort.
- Background and digit opacity are adjustable and remembered.
- Monochrome, no menus. A faint hint line at the bottom fades out after a few seconds.

## Controls

| Input | Action |
| --- | --- |
| Knob clockwise / counterclockwise | +1 / -1 minute (never below 0, max 9 hours) |
| Fast spin (more than 4 clicks within 300 ms) | 5 minutes per click |
| Knob click | Start / pause. Dismisses the alarm |
| Knob hold (600 ms or more) | Reset to the last duration you started from |
| Mouse scroll | Background opacity |
| Ctrl + scroll | Digit and quote opacity (20-100%) |
| `Q` (or double-click the quote) | Type a quote. `Enter` saves, `Esc` cancels |
| `N` | Show a random quote from the bundled library |
| `Esc` | Quit (cancels the edit instead if you are typing a quote) |

Turning works while stopped and while running. When the timer reaches zero a chime repeats and the digits pulse until you click the knob.

The format is `MM:SS` under an hour and `H:MM:SS` above.

## Quotes

Press `Q`, type or paste, press `Enter`. The quote is saved and comes back next launch. To clear it, press `Q`, select all, delete, and press `Enter`.

Press `N` for a random quote from [`renderer/quotes.js`](renderer/quotes.js). It uses a shuffled deck, so nothing repeats until the whole library has been shown. Everything is local: no network, no API. Add your own lines by appending strings to the array in that file and rebuilding. Note that `N` replaces the saved quote.

## Requirements

- Windows 10 or 11
- [Node.js](https://nodejs.org/) (any current LTS)
- [AutoHotkey v2](https://www.autohotkey.com/)
- An Epomaker RT100 (or any keyboard whose knob sends `Volume_Up`, `Volume_Down` and `Media_Play_Pause`)

With winget:

```powershell
winget install OpenJS.NodeJS.LTS
winget install AutoHotkey.AutoHotkey
```

## Build and run

```powershell
npm install
npm run build
dist\DialTimer-win32-x64\DialTimer.exe
```

The text is set in Segoe UI Light, which ships with Windows, so there is no font to install. For development you can use `npm start`, but the knob only works with the built `DialTimer.exe`, because the AutoHotkey script matches that executable name.

If `npm install` skips Electron's download step on your machine, run `node node_modules/electron/install.js` once, then `npm run build`.

## How the knob works

The AutoHotkey script ([`ahk/dialtimer.ahk`](ahk/dialtimer.ahk)) is started by the app and closed with it. It only intercepts the three knob keys while the DialTimer window is active (`#HotIf WinActive("DialTimer ahk_exe DialTimer.exe")`), so volume and media keys behave normally everywhere else.

| Knob key | Sent to the timer |
| --- | --- |
| `Volume_Up` | `F13` (clockwise) |
| `Volume_Down` | `F14` (counterclockwise) |
| `Media_Play_Pause` short click | `F15` (start / pause) |
| `Media_Play_Pause` held 600 ms | `F16` (reset) |

The RT100 sends a real key-up when you release the knob click, so holding is detectable. The script arms a 600 ms timer on key-down and cancels it on key-up. (`KeyWait` inside a `#HotIf` hotkey reported the key as already released in testing, which is why a timer is used instead.)

AutoHotkey is looked up in `%ProgramFiles%\AutoHotkey\v2` and `%LOCALAPPDATA%\Programs\AutoHotkey\v2`. If it is not found the timer still runs but the knob does nothing.

## Settings

Saved to `%APPDATA%\DialTimer\settings.json`: background opacity (default 0.45), digit opacity, last duration (default 5:00) and the current quote.

## Project layout

```
main.js            Electron main process: window, settings, launches AutoHotkey
preload.js         Safe bridge between window and main process
renderer/          UI: index.html, style.css, app.js, quotes.js
ahk/dialtimer.ahk  Knob input bridge
scripts/           build.js (assembles dist/DialTimer-win32-x64/DialTimer.exe)
```

## Credits

- The bundled quotes are original lines written for this project.
