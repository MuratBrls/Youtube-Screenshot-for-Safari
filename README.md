# YouTube Screenshot Studio — Safari Extension

A Safari Web Extension for macOS that lets you capture high-quality frames from any YouTube video directly to your Downloads folder. Supports PNG (lossless), JPG, and TIF formats.

> Originally based on a Chrome extension, converted and rewritten for Safari with a native macOS UI.

---

## Features

- 📸 **One-click frame capture** from any YouTube video
- 🎨 **3 output formats** — PNG (lossless, recommended for 4K), JPG (compressed), TIF (professional)
- ⌨️ **Customizable keyboard shortcut** (default: `P`)
- 🖥️ **Native macOS UI** — settings panel built with system fonts and colors
- 🏷️ **Auto-named files** — `VideoTitle_01m23s.png`
- 💾 **Saves to Downloads folder** automatically
- 🎞️ **Frame-perfect capture** using `requestVideoFrameCallback` + `display-p3` color space

---

## Requirements

- macOS 13 Ventura or later
- Safari 16 or later
- Xcode 14+ *(only needed to build from source)*

---

## Installation (Pre-built App)

If you received the `YouTube Screenshot Studio.app` file:

1. Move the app to your `/Applications` folder
2. Open **Terminal** and run:
   ```bash
   xattr -dr com.apple.quarantine "/Applications/YouTube Screenshot Studio.app"
   ```
3. Open the app — it will say *"extension is currently off"*
4. Click **"Quit and Open Safari Settings…"**
5. In Safari → **Settings → Advanced** → enable **"Show features for web developers"**
6. In Safari → **Develop → Allow Unsigned Extensions** ✅
7. In Safari → **Settings → Extensions** → enable **YouTube Screenshot Studio** ✅

> ⚠️ **Note:** "Allow Unsigned Extensions" resets every time Safari restarts. This is a macOS security feature for unsigned developer apps.

---

## Build from Source

### Prerequisites

- [Xcode](https://apps.apple.com/app/xcode/id497799835) (free on the Mac App Store)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/MuratBrls/Youtube-Screenshot-for-Safari.git
cd Youtube-Screenshot-for-Safari

# 2. Convert the extension to an Xcode project
xcrun safari-web-extension-converter . \
  --app-name "YouTube Screenshot Studio" \
  --bundle-identifier com.local.ytscreenshot \
  --no-open

# 3. Open the generated Xcode project
open ~/"YouTube Screenshot Studio"/"YouTube Screenshot Studio.xcodeproj"

# 4. In Xcode: select "YouTube Screenshot Studio (macOS)" scheme → click ▶ Run
```

---

## How to Use

### Capture a Frame

1. Open any YouTube video in Safari
2. Set video quality to **1080p or higher** *(⚙️ → Quality)* for best results
3. Navigate to the frame you want
4. Press **`P`** — the frame saves to your Downloads folder instantly

You can also click the **📷 camera button** that appears in the YouTube player controls (right side of the playbar).

### Settings Panel

Click the **⚙️ gear icon** in the YouTube player controls to open settings:

| Setting | Description |
|---|---|
| **PNG** | Lossless — recommended for 4K/HDR content |
| **JPG** | Compressed — smaller file size, adjustable quality (60–100%) |
| **TIF** | Lossless professional format |
| **Shortcut** | Click "Değiştir" to record a new capture key |

### File Naming

Files are automatically named using the video title and timestamp:

```
My_Video_Title_01m23s.png     ← 1 minute 23 seconds
My_Video_Title_1h02m03s.png   ← 1 hour 2 minutes 3 seconds
```

---

## Project Structure

```
Youtube_Screenshoot-safari/
├── manifest.json       # Safari Web Extension manifest (MV3)
├── content.js          # Core logic: frame capture, settings panel, keyboard shortcut
├── background.js       # Background script (minimal, Safari-compatible)
├── popup.html          # Toolbar popup UI (native macOS design)
├── popup.js            # Popup logic: format, quality, shortcut settings
├── utif.js             # TIFF encoder library
├── icons/              # Extension icon set
└── README.md           # This file
```

---

## Safari vs Chrome Differences

| Feature | Chrome original | Safari port |
|---|---|---|
| Background | `service_worker` | `background.scripts` array |
| File saving | `chrome.downloads` API | `<a download>` → Downloads folder |
| Folder picker | `showDirectoryPicker` | Not supported in extension context |
| API namespace | `chrome.*` | `browser.*` (with compatibility shim) |
| Distribution | `.crx` file | Xcode `.app` wrapper required |

---

## Tips for Best Quality

- Set YouTube to **4K (2160p)** before capturing — the extension captures exactly what YouTube is streaming
- Use **PNG format** — completely lossless, no compression artifacts
- Pause the video before capturing for frame-perfect timing
- The toast notification shows the captured resolution (e.g., `3840×2160 · 8.4 MB · PNG`) so you can verify quality

---

## License

MIT — free to use, modify, and distribute.
