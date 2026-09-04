/**
 * background.js — Frame Catcher Background Script (Safari Compatible)
 *
 * Safari does not support chrome.downloads API.
 * All file saving is handled directly in content.js via:
 *   - File System Access API (showDirectoryPicker) — preferred
 *   - <a download> fallback — automatic
 *
 * This script only relays messages between popup and content scripts.
 */

// Safari compatibility shim
if (typeof browser === 'undefined') var browser = chrome;

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Download action is no longer needed in Safari (handled in content.js)
  // Keep this listener for future messaging needs
  if (message.action === 'download') {
    // In Safari, downloading is handled entirely in content.js
    // This is a no-op fallback in case old message is received
    sendResponse({ success: false, error: 'Use content.js FSA or fallback download' });
    return false;
  }
  return false;
});
