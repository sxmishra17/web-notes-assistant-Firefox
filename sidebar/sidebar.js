// ============================================================
// Web Notes Assistant — Sidebar Script
// Notes rendering, workspace management, DOCX/PDF export
// ============================================================

(function () {
  "use strict";

  // --- State ---
  let currentWorkspace = null;

  let takeNotesEnabled = false;
  let isDirty = false;
  let autoSaveInterval = null;
  let showMetadata = true;
  let autosaveEnabled = true;

  // --- DOM refs ---
  const workspaceNameInput = document.getElementById("workspace-name");
  const notesList = document.getElementById("notes-list");
  const notesEmpty = document.getElementById("notes-empty");
  const notesCount = document.getElementById("notes-count");
  const notesContainer = document.getElementById("notes-container");
  const btnSave = document.getElementById("btn-save");
  const btnExportPdf = document.getElementById("btn-export-pdf");
  const btnExportDocx = document.getElementById("btn-export-docx");
  const takeNotesToggle = document.getElementById("take-notes-toggle");
  const toggleSwitch = document.getElementById("toggle-switch");
  const takeNotesStatus = document.getElementById("take-notes-status");
  const btnScreenshot = document.getElementById("btn-screenshot");
  const btnToggleMeta = document.getElementById("btn-toggle-meta");
  const wsTabNew = document.getElementById("ws-tab-new");
  const wsTabExisting = document.getElementById("ws-tab-existing");
  const wsPanelNew = document.getElementById("ws-panel-new");
  const wsPanelExisting = document.getElementById("ws-panel-existing");
  const wsExistingList = document.getElementById("ws-existing-list");
  const autosaveToggle = document.getElementById("autosave-toggle");
  const autosaveText = autosaveToggle.querySelector(".autosave-text");
  const themeToggle = document.getElementById("theme-toggle");
  const contextMenu = document.getElementById("note-context-menu");
  let currentContextNoteId = null;

  // --- Init ---
  init();

  async function init() {
    await loadAutoSave();
    await loadTheme();
    bindEvents();
    if (currentWorkspace) {
      wsTabNew.classList.add("active");
      wsPanelNew.style.display = "";
      workspaceNameInput.value = currentWorkspace.name;
      renderNotes();
    }
    startAutoSaveTimer();
    listenForCrossTabSync();
  }

  // --- Cross-tab sync ---
  function listenForCrossTabSync() {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !currentWorkspace) return;

      if (changes.workspaces && changes.workspaces.newValue) {
        const updated = changes.workspaces.newValue[currentWorkspace.id];
        if (updated && updated.updatedAt !== currentWorkspace.updatedAt) {
          currentWorkspace.notes = updated.notes;
          currentWorkspace.name = updated.name;
          currentWorkspace.updatedAt = updated.updatedAt;
          workspaceNameInput.value = updated.name;
          renderNotes();
        }
      }
    });
  }

  // --- Event bindings ---
  function bindEvents() {
    // Listen for notes via postMessage from content script (primary channel)
    window.addEventListener("message", (event) => {
      if (event.data && event.data.action === "newNote" && event.data.note) {
        addNote(event.data.note);
      }
    });

    // Also listen via runtime messaging (fallback)
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "newNote" && message.note) {
        addNote(message.note);
      }
    });

    // Take Notes toggle
    takeNotesToggle.addEventListener("click", () => {
      takeNotesEnabled = !takeNotesEnabled;
      updateToggleUI();
      browser.runtime.sendMessage({
        action: "toggleTakeNotes",
        enabled: takeNotesEnabled,
      });
    });

    // Screenshot button
    btnScreenshot.addEventListener("click", () => {
      browser.runtime.sendMessage({ action: "triggerScreenshot" });
    });

    // Link & Date toggle
    btnToggleMeta.addEventListener("click", () => {
      showMetadata = !showMetadata;
      if (showMetadata) {
        btnToggleMeta.classList.add("active");
      } else {
        btnToggleMeta.classList.remove("active");
      }
      renderNotes();
    });

    // Workspace name editing
    workspaceNameInput.addEventListener("change", () => {
      currentWorkspace.name = workspaceNameInput.value.trim() || "Unnamed Workspace";
      workspaceNameInput.value = currentWorkspace.name;
      autoSave();
    });

    // Autosave toggle
    autosaveToggle.addEventListener("click", () => {
      autosaveEnabled = !autosaveEnabled;
      if (autosaveEnabled) {
        autosaveToggle.classList.add("active");
        autosaveText.textContent = "Autosave on";
        startAutoSaveTimer();
      } else {
        autosaveToggle.classList.remove("active");
        autosaveText.textContent = "Autosave off";
        if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
      }
    });

    // Hide context menu on global click
    document.addEventListener("click", (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = "none";
        currentContextNoteId = null;
      }
    });

    // Handle context menu actions
    contextMenu.addEventListener("click", (e) => {
      const btn = e.target.closest(".ctx-item");
      if (!btn || !currentWorkspace || !currentContextNoteId) return;

      const action = btn.getAttribute("data-action");
      const notes = currentWorkspace.notes;
      const idx = notes.findIndex(n => n.id === currentContextNoteId);

      if (idx === -1) return;

      let changed = false;

      if (action === "move-up" && idx > 0) {
        const temp = notes[idx];
        notes[idx] = notes[idx - 1];
        notes[idx - 1] = temp;
        changed = true;
      } else if (action === "move-down" && idx < notes.length - 1) {
        const temp = notes[idx];
        notes[idx] = notes[idx + 1];
        notes[idx + 1] = temp;
        changed = true;
      } else if (action === "keep-style") {
        notes[idx].keepStyle = !notes[idx].keepStyle;
        changed = true;
      } else if (action === "delete") {
        deleteNote(currentContextNoteId);
        contextMenu.style.display = "none";
        currentContextNoteId = null;
        return;
      }

      if (changed) {
        currentWorkspace.updatedAt = new Date().toISOString();
        renderNotes();
        markDirty();
        autoSave();
        saveWorkspace(true);
      }

      contextMenu.style.display = "none";
      currentContextNoteId = null;
    });

    // Theme toggle
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next === "dark" ? "" : "light");
      if (next === "dark") document.documentElement.removeAttribute("data-theme");
      browser.storage.local.set({ theme: next });
    });

    // Workspace tab switching
    wsTabNew.addEventListener("click", () => {
      if (wsTabNew.classList.contains("active")) {
        wsTabNew.classList.remove("active");
        wsPanelNew.style.display = "none";
        return;
      }
      wsTabNew.classList.add("active");
      wsTabExisting.classList.remove("active");
      wsPanelNew.style.display = "";
      wsPanelExisting.style.display = "none";
      newWorkspace();
      workspaceNameInput.focus();
    });

    wsTabExisting.addEventListener("click", () => {
      if (wsTabExisting.classList.contains("active")) {
        wsTabExisting.classList.remove("active");
        wsPanelExisting.style.display = "none";
        return;
      }
      wsTabExisting.classList.add("active");
      wsTabNew.classList.remove("active");
      wsPanelExisting.style.display = "";
      wsPanelNew.style.display = "none";
      loadExistingWorkspaces();
    });

    // Toolbar buttons
    btnSave.addEventListener("click", saveWorkspace);
    btnExportPdf.addEventListener("click", exportPdf);
    btnExportDocx.addEventListener("click", exportDocx);
  }

  // --- Toggle UI ---
  function updateToggleUI() {
    if (takeNotesEnabled) {
      toggleSwitch.classList.add("active");
      takeNotesStatus.textContent = "ON";
      takeNotesStatus.classList.add("status-on");
    } else {
      toggleSwitch.classList.remove("active");
      takeNotesStatus.textContent = "OFF";
      takeNotesStatus.classList.remove("status-on");
    }
  }

  // --- Dirty state tracking ---
  function markDirty() {
    isDirty = true;
    btnSave.classList.remove("toolbar-btn-saved");
    btnSave.classList.add("toolbar-btn-primary");
    btnSave.title = "Save workspace";
  }

  function markSaved() {
    isDirty = false;
    btnSave.classList.remove("toolbar-btn-primary");
    btnSave.classList.add("toolbar-btn-saved");
    btnSave.title = "Saved ✓";
  }

  function startAutoSaveTimer() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    if (!autosaveEnabled) return;
    autoSaveInterval = setInterval(() => {
      if (isDirty) {
        saveWorkspace(true);
      }
    }, 15000);
  }

  // --- Note management ---
  function addNote(note) {
    if (!currentWorkspace) {
      // Auto-create workspace if user captures without selecting
      currentWorkspace = {
        id: generateId(),
        name: "Unnamed Workspace",
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      wsTabNew.classList.add("active");
      wsPanelNew.style.display = "";
      workspaceNameInput.value = "Unnamed Workspace";
    }
    currentWorkspace.notes.push(note);
    currentWorkspace.updatedAt = new Date().toISOString();
    markDirty();
    renderNotes();
    autoSave();
    saveWorkspace(true);
    showToast("Note added!", "success");
    requestAnimationFrame(() => {
      notesContainer.scrollTop = notesContainer.scrollHeight;
    });
  }

  function deleteNote(noteId) {
    if (!currentWorkspace) return;
    currentWorkspace.notes = currentWorkspace.notes.filter((n) => n.id !== noteId);
    currentWorkspace.updatedAt = new Date().toISOString();
    markDirty();
    renderNotes();
    autoSave();
    saveWorkspace(true);
  }

  // --- Rendering ---
  function renderNotes() {
    if (!currentWorkspace) {
      notesEmpty.style.display = "flex";
      notesList.innerHTML = "";
      updateNotesCount();
      return;
    }
    const notes = currentWorkspace.notes;

    if (notes.length === 0) {
      notesEmpty.style.display = "flex";
      notesList.innerHTML = "";
    } else {
      notesEmpty.style.display = "none";
      notesList.innerHTML = notes.map((note) => renderNoteCard(note)).join("");

      // Bind delete buttons directly
      notesList.querySelectorAll(".btn-delete-note").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          deleteNote(id);
        });
      });

      // Bind context menu on note cards
      notesList.querySelectorAll(".note-card").forEach((card) => {
        card.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          const id = card.getAttribute("data-id");
          const note = currentWorkspace.notes.find(n => n.id === id);
          if (!note) return;

          currentContextNoteId = id;

          // Toggle text dynamically based on current state
          const keepStyleBtn = contextMenu.querySelector('[data-action="keep-style"]');
          if (keepStyleBtn) {
            keepStyleBtn.innerHTML = note.keepStyle 
              ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Default Style`
              : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg> Keep Style`;
          }

          contextMenu.style.display = "block";
          
          let x = e.pageX;
          let y = e.pageY;

          // Adjust if menu goes off screen
          const rect = contextMenu.getBoundingClientRect();
          if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 5;
          if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 5;

          contextMenu.style.left = `${x}px`;
          contextMenu.style.top = `${y}px`;
        });
      });

      // Bind image click for full view
      notesList.querySelectorAll(".note-image").forEach((img) => {
        img.addEventListener("click", () => {
          window.open(img.src, "_blank");
        });
      });

      // Bind drag-and-drop reordering
      bindDragAndDrop();
    }

    updateNotesCount();
  }

  function renderNoteCard(note) {
    const dt = formatDateTime(note.timestamp);
    const isText = note.type === "text";

    const badgeHtml = isText
      ? `<span class="note-type-badge badge-text">📝 Text</span>`
      : `<span class="note-type-badge badge-image">📷 Screenshot</span>`;

    // Use sanitized HTML if available, otherwise escape plain text
    let contentHtml;
    if (isText) {
      if (note.htmlContent) {
        contentHtml = `<div class="note-text note-rich">${sanitizeHtml(note.htmlContent)}</div>`;
      } else {
        contentHtml = `<div class="note-text">${escapeHtml(note.content)}</div>`;
      }
    } else {
      contentHtml = `<img class="note-image" src="${note.content}" alt="Screenshot" loading="lazy">`;
    }

    const metaHtml = showMetadata ? `
        <div class="note-meta">
          <span class="note-bullet">•</span>
          <a class="note-source" href="${escapeHtml(note.url)}" target="_blank" title="${escapeHtml(note.url)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </a>
          ${badgeHtml}
          <span class="note-timestamp">${dt}</span>
        </div>` : `
        <div class="note-meta note-meta-minimal">
          <span class="note-bullet">•</span>
          ${badgeHtml}
        </div>`;

    const keepStyleClass = note.keepStyle ? " note-keep-style" : "";

    return `
      <div class="note-card${keepStyleClass}" data-id="${note.id}">
        <div class="note-drag-handle" title="Drag to reorder">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="2" r="1.2"/><circle cx="7" cy="2" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="12" r="1.2"/><circle cx="7" cy="12" r="1.2"/></svg>
        </div>
        ${metaHtml}
        <div class="note-content">
          ${contentHtml}
        </div>
        <div class="note-actions">
          <button class="btn-delete-note" data-id="${note.id}" title="Delete note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `;
  }

  function updateNotesCount() {
    const count = currentWorkspace ? currentWorkspace.notes.length : 0;
    notesCount.textContent = `${count} note${count !== 1 ? "s" : ""}`;
  }

  // --- Drag and Drop Reordering ---
  function bindDragAndDrop() {
    const cards = notesList.querySelectorAll(".note-card");
    if (cards.length < 2) return;

    cards.forEach((card) => {
      const handle = card.querySelector(".note-drag-handle");
      if (!handle) return;

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const dragId = card.getAttribute("data-id");
        card.classList.add("dragging");
        let currentOver = null;

        function onMouseMove(ev) {
          const target = document.elementFromPoint(ev.clientX, ev.clientY);
          const overCard = target ? target.closest(".note-card") : null;

          // Clear previous highlights
          notesList.querySelectorAll(".drag-over").forEach(c => c.classList.remove("drag-over"));

          if (overCard && overCard !== card && overCard.getAttribute("data-id") !== dragId) {
            overCard.classList.add("drag-over");
            currentOver = overCard;
          } else {
            currentOver = null;
          }
        }

        function onMouseUp() {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          card.classList.remove("dragging");
          notesList.querySelectorAll(".drag-over").forEach(c => c.classList.remove("drag-over"));

          if (currentOver && currentWorkspace) {
            const targetId = currentOver.getAttribute("data-id");
            const notes = currentWorkspace.notes;
            const fromIdx = notes.findIndex(n => n.id === dragId);
            const toIdx = notes.findIndex(n => n.id === targetId);
            if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
              const [moved] = notes.splice(fromIdx, 1);
              notes.splice(toIdx, 0, moved);
              currentWorkspace.updatedAt = new Date().toISOString();
              renderNotes();
              markDirty();
              autoSave();
              saveWorkspace(true);
            }
          }
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    });
  }

  // --- Workspace Management ---
  function newWorkspace() {
    currentWorkspace = {
      id: generateId(),
      name: "Unnamed Workspace",
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    workspaceNameInput.value = "Unnamed Workspace";
    workspaceNameInput.select();
    markSaved();
    renderNotes();
    autoSave();
  }

  async function saveWorkspace(silent = false) {
    if (!currentWorkspace) return;
    const name = workspaceNameInput.value.trim() || "Unnamed Workspace";
    currentWorkspace.name = name;
    currentWorkspace.updatedAt = new Date().toISOString();

    try {
      const result = await browser.storage.local.get("workspaces");
      const workspaces = result.workspaces || {};

      // Check for duplicate name
      const duplicate = Object.values(workspaces).find(
        (ws) => ws.name.toLowerCase() === name.toLowerCase() && ws.id !== currentWorkspace.id
      );
      if (duplicate) {
        showToast(`"${name}" already exists. Please use a different name.`, "error");
        workspaceNameInput.style.borderColor = "#f87171";
        workspaceNameInput.focus();
        workspaceNameInput.select();
        setTimeout(() => { workspaceNameInput.style.borderColor = ""; }, 3000);
        return;
      }

      workspaces[currentWorkspace.id] = {
        id: currentWorkspace.id,
        name: currentWorkspace.name,
        notes: currentWorkspace.notes,
        createdAt: currentWorkspace.createdAt,
        updatedAt: currentWorkspace.updatedAt,
      };

      await browser.storage.local.set({ workspaces });
      markSaved();
      if (!silent) {
        showToast(`Workspace "${name}" saved!`, "success");
      }
    } catch (err) {
      console.error("Save failed:", err);
      if (!silent) {
        showToast("Failed to save workspace", "error");
      }
    }
  }

  async function autoSave() {
    if (!currentWorkspace) return;
    try {
      await browser.storage.local.set({
        autoSave: {
          id: currentWorkspace.id,
          name: currentWorkspace.name,
          notes: currentWorkspace.notes,
          createdAt: currentWorkspace.createdAt,
          updatedAt: currentWorkspace.updatedAt,
        },
      });
    } catch (e) { /* silent */ }
  }

  async function loadAutoSave() {
    try {
      const result = await browser.storage.local.get("autoSave");
      if (result.autoSave && result.autoSave.notes) {
        currentWorkspace = result.autoSave;
      }
    } catch (e) { /* start fresh */ }
  }

  async function loadTheme() {
    try {
      const result = await browser.storage.local.get("theme");
      if (result.theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      }
    } catch (e) { /* default dark */ }
  }

  async function loadExistingWorkspaces() {
    try {
      const result = await browser.storage.local.get("workspaces");
      const workspaces = result.workspaces || {};
      const items = Object.values(workspaces).sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );

      if (items.length === 0) {
        wsExistingList.innerHTML = `<p class="ws-empty-msg">No saved workspaces yet</p>`;
      } else {
        wsExistingList.innerHTML = items
          .map(
            (ws) => `
          <div class="ws-item" data-id="${ws.id}">
            <div class="ws-item-info">
              <div class="ws-item-name">${escapeHtml(ws.name)}</div>
              <div class="ws-item-meta">${ws.notes.length} note${ws.notes.length !== 1 ? "s" : ""} • ${formatDateTime(ws.updatedAt)}</div>
            </div>
            <button class="ws-item-delete" data-id="${ws.id}" title="Delete workspace">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        `
          )
          .join("");

        wsExistingList.querySelectorAll(".ws-item").forEach((item) => {
          item.addEventListener("click", (e) => {
            if (e.target.closest(".ws-item-delete")) return;
            const id = item.getAttribute("data-id");
            openExistingWorkspace(id);
          });
        });

        wsExistingList.querySelectorAll(".ws-item-delete").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            await deleteWorkspace(id);
            loadExistingWorkspaces();
          });
        });
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      showToast("Failed to load workspaces", "error");
    }
  }

  async function openExistingWorkspace(id) {
    try {
      const result = await browser.storage.local.get("workspaces");
      const workspaces = result.workspaces || {};
      if (workspaces[id]) {
        currentWorkspace = { ...workspaces[id] };
        workspaceNameInput.value = currentWorkspace.name;
        // Switch to New tab (where the workspace name input is)
        wsTabNew.classList.add("active");
        wsTabExisting.classList.remove("active");
        wsPanelNew.style.display = "";
        wsPanelExisting.style.display = "none";
        markSaved();
        renderNotes();
        autoSave();
        showToast(`Opened "${currentWorkspace.name}"`, "info");
      }
    } catch (err) {
      showToast("Failed to load workspace", "error");
    }
  }

  async function deleteWorkspace(id) {
    try {
      const result = await browser.storage.local.get("workspaces");
      const workspaces = result.workspaces || {};
      const name = workspaces[id] ? workspaces[id].name : "workspace";
      delete workspaces[id];
      await browser.storage.local.set({ workspaces });
      showToast(`Deleted "${name}"`, "info");
    } catch (err) {
      showToast("Failed to delete workspace", "error");
    }
  }

  // --- PDF Export ---
  async function exportPdf() {
    if (!currentWorkspace || currentWorkspace.notes.length === 0) {
      showToast("No notes to export", "error");
      return;
    }

    showToast("Generating PDF…", "info");

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229);
      doc.text(currentWorkspace.name, margin, y + 7);
      y += 14;

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 140);
      doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y);
      y += 8;

      doc.setDrawColor(200, 200, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      for (let i = 0; i < currentWorkspace.notes.length; i++) {
        const note = currentWorkspace.notes[i];

        if (y > 260) {
          doc.addPage();
          y = margin;
        }

        // Source hyperlink + timestamp (only if enabled)
        if (showMetadata) {
          doc.setFontSize(8);
          // Draw a small globe icon
          doc.setDrawColor(79, 70, 229);
          doc.circle(margin + 2, y - 1.5, 1.8, "S");
          doc.setLineWidth(0.2);
          doc.line(margin + 0.2, y - 1.5, margin + 3.8, y - 1.5);
          doc.setTextColor(79, 70, 229);
          doc.textWithLink("Source", margin + 5.5, y, { url: note.url });
          doc.setTextColor(100, 100, 130);
          const tsX = pageWidth - margin;
          doc.text(formatDateTime(note.timestamp), tsX, y, { align: "right" });
          y += 5;
        }

        if (note.type === "text") {
          const bulletIndent = margin + 5;
          const bulletWidth = contentWidth - 5;
          
          if (note.keepStyle) {
            doc.setFont("courier", "normal");
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(note.content, contentWidth - 4);
            const blockHeight = lines.length * 4 + 4;
            
            if (y + blockHeight > 275) { doc.addPage(); y = margin; }
            
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y, contentWidth, blockHeight, "F");
            doc.setTextColor(50, 50, 50);
            
            let tempY = y + 4;
            for (const line of lines) {
              doc.text(line, margin + 2, tempY);
              tempY += 4;
            }
            y += blockHeight;
            doc.setFont("helvetica", "normal"); // reset
          } else {
            doc.setFontSize(11);
            doc.setTextColor(30, 30, 50);
            // Draw bullet
            doc.text("\u2022", margin, y);
            const lines = doc.splitTextToSize(note.content, bulletWidth);
            for (const line of lines) {
              if (y > 275) { doc.addPage(); y = margin; }
              doc.text(line, bulletIndent, y);
              y += 5;
            }
          }
        } else if (note.type === "image") {
          try {
            const imgData = note.content;
            const imgProps = doc.getImageProperties(imgData);
            let imgWidth = contentWidth;
            let imgHeight = (imgProps.height / imgProps.width) * imgWidth;
            if (imgHeight > 120) { imgHeight = 120; imgWidth = (imgProps.width / imgProps.height) * imgHeight; }
            if (y + imgHeight > 275) { doc.addPage(); y = margin; }
            doc.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
            y += imgHeight + 2;
          } catch (imgErr) {
            doc.setFontSize(9);
            doc.setTextColor(200, 100, 100);
            doc.text("[Image could not be embedded]", margin, y);
            y += 5;
          }
        }

        y += 6;
        if (i < currentWorkspace.notes.length - 1) {
          doc.setDrawColor(220, 220, 235);
          doc.line(margin, y - 2, pageWidth - margin, y - 2);
          y += 4;
        }
      }

      doc.save(`${sanitizeFilename(currentWorkspace.name)}.pdf`);
      showToast("PDF exported!", "success");
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("PDF export failed: " + err.message, "error");
    }
  }

  // --- DOCX Export ---
  async function exportDocx() {
    if (!currentWorkspace || currentWorkspace.notes.length === 0) {
      showToast("No notes to export", "error");
      return;
    }

    showToast("Generating DOCX…", "info");

    try {
      const { Document, Paragraph, TextRun, ImageRun, ExternalHyperlink, BorderStyle } = window.docx;

      const children = [];

      children.push(
        new Paragraph({
          children: [new TextRun({ text: currentWorkspace.name, bold: true, size: 36, color: "4F46E5" })],
          spacing: { after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Exported: ${new Date().toLocaleString()}`, size: 18, color: "888888", italics: true })],
          spacing: { after: 300 },
        })
      );

      for (const note of currentWorkspace.notes) {
        children.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" } },
            spacing: { after: 100 },
          })
        );

        if (showMetadata) {
          children.push(
            new Paragraph({
              children: [
                new ExternalHyperlink({
                  link: note.url,
                  children: [
                    new TextRun({ text: "🌐 Source", size: 16, color: "4F46E5", underline: { type: "single", color: "4F46E5" } }),
                  ],
                }),
                new TextRun({ text: "\t" }),
                new TextRun({ text: `🕐 ${formatDateTime(note.timestamp)}`, size: 16, color: "888888" }),
              ],
              spacing: { after: 80 },
              tabStops: [{ type: window.docx.TabStopType ? window.docx.TabStopType.RIGHT : "right", position: 9000 }],
            })
          );
        }

        if (note.type === "text") {
          if (note.keepStyle) {
            const lines = note.content.split('\n');
            const textRuns = lines.map((line, idx) => 
              new TextRun({ 
                text: line, 
                size: 20, 
                font: "Consolas", 
                break: idx > 0 ? 1 : 0 
              })
            );
            children.push(
              new Paragraph({
                children: textRuns,
                spacing: { after: 200 },
                shading: { type: window.docx.ShadingType ? window.docx.ShadingType.CLEAR : "clear", fill: "F3F4F6" },
              })
            );
          } else {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: "\u2022  ", size: 22, bold: true }), new TextRun({ text: note.content, size: 22 })],
                spacing: { after: 200 },
                indent: { left: 200, hanging: 200 },
              })
            );
          }
        } else if (note.type === "image") {
          try {
            const base64 = note.content.split(",")[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }

            const dims = await getImageDimensions(note.content);
            let width = dims.width;
            let height = dims.height;
            if (width > 500) { height = (500 / width) * height; width = 500; }

            children.push(
              new Paragraph({
                children: [new ImageRun({ data: bytes.buffer, transformation: { width, height }, type: "png" })],
                spacing: { after: 200 },
              })
            );
          } catch (imgErr) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: "[Image could not be embedded]", italics: true, color: "CC6666", size: 18 })],
                spacing: { after: 200 },
              })
            );
          }
        }
      }

      const doc = new Document({ sections: [{ children }] });
      const blob = await window.docx.Packer.toBlob(doc);
      saveAs(blob, `${sanitizeFilename(currentWorkspace.name)}.docx`);
      showToast("DOCX exported!", "success");
    } catch (err) {
      console.error("DOCX export failed:", err);
      showToast("DOCX export failed: " + err.message, "error");
    }
  }

  // --- Helpers ---
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
  }

  function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " • " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function shortenUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname.length > 30 ? u.pathname.substring(0, 30) + "…" : u.pathname);
    } catch { return url ? url.substring(0, 50) : "Unknown source"; }
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function sanitizeHtml(html) {
    if (!html) return "";
    const allowedTags = new Set([
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "b", "strong", "i", "em", "u", "s", "mark", "sub", "sup",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "a", "span", "div",
      "table", "thead", "tbody", "tr", "td", "th",
      "img", "figure", "figcaption",
    ]);

    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Remove scripts, styles, iframes, etc.
    temp.querySelectorAll("script, style, iframe, object, embed, form, input, textarea, button").forEach((el) => el.remove());

    // Remove event handler attributes and dangerous attrs
    temp.querySelectorAll("*").forEach((el) => {
      if (!allowedTags.has(el.tagName.toLowerCase())) {
        // Replace unknown tags with their content
        el.replaceWith(...el.childNodes);
        return;
      }
      // Remove all event handlers and dangerous attributes, but keep style & class
      const attrs = Array.from(el.attributes);
      const safeStyleProps = /^(color|background-color|background|font-size|font-weight|font-style|font-family|text-decoration|text-align|white-space|padding|padding-left|padding-right|margin|margin-left|margin-right|display|line-height|letter-spacing|border|border-left|border-right|border-bottom|border-top|border-radius|opacity|tab-size)/i;
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on") || name === "srcset") {
          el.removeAttribute(attr.name);
        }
        // Sanitize style: keep only safe CSS properties
        if (name === "style") {
          const raw = attr.value;
          const safe = raw.split(";").filter(rule => {
            const prop = rule.split(":")[0]?.trim();
            return prop && safeStyleProps.test(prop);
          }).join(";");
          if (safe) {
            el.setAttribute("style", safe);
          } else {
            el.removeAttribute("style");
          }
        }
      }
      // Allow href on <a> tags only, and ensure it's not javascript:
      if (el.tagName === "A") {
        const href = el.getAttribute("href") || "";
        if (href.toLowerCase().startsWith("javascript:")) {
          el.removeAttribute("href");
        }
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      }
    });

    return temp.innerHTML;
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "WebAnnotator";
  }

  function getImageDimensions(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 300, height: 200 });
      img.src = dataUrl;
    });
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
})();
