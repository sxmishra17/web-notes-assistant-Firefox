// ============================================================
// Web Notes Assistant — Background Script
// Manages toggle state, messaging relay, and screenshot capture
// ============================================================

const state = {
  activeTabIds: new Set(),
};

// --- Browser Action: Toggle panel on/off ---
browser.browserAction.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  const isActive = state.activeTabIds.has(tabId);

  if (isActive) {
    // Deactivate
    state.activeTabIds.delete(tabId);
    browser.browserAction.setTitle({ tabId, title: "Toggle Web Notes Assistant" });
    browser.browserAction.setBadgeText({ tabId, text: "" });
    try {
      await browser.tabs.sendMessage(tabId, { action: "deactivate" });
    } catch (e) { /* content script may not be loaded */ }
  } else {
    // Activate
    state.activeTabIds.add(tabId);
    browser.browserAction.setTitle({ tabId, title: "Web Notes Assistant (ON)" });
    browser.browserAction.setBadgeText({ tabId, text: "ON" });
    browser.browserAction.setBadgeBackgroundColor({ tabId, color: "#7C3AED" });
    try {
      await browser.tabs.sendMessage(tabId, { action: "activate" });
    } catch (e) { /* content script may not be loaded */ }
  }
});

// --- Clean up state when tab is closed ---
browser.tabs.onRemoved.addListener((tabId) => {
  state.activeTabIds.delete(tabId);
});

// --- Message handler ---
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "addNote":
      // Relay note from content script to sidebar iframe
      browser.runtime.sendMessage({
        action: "newNote",
        note: message.note,
      }).catch(() => {});
      break;

    case "captureVisibleTab":
      // Capture the visible tab screenshot
      browser.tabs.captureVisibleTab(null, { format: "png" })
        .then((dataUrl) => sendResponse({ dataUrl }))
        .catch((err) => sendResponse({ error: err.message }));
      return true; // async response

    case "checkActive":
      if (sender.tab) {
        sendResponse({ active: state.activeTabIds.has(sender.tab.id) });
      } else {
        sendResponse({ active: false });
      }
      return true;

    case "getTabInfo":
      browser.tabs.query({ active: true, currentWindow: true })
        .then((tabs) => {
          if (tabs[0]) {
            sendResponse({ url: tabs[0].url, title: tabs[0].title });
          } else {
            sendResponse({ url: "", title: "" });
          }
        });
      return true;

    // --- Sidebar → Content script relay ---
    case "toggleTakeNotes":
      // Relay take-notes toggle to content script in active tab
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, {
            action: "setTakeNotes",
            enabled: message.enabled,
          }).catch(() => {});
        }
      });
      break;

    case "triggerScreenshot":
      // Relay screenshot trigger to content script in active tab
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, {
            action: "startScreenshot",
          }).catch(() => {});
        }
      });
      break;
  }
});
