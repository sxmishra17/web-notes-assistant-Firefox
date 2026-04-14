# AMO Store Listing — Web Notes Assistant

Use this file to fill in the Firefox Add-ons (AMO) submission form.
Visit: https://addons.mozilla.org/developers/addon/submit/

---

## Name
Web Notes Assistant

## Summary (max 250 characters)
Capture highlighted text and screenshots from any webpage into organized, exportable workspaces. Export to PDF or DOCX. Dark/light mode. Code-style preservation.

## Description (paste into AMO)

**Web Notes Assistant** helps you save and organize research, code snippets, and ideas directly from your browser — without switching apps.

### ✨ Key Features

**📝 Capture Instantly**
Highlight any text on a webpage → click "Add to Notes". Or draw a region to capture a screenshot note.

**🗂️ Workspaces**
Organize notes into named workspaces — one per project, topic, or tab.

**🖥️ Keep Style (for code)**
Right-click any note → "Keep Style" to preserve exact indentation, line breaks, colors, and font — perfect for saving code snippets exactly as they appear.

**💾 Export as PDF or DOCX**
Download your notes as a formatted document, complete with source links and timestamps.

**🌗 Dark & Light Mode**
Switch between themes with one click. Your preference is saved.

**🔄 Cross-tab Sync**
Open the same workspace in two tabs — notes sync automatically.

**↕️ Drag to Reorder**
Drag the grip on any note card to rearrange your notes.

**🔗 Source & Timestamp**
Optionally attach the source URL (as a clickable link) and capture time to every note.

### 🔒 Privacy First
All your data stays on your device. Nothing is ever sent to any server.

---

## Category
**Productivity**

## Tags (up to 10)
notes, annotator, highlighter, screenshot, pdf, docx, workspace, research, code, dark-mode

## License
MIT

## Homepage URL
https://github.com/yuvatech/web-notes-assistant  ← update with real URL

## Support URL
https://github.com/yuvatech/web-notes-assistant/issues

---

## Third-Party Library Disclosure (required by AMO)

This extension bundles the following open-source libraries:

| File | Library | Version | License | Source |
|------|---------|---------|---------|--------|
| `lib/jspdf.umd.min.js` | jsPDF | 2.x | MIT | https://github.com/parallax/jsPDF |
| `lib/docx.min.js` | docx.js | 8.x | MIT | https://github.com/dolanmiu/docx |
| `lib/FileSaver.min.js` | FileSaver.js | 2.x | MIT | https://github.com/eligrey/FileSaver.js |

These are minified for performance. Source code is available at the links above.

---

## Reviewer Notes (paste into AMO "Notes to Reviewer" field)

This extension injects a resizable sidebar panel (iframe) into web pages. It does NOT collect, transmit, or share any user data. All storage is via `browser.storage.local`.

The `<all_urls>` permission is required because the user may want to capture notes from any website. The `tabs` permission is used only to read the current page URL/title for note metadata — no tab browsing history is accessed.

Third-party libraries (jsPDF, docx.js, FileSaver.js) are bundled as minified files for client-side PDF/DOCX generation. No network requests are made by these libraries.

To test the extension:
1. Load the extension from `manifest.json`
2. Visit any webpage (e.g. https://example.com)
3. Click the toolbar icon to open the panel
4. Click "New" workspace, toggle "Take Notes ON"
5. Highlight text → "Add to Notes"
6. Try export to PDF/DOCX via "Save as" buttons
