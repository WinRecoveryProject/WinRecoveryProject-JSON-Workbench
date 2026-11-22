const JSON_VIEWER_CSS_FILES = ['styles/pageViewer.css'];
const JSON_VIEWER_JS_FILES = [
  'js/jsonDocument.js',
  'js/prismManual.js',
  'js/prism.js',
  'js/treeView.js',
  'js/tableView.js',
  'js/pageViewer.js',
];

const HTTP_URLS = ['http://*/*', 'https://*/*'];
const AUTO_DETECT_STORAGE_KEY = 'autoDetectJsonPages';

// Track whether listeners are currently registered
let listenersRegistered = false;

function getHeaderValue(headers, headerName) {
  if (!Array.isArray(headers)) return null;
  const target = String(headerName || '').toLowerCase();
  for (const h of headers) {
    if (!h || !h.name) continue;
    if (String(h.name).toLowerCase() === target) return h.value || null;
  }
  return null;
}

function isJsonMediaType(contentTypeHeaderValue) {
  if (!contentTypeHeaderValue) return false;
  const mediaType = String(contentTypeHeaderValue).split(';')[0].trim().toLowerCase();
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

function chromeAsync(fn, details) {
  return new Promise((resolve, reject) => {
    fn(details, (result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(err);
      else resolve(result);
    });
  });
}

const injectedRequestByTab = new Map(); // tabId -> requestId

async function injectJsonViewer(tabId) {
  // Insert CSS first (best-effort), then scripts.
  try {
    await chromeAsync(chrome.scripting.insertCSS, {
      target: { tabId, allFrames: false },
      files: JSON_VIEWER_CSS_FILES,
    });
  } catch {
    // Ignore CSS insertion errors (e.g., already inserted).
  }

  await chromeAsync(chrome.scripting.executeScript, {
    target: { tabId, allFrames: false },
    files: JSON_VIEWER_JS_FILES,
  });
}

// Listener functions (named so they can be removed)
function onBeforeRequestListener(details) {
  if (details.type !== 'main_frame') return;
  if (typeof details.tabId !== 'number' || details.tabId < 0) return;
  injectedRequestByTab.delete(details.tabId);
}

async function onHeadersReceivedListener(details) {
  if (details.type !== 'main_frame') return;
  if (typeof details.tabId !== 'number' || details.tabId < 0) return;

  const contentType = getHeaderValue(details.responseHeaders, 'content-type');
  if (!isJsonMediaType(contentType)) return;

  const lastRequestId = injectedRequestByTab.get(details.tabId);
  if (lastRequestId === details.requestId) return;
  injectedRequestByTab.set(details.tabId, details.requestId);

  try {
    await injectJsonViewer(details.tabId);
  } catch (e) {
    // Non-fatal: if injection fails, leave the page untouched.
    // eslint-disable-next-line no-console
    console.warn('JSON Studio: failed to inject viewer', e);
  }
}

function registerWebRequestListeners() {
  if (listenersRegistered) return;
  
  try {
    chrome.webRequest.onBeforeRequest.addListener(
      onBeforeRequestListener,
      { urls: HTTP_URLS, types: ['main_frame'] }
    );

    chrome.webRequest.onHeadersReceived.addListener(
      onHeadersReceivedListener,
      { urls: HTTP_URLS, types: ['main_frame'] },
      ['responseHeaders']
    );
    
    listenersRegistered = true;
    console.log('JSON Studio: Auto-detect listeners registered');
  } catch (e) {
    console.warn('JSON Studio: Failed to register webRequest listeners', e);
  }
}

function unregisterWebRequestListeners() {
  if (!listenersRegistered) return;
  
  try {
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestListener);
    chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceivedListener);
    listenersRegistered = false;
    console.log('JSON Studio: Auto-detect listeners unregistered');
  } catch (e) {
    console.warn('JSON Studio: Failed to unregister webRequest listeners', e);
  }
}

async function checkAndUpdateListeners() {
  // Optimistically register listeners immediately so that if the user navigates to a
  // JSON URL during a cold service-worker start (before async checks finish), the
  // onHeadersReceived listener is already in place and injection is not missed.
  registerWebRequestListeners();

  // Check if we have the required permissions
  const hasPermissions = await new Promise((resolve) => {
    chrome.permissions.contains({
      permissions: ['webRequest'],
      origins: HTTP_URLS
    }, resolve);
  });

  if (!hasPermissions) {
    unregisterWebRequestListeners();
    return;
  }

  // Check if auto-detect is enabled in settings; only unregister if explicitly disabled.
  chrome.storage.sync.get([AUTO_DETECT_STORAGE_KEY], (res) => {
    const enabled = res[AUTO_DETECT_STORAGE_KEY] !== false; // Default to true if not set
    if (!enabled) {
      unregisterWebRequestListeners();
    }
  });
}

// Initialize on service worker startup
checkAndUpdateListeners();

// Listen for storage changes to update listeners dynamically
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[AUTO_DETECT_STORAGE_KEY]) {
    checkAndUpdateListeners();
  }
});

// Listen for permission changes
chrome.permissions.onAdded.addListener(() => {
  checkAndUpdateListeners();
});

chrome.permissions.onRemoved.addListener(() => {
  checkAndUpdateListeners();
});

chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
