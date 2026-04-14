# Web Notes Assistant

> A powerful Firefox extension to capture, organize, and export notes from any web page — right inside your browser.

---

## Features

- 📝 **Highlight & Capture** — Select text on any webpage and instantly save it as a note
- 📷 **Screenshots** — Draw a region on any page to capture a screenshot note
- 🗂️ **Workspaces** — Create named workspaces to organize notes by topic or project
- 🌗 **Dark / Light Mode** — Full theme toggle, persisted across sessions
- 💾 **Export** — Save your notes as a formatted **PDF** or **DOCX** file
- 🔗 **Source & Timestamp** — Optionally attach the source URL and capture time to each note
- 🖥️ **Keep Style** — Right-click a note → "Keep Style" to preserve exact code formatting, indentation, and colors (perfect for copying programs)
- 🔄 **Cross-tab Sync** — Same workspace open in two tabs? Notes sync in real time
- ↕️ **Drag to Reorder** — Drag the grip handle on any card to reorder notes
- 🖱️ **Right-click Menu** — Move Up, Move Down, Keep Style, Delete — all via right-click on any note

---

## Installation

### From Firefox Add-ons (AMO)
Search **"Web Notes Assistant"** on [addons.mozilla.org](https://addons.mozilla.org)

### Manual Install (for testing)
1. Download `web-notes-assistant-v1.2.0.xpi`
2. Drag and drop it into a Firefox window

### Developer Install
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from this folder

---

## How to Use

1. Click the **Web Notes Assistant** icon in the Firefox toolbar to open the panel
2. Click **New** to create a workspace and give it a name
3. Toggle **Take Notes ON** in the sidebar
4. **Highlight any text** on the page — a popup appears → click **Add to Notes**
5. Use the **camera icon** to capture a screenshot region
6. **Right-click** any note card for move, style, or delete options
7. Use **Save as → PDF** or **DOCX** to export your notes

---

## Project Structure

```
webAnnotator/
├── manifest.json          # Extension manifest (MV2)
├── background.js          # Background script (badge, messaging relay)
├── content.js             # Content script (panel injection, text selection, screenshot)
├── content.css            # Styles for injected panel and popup
├── icons/                 # Extension icons (16, 32, 48, 96px)
├── lib/                   # Bundled third-party libraries
│   ├── jspdf.umd.min.js   # PDF generation (jsPDF)
│   ├── docx.min.js        # DOCX generation (docx.js)
│   └── FileSaver.min.js   # File download helper
└── sidebar/
    ├── sidebar.html        # Sidebar UI
    ├── sidebar.css         # Sidebar styles (dark/light theme)
    └── sidebar.js          # All sidebar logic
```

---

## Third-Party Libraries

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [jsPDF](https://github.com/parallax/jsPDF) | 2.x | MIT | PDF export |
| [docx.js](https://github.com/dolanmiu/docx) | 8.x | MIT | DOCX export |
| [FileSaver.js](https://github.com/eligrey/FileSaver.js) | 2.x | MIT | File download |

---

## Privacy

**No data leaves your device.** All notes and workspaces are stored locally using Firefox's `browser.storage.local` API. See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) for full details.

---

## Developer

**YuvaTech**  
📧 yuvatech.support@example.com

---

## License

MIT License — free to use, modify, and distribute.
