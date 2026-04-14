# Web Notes Assistant — Changelog

All notable changes to this extension are documented here.

---

## [1.2.0] — April 2026

### New Features
- **Right-click context menu** on note cards: Move Up, Move Down, Keep Style, Delete
- **Keep Style mode**: Preserves exact code formatting, indentation, colors, and whitespace for copied programs/code snippets
- **Drag-and-drop reordering** of note cards via grip handle
- **Light/Dark mode toggle** (☀️/🌙) persisted across sessions
- **Cross-tab sync**: Same workspace open in multiple tabs stays in sync automatically via `storage.onChanged`

### Improvements
- **Duplicate workspace name detection**: Shows error toast and highlights input field if a name already exists
- **Autosave toggle** (green ON / red OFF) with visual state indicator
- **Save as label** added before PDF and DOCX export buttons
- **Resize handle fix**: Disabling iframe pointer events during drag so the panel can be resized in both directions reliably
- **Icon-only toolbar**: All toolbar buttons now rely on hover tooltips for a cleaner layout
- **Code formatting preserved** in notes: `style` and `class` attributes now pass through the HTML sanitizer
- **PDF/DOCX export**: Keep Style notes are exported with monospace font and code-block background

### Bug Fixes
- Fixed resize handle being unresponsive after first drag (iframe was swallowing mouse events)
- Fixed `querySelector("span")` crash when save button had no span element
- Fixed autosave silently ignoring duplicate workspace names

---

## [1.1.0] — March 2026

### New Features
- **Workspaces**: Create, name, and switch between multiple note collections
- **Existing workspaces panel**: Browse and load saved workspaces
- **Source & Timestamp toggle**: Optionally show source URL (globe icon) and capture time on each note
- **PDF export** with source hyperlinks and timestamps
- **DOCX export** with hyperlinked source and formatted timestamps
- **Screenshot capture**: Draw a selection box to capture any region of the page
- **Autosave**: Notes automatically saved every 15 seconds

### Improvements
- High-contrast "True Dark" theme with vibrant blue accents
- Smooth slide-in panel animation
- Resizable sidebar (drag left edge)
- Notes count badge in footer

---

## [1.0.0] — February 2026

### Initial Release
- Text selection popup with "Add to Notes" button
- Right-side sliding panel injected into web pages
- Basic note list with delete functionality
- Screenshot capture via region selection
