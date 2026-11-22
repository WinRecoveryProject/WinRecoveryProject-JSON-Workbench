/**
 * JSON Studio - Main Extension Controller (v3.0.0)
 * All-in-One JSON Workbench for Google Chrome & Microsoft Edge
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // ─── 1. DOM Elements ────────────────────────────────────────────────────────

  const autodetectBtn = document.getElementById('autodetect-btn');
  const autodetectToggle = document.getElementById('autodetect-toggle');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const darkmodeToggle = document.getElementById('darkmode-toggle');
  const viewSourceJsonHeaderBtn = document.getElementById('viewSourceJsonHeaderBtn');
  const syntaxThemeBtn = document.getElementById('syntaxThemeBtn');
  const syntaxThemeDropdown = document.getElementById('syntaxThemeDropdown');
  const settingsThemeGrid = document.getElementById('settingsThemeGrid');

  // Navigation Tabs
  const tabButtons = document.querySelectorAll('.nav-bar .tab-button');
  const tabContents = document.querySelectorAll('.main-content .tab-content');

  // Editor Tab
  const mainEditorWrapper = document.getElementById('mainEditorWrapper');
  const mainJsonHighlight = document.getElementById('mainJsonHighlight');
  const mainJsonInput = document.getElementById('mainJsonInput');
  const repairJsonBtn = document.getElementById('repairJsonBtn');
  const format2Btn = document.getElementById('format2Btn');
  const format4Btn = document.getElementById('format4Btn');
  const minifyBtn = document.getElementById('minifyBtn');
  const undoEditorBtn = document.getElementById('undoEditorBtn');
  const sortKeysBtn = document.getElementById('sortKeysBtn');
  const escapeStringBtn = document.getElementById('escapeStringBtn');
  const fetchUrlBtn = document.getElementById('fetchUrlBtn');
  const editorFileInput = document.getElementById('editorFileInput');
  const copyEditorBtn = document.getElementById('copyEditorBtn');
  const clearEditorBtn = document.getElementById('clearEditorBtn');
  const jsonStatusChip = document.getElementById('jsonStatusChip');
  const charCountInfo = document.getElementById('charCountInfo');
  const nodeCountInfo = document.getElementById('nodeCountInfo');

  // Source JSON Quick-view Drawer
  const sourceJsonDrawer = document.getElementById('sourceJsonDrawer');
  const drawerJsonCode = document.getElementById('drawerJsonCode');
  const drawerJsonSize = document.getElementById('drawerJsonSize');
  const drawerCopyBtn = document.getElementById('drawerCopyBtn');
  const drawerGoEditorBtn = document.getElementById('drawerGoEditorBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const peekSourceBtns = document.querySelectorAll('.peek-source-btn');

  // Query Tab
  const engineJmesBtn = document.getElementById('engineJmesBtn');
  const engineJsonPathBtn = document.getElementById('engineJsonPathBtn');
  const jmesPathInput = document.getElementById('jmesPath');
  const jmesPathSuggestions = document.getElementById('jmesPathSuggestions');
  const executeQueryBtn = document.getElementById('executeQuery');
  const saveQueryBtn = document.getElementById('saveQuery');
  const historyBtn = document.getElementById('historyBtn');
  const examplesBtn = document.getElementById('examplesBtn');
  const queryResultEl = document.getElementById('result');
  const copyResultBtn = document.getElementById('copyResult');
  const exportResultBtn = document.getElementById('exportResult');
  const savedQueriesList = document.getElementById('savedQueriesList');

  // Tree & Table Tab
  const viewModeTreeBtn = document.getElementById('viewModeTreeBtn');
  const viewModeTableBtn = document.getElementById('viewModeTableBtn');
  const treeSpecificActions = document.getElementById('treeSpecificActions');
  const treeSearchToolbar = document.getElementById('treeSearchToolbar');
  const treeDisplay = document.getElementById('treeDisplay');
  const tableDisplay = document.getElementById('tableDisplay');
  const treeSortKeysToggle = document.getElementById('treeSortKeysToggle');
  const expandAllBtn = document.getElementById('expandAll');
  const collapseAllBtn = document.getElementById('collapseAll');
  const depth1Btn = document.getElementById('depth1Btn');
  const depth2Btn = document.getElementById('depth2Btn');
  const depth3Btn = document.getElementById('depth3Btn');
  const treeSearchInput = document.getElementById('treeSearchInput');
  const treeSearchCount = document.getElementById('treeSearchCount');
  const treeSearchPrev = document.getElementById('treeSearchPrev');
  const treeSearchNext = document.getElementById('treeSearchNext');
  const treeSearchClear = document.getElementById('treeSearchClear');
  const treePerfWarning = document.getElementById('treePerfWarning');
  const dismissTreePerf = document.getElementById('dismissTreePerf');

  // Convert Tab
  const conversionCards = document.querySelectorAll('.conversion-card');
  const convertedResultEl = document.getElementById('convertedResult');
  const copyConvertedBtn = document.getElementById('copyConverted');
  const exportConvertedBtn = document.getElementById('exportConverted');

  // Compare Tab
  const compareWrapperA = document.getElementById('compareWrapperA');
  const compareHighlightA = document.getElementById('compareHighlightA');
  const compareInputA = document.getElementById('compareJsonInputA');
  const compareWrapperB = document.getElementById('compareWrapperB');
  const compareHighlightB = document.getElementById('compareHighlightB');
  const compareInputB = document.getElementById('compareJsonInputB');
  const compareFormatABtn = document.getElementById('compareFormatA');
  const compareMinifyABtn = document.getElementById('compareMinifyA');
  const compareFormatBBtn = document.getElementById('compareFormatB');
  const compareMinifyBBtn = document.getElementById('compareMinifyB');
  const compareRunBtn = document.getElementById('compareRun');
  const compareSwapBtn = document.getElementById('compareSwapBtn');
  const diffViewTreeBtn = document.getElementById('diffViewTree');
  const diffViewSplitBtn = document.getElementById('diffViewSplit');
  const diffSummaryEl = document.getElementById('diffSummary');
  const copyDiffBtn = document.getElementById('copyDiff');
  const compareTreeDiffEl = document.getElementById('compareTreeDiff');
  const compareSideBySideEl = document.getElementById('compareSideBySide');

  // Utilities Tab
  const utilTabBtns = document.querySelectorAll('.util-tab-btn');
  const utilPanes = document.querySelectorAll('.util-pane');
  const jwtInput = document.getElementById('jwtInput');
  const decodeJwtBtn = document.getElementById('decodeJwtBtn');
  const jwtResultCode = document.getElementById('jwtResultCode');
  const jwtStatusBadge = document.getElementById('jwtStatusBadge');
  const b64EncodeBtn = document.getElementById('b64EncodeBtn');
  const b64DecodeBtn = document.getElementById('b64DecodeBtn');
  const base64Textarea = document.getElementById('base64Textarea');
  const copyB64Btn = document.getElementById('copyB64Btn');
  const schemaInput = document.getElementById('schemaInput');
  const generateSchemaBtn = document.getElementById('generateSchemaBtn');
  const validateSchemaBtn = document.getElementById('validateSchemaBtn');
  const schemaValidationResult = document.getElementById('schemaValidationResult');
  const statSize = document.getElementById('statSize');
  const statNodes = document.getElementById('statNodes');
  const statDepth = document.getElementById('statDepth');
  const statKeys = document.getElementById('statKeys');
  const statArrays = document.getElementById('statArrays');
  const statStrings = document.getElementById('statStrings');

  // ─── 2. Internal State ──────────────────────────────────────────────────────

  let currentParsedData = null;
  let currentQueryResult;
  let lastDocumentText = null;
  let currentConversionCode = '';
  let currentConversionMeta = { filename: 'code.txt', mime: 'text/plain' };
  let selectedLang = 'typescript';
  let activeQueryEngine = 'jmespath'; // 'jmespath' or 'jsonpath'
  let activeViewMode = 'tree'; // 'tree' or 'table'
  let activeDiffMode = 'tree'; // 'tree' or 'split'
  let lastDiffNode = null;
  let lastPrettyA = '';
  let lastPrettyB = '';
  let sortKeysEnabled = false;
  let editHistory = new window.JsonDocument.EditHistory();
  let pendingRepairSource = '';

  function pushUndoState(customText = null) {
    editHistory.record(customText !== null ? customText : mainJsonInput.value);
    updateUndoButtonState();
  }

  function undoLastChange() {
    editHistory.record(mainJsonInput.value);
    if (!editHistory.canUndo) return;
    mainJsonInput.value = editHistory.undo();
    updateEditorDiagnostics();
  }

  function redoLastChange() {
    if (!editHistory.canRedo) return;
    mainJsonInput.value = editHistory.redo();
    updateEditorDiagnostics();
  }

  function updateUndoButtonState() {
    if (undoEditorBtn) undoEditorBtn.disabled = !editHistory.canUndo;
    const redo = document.getElementById('redoEditorBtn');
    if (redo) redo.disabled = !editHistory.canRedo;
  }

  // Initialize instances
  const converter = new JsonToClassConverter();
  const treeView = (window.TreeView && treeDisplay)
    ? new window.TreeView({ container: treeDisplay, perfWarningEl: treePerfWarning })
    : null;
  const queryWorkspace = new window.QueryWorkspace({
    editor: mainJsonInput,
    parse: parseCurrentJson,
    getEngine: () => activeQueryEngine,
    queryInput: jmesPathInput,
    onEdit: () => { document.querySelector('[data-tab="editor"]').click(); mainJsonInput.focus(); },
  });
  const tableView = (window.TableView && tableDisplay)
    ? new window.TableView({ container: tableDisplay })
    : null;

  // ─── 2.5 JSON Editor Syntax Highlighting (Editor & Compare Tabs) ─────────────

  function setupJsonEditorHighlight({ textarea, codeEl, wrapperEl }) {
    if (!textarea || !codeEl || !wrapperEl) return null;
    const backdrop = codeEl.parentElement;

    function syncScroll() {
      if (backdrop) {
        backdrop.scrollTop = textarea.scrollTop;
        backdrop.scrollLeft = textarea.scrollLeft;
      }
    }

    function update() {
      const val = textarea.value;
      const trimmed = val.trim();

      if (!trimmed) {
        codeEl.innerHTML = '';
        wrapperEl.classList.remove('has-syntax-highlight');
        return;
      }

      // Safeguard against freezing on huge files (> 500 KB)
      if (val.length > 500000) {
        codeEl.innerHTML = '';
        wrapperEl.classList.remove('has-syntax-highlight');
        return;
      }

      let isValid = false;
      try {
        JSON.parse(trimmed);
        isValid = true;
      } catch {
        // Also check if JSONP
        const jsonpMatch = trimmed.match(/^\s*([a-zA-Z_$][\w$]*)\s*\(\s*([\s\S]*)\s*\)\s*;?\s*$/);
        if (jsonpMatch) {
          try {
            JSON.parse(jsonpMatch[2]);
            isValid = true;
          } catch {}
        }
      }

      if (isValid && window.Prism && window.Prism.languages && window.Prism.languages.json) {
        let toHighlight = val;
        if (toHighlight.endsWith('\n')) {
          toHighlight += ' ';
        }
        try {
          codeEl.innerHTML = window.Prism.highlight(toHighlight, window.Prism.languages.json, 'json');
          wrapperEl.classList.add('has-syntax-highlight');
          syncScroll();
        } catch {
          codeEl.innerHTML = '';
          wrapperEl.classList.remove('has-syntax-highlight');
        }
      } else {
        codeEl.innerHTML = '';
        wrapperEl.classList.remove('has-syntax-highlight');
      }
    }

    if (textarea !== mainJsonInput) textarea.addEventListener('input', debounce(update, 100));
    textarea.addEventListener('paste', () => setTimeout(update, 0));
    textarea.addEventListener('scroll', syncScroll);

    // Tab follows normal keyboard focus navigation. Use Format to indent JSON.

    // Support Drag and Drop of JSON file into the textarea
    textarea.addEventListener('dragover', (e) => {
      e.preventDefault();
      textarea.style.backgroundColor = 'var(--accent-muted)';
    });
    textarea.addEventListener('dragleave', () => {
      textarea.style.backgroundColor = '';
    });
    textarea.addEventListener('drop', (e) => {
      e.preventDefault();
      textarea.style.backgroundColor = '';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target.result;
          if (textarea === mainJsonInput) pushUndoState();
          try {
            const parsed = window.JsonDocument.parse(text);
            textarea.value = window.JsonDocument.format(text, 2);
          } catch {
            textarea.value = text;
          }
          update();
          if (textarea === mainJsonInput) {
            updateEditorDiagnostics();
          } else {
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        };
        reader.readAsText(file);
      }
    });

    return {
      update,
      syncScroll,
    };
  }

  const mainEditorHighlighter = setupJsonEditorHighlight({
    textarea: mainJsonInput,
    codeEl: mainJsonHighlight,
    wrapperEl: mainEditorWrapper,
  });

  const compareHighlighterA = setupJsonEditorHighlight({
    textarea: compareInputA,
    codeEl: compareHighlightA,
    wrapperEl: compareWrapperA,
  });

  const compareHighlighterB = setupJsonEditorHighlight({
    textarea: compareInputB,
    codeEl: compareHighlightB,
    wrapperEl: compareWrapperB,
  });

  // ─── 3. Storage Keys & Initialization ───────────────────────────────────────

  const STORAGE_KEYS = {
    theme: 'theme',
    mainJson: 'lastMainJson',
    sortKeys: 'sortKeysEnabled',
    queryHistory: 'queryHistory',
    savedQueries: 'savedQueries',
    autoDetect: 'autoDetectJsonPages',
    compareA: 'lastCompareJsonA',
    compareB: 'lastCompareJsonB',
    jsonSyntaxTheme: 'jsonSyntaxTheme',
  };

  // ─── 2.8 JSON Syntax Themes System ──────────────────────────────────────────

  const JSON_THEMES = [
    {
      id: 'emerald',
      name: 'Emerald (Default)',
      badge: 'Green Strings',
      desc: 'Royal Blue keys, Emerald Green strings, Amber numbers, Violet booleans',
      swatch: ['#1a73e8', '#188038', '#d97706', '#7c3aed'],
      tokens: { key: '#1a73e8', str: '#188038', num: '#d97706', bool: '#7c3aed' }
    },
    {
      id: 'vscode',
      name: 'VS Code Modern',
      badge: 'IDE Classic',
      desc: 'Light Blue keys, Soft Green strings, Teal numbers, Blue booleans',
      swatch: ['#0284c7', '#15803d', '#0d9488', '#2563eb'],
      tokens: { key: '#0284c7', str: '#15803d', num: '#0d9488', bool: '#2563eb' }
    },
    {
      id: 'onedark',
      name: 'One Dark / Tokyo',
      badge: 'Warm Contrast',
      desc: 'Coral Red keys, Spring Green strings, Warm Orange numbers, Cyan booleans',
      swatch: ['#e11d48', '#16a34a', '#ea580c', '#0891b2'],
      tokens: { key: '#e11d48', str: '#16a34a', num: '#ea580c', bool: '#0891b2' }
    },
    {
      id: 'dracula',
      name: 'Dracula',
      badge: 'Vibrant Glow',
      desc: 'Neon Pink keys, Lime Green strings, Purple numbers, Sky Blue booleans',
      swatch: ['#db2777', '#65a30d', '#7c3aed', '#0284c7'],
      tokens: { key: '#db2777', str: '#65a30d', num: '#7c3aed', bool: '#0284c7' }
    },
    {
      id: 'monokai',
      name: 'Monokai',
      badge: 'Pro Hacker',
      desc: 'Cyan keys, Ochre strings, Purple numbers, Orange booleans',
      swatch: ['#0284c7', '#b45309', '#7c3aed', '#ea580c'],
      tokens: { key: '#0284c7', str: '#b45309', num: '#7c3aed', bool: '#ea580c' }
    },
    {
      id: 'classic',
      name: 'Classic DevTools',
      badge: 'Red Strings',
      desc: 'Royal Blue keys, Crimson Red strings, Emerald numbers',
      swatch: ['#1a73e8', '#d93025', '#188038', '#1a73e8'],
      tokens: { key: '#1a73e8', str: '#d93025', num: '#188038', bool: '#1a73e8' }
    }
  ];

  let currentJsonSyntaxTheme = 'emerald';

  function applyJsonSyntaxTheme(themeId, persist = true) {
    const found = JSON_THEMES.find(t => t.id === themeId);
    const safeId = found ? found.id : 'emerald';
    currentJsonSyntaxTheme = safeId;

    document.documentElement.setAttribute('data-json-theme', safeId);
    document.body.removeAttribute('data-json-theme');

    // Update dropdown active state
    document.querySelectorAll('#syntaxThemeDropdown .theme-option').forEach(el => {
      if (el.getAttribute('data-theme-id') === safeId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update settings grid cards if rendered
    document.querySelectorAll('.settings-theme-card').forEach(card => {
      if (card.getAttribute('data-theme-id') === safeId) {
        card.classList.add('active');
        const b = card.querySelector('.settings-card-badge');
        if (b) b.textContent = 'Active Theme';
      } else {
        card.classList.remove('active');
        const tMeta = JSON_THEMES.find(t => t.id === card.getAttribute('data-theme-id'));
        const b = card.querySelector('.settings-card-badge');
        if (b && tMeta) b.textContent = tMeta.badge;
      }
    });

    if (persist) {
      if (chrome?.storage?.sync) {
        chrome.storage.sync.set({ [STORAGE_KEYS.jsonSyntaxTheme]: safeId });
      }
      try {
        localStorage.setItem('jsonSyntaxTheme', safeId);
      } catch {}
    }

    // Refresh editors & syntax highlighting
    mainEditorHighlighter?.update();
    compareHighlighterA?.update();
    compareHighlighterB?.update();
  }

  function renderSettingsThemeGrid() {
    if (!settingsThemeGrid) return;
    settingsThemeGrid.innerHTML = '';

    JSON_THEMES.forEach(theme => {
      const card = document.createElement('div');
      const isActive = currentJsonSyntaxTheme === theme.id;
      card.className = `settings-theme-card ${isActive ? 'active' : ''}`;
      card.setAttribute('data-theme-id', theme.id);

      card.innerHTML = `
        <div class="settings-card-top">
          <div class="settings-card-title">
            <span class="theme-radio-dot"></span>
            <span>${escapeHtml(theme.name)}</span>
          </div>
          <span class="settings-card-badge">${isActive ? 'Active Theme' : escapeHtml(theme.badge)}</span>
        </div>
        <div class="settings-card-preview"><span style="color: var(--code-punct);">{</span>
  <span style="color: ${theme.tokens.key};">"project"</span><span style="color: var(--code-punct);">: </span><span style="color: ${theme.tokens.str};">"JSON Studio"</span><span style="color: var(--code-punct);">,</span>
  <span style="color: ${theme.tokens.key};">"stars"</span><span style="color: var(--code-punct);">: </span><span style="color: ${theme.tokens.num};">4280</span><span style="color: var(--code-punct);">,</span>
  <span style="color: ${theme.tokens.key};">"verified"</span><span style="color: var(--code-punct);">: </span><span style="color: ${theme.tokens.bool};">true</span>
<span style="color: var(--code-punct);">}</span></div>
      `;

      card.addEventListener('click', () => {
        applyJsonSyntaxTheme(theme.id, true);
        showNotification(`JSON syntax theme set to: ${theme.name}`, 'success');
      });

      settingsThemeGrid.appendChild(card);
    });
  }

  // Bind Header Syntax Theme Dropdown
  if (syntaxThemeBtn && syntaxThemeDropdown) {
    syntaxThemeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = syntaxThemeDropdown.style.display === 'none' || !syntaxThemeDropdown.style.display;
      syntaxThemeDropdown.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) syntaxThemeBtn.classList.add('active');
      else syntaxThemeBtn.classList.remove('active');
    });

    syntaxThemeDropdown.querySelectorAll('.theme-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const themeId = opt.getAttribute('data-theme-id');
        if (themeId) {
          applyJsonSyntaxTheme(themeId, true);
          const tMeta = JSON_THEMES.find(t => t.id === themeId);
          showNotification(`Theme switched to ${tMeta?.name || themeId}`, 'success');
        }
        syntaxThemeDropdown.style.display = 'none';
        syntaxThemeBtn.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!syntaxThemeDropdown.contains(e.target) && !syntaxThemeBtn.contains(e.target)) {
        syntaxThemeDropdown.style.display = 'none';
        syntaxThemeBtn.classList.remove('active');
      }
    });
  }

  // Initialize theme from local storage immediately to avoid flash
  try {
    const cachedTheme = localStorage.getItem('jsonSyntaxTheme');
    if (cachedTheme) applyJsonSyntaxTheme(cachedTheme, false);
  } catch {}

  // Restore stored state
  function restoreState() {
    if (!chrome?.storage) return;

    // Load theme & settings from sync
    chrome.storage.sync.get([STORAGE_KEYS.theme, STORAGE_KEYS.sortKeys, STORAGE_KEYS.autoDetect, STORAGE_KEYS.jsonSyntaxTheme, 'editorFontSize'], (res) => {
      if (res.editorFontSize && ['12', '14', '16', '18'].includes(String(res.editorFontSize))) {
        document.getElementById('fontSizeSelect').value = String(res.editorFontSize);
        document.documentElement.style.setProperty('--editor-font-size', `${res.editorFontSize}px`);
      }
      if (res[STORAGE_KEYS.sortKeys] !== undefined) {
        sortKeysEnabled = !!res[STORAGE_KEYS.sortKeys];
        treeView?.setSortKeysEnabled?.(sortKeysEnabled);
      }
      if (res[STORAGE_KEYS.jsonSyntaxTheme]) {
        applyJsonSyntaxTheme(res[STORAGE_KEYS.jsonSyntaxTheme], false);
      }
    });

    // Load persisted contents from local
    chrome.storage.local.get([
      STORAGE_KEYS.mainJson,
      STORAGE_KEYS.compareA,
      STORAGE_KEYS.compareB,
      'lastJsonInput',
      'lastJsonInputQuery',
    ], (res) => {
      const savedJson = Object.prototype.hasOwnProperty.call(res, STORAGE_KEYS.mainJson) ? res[STORAGE_KEYS.mainJson] : (res.lastJsonInput || res.lastJsonInputQuery || '');
      if (savedJson && mainJsonInput) {
        mainJsonInput.value = savedJson;
        editHistory = new window.JsonDocument.EditHistory(savedJson);
      }

      updateEditorDiagnostics();
      if (compareInputA && res[STORAGE_KEYS.compareA]) {
        compareInputA.value = res[STORAGE_KEYS.compareA];
        compareHighlighterA?.update();
      }
      if (compareInputB && res[STORAGE_KEYS.compareB]) {
        compareInputB.value = res[STORAGE_KEYS.compareB];
        compareHighlighterB?.update();
      }
    });

    loadSavedQueries();
    updateAutoDetectUI();
  }

  // ─── 4. Notification System ─────────────────────────────────────────────────

  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.setAttribute('role', type === 'error' ? 'alert' : 'status');
    n.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button type="button" class="notification-close" aria-label="Dismiss notification">&times;</button>
    `;
    document.body.appendChild(n);

    n.querySelector('.notification-close').addEventListener('click', () => n.remove());
    if (type !== 'error') setTimeout(() => {
      if (document.body.contains(n)) n.remove();
    }, 3200);
  }

  function debounce(fn, delayMs) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delayMs);
    };
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ─── 5. Tab Navigation & Synchronization ────────────────────────────────────

  document.querySelector('.tab-pill-group').setAttribute('role', 'tablist');
  document.querySelector('.tab-pill-group').setAttribute('aria-label', 'Workspace tools');
  tabButtons.forEach((button, index) => {
    const tab = button.dataset.tab;
    button.id = `nav-${tab}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `${tab}-tab`);
    button.setAttribute('aria-selected', String(button.classList.contains('active')));
    button.tabIndex = button.classList.contains('active') ? 0 : -1;
    const panel = document.getElementById(`${tab}-tab`);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    button.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabButtons.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabButtons.length - 1;
      if (target !== undefined) { event.preventDefault(); tabButtons[target].click(); tabButtons[target].focus(); }
    });
    button.addEventListener('click', function () {
      const target = this.getAttribute('data-tab');

      tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); b.tabIndex = -1; });
      tabContents.forEach(c => c.classList.remove('active'));

      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      this.tabIndex = 0;
      const targetContent = document.getElementById(target + '-tab');
      if (targetContent) targetContent.classList.add('active');

      // Sync active state when switching tabs
      onTabActivated(target);
    });
  });

  function onTabActivated(tabName) {
    const raw = mainJsonInput?.value.trim();

    if (tabName === 'editor') {
      mainEditorHighlighter?.update();
      mainEditorHighlighter?.syncScroll();
    } else if (tabName === 'query') {
      queryWorkspace.sync();
    } else if (tabName === 'compare') {
      compareHighlighterA?.update();
      compareHighlighterA?.syncScroll();
      compareHighlighterB?.update();
      compareHighlighterB?.syncScroll();
    } else if (tabName === 'tree') {
      renderVisualView();
    } else if (tabName === 'convert') {
      runCurrentConversion();
    } else if (tabName === 'utils') {
      updateJsonStatistics();
    }
  }

  // ─── 6. Editor Tab Logic ────────────────────────────────────────────────────

  function parseCurrentJson() {
    const raw = (mainJsonInput?.value || '').trim();
    if (!raw) return { ok: false, empty: true, error: 'Editor is empty' };

    try {
      const parsed = window.JsonDocument.parse(raw);
      currentParsedData = parsed;
      return { ok: true, data: parsed, raw };
    } catch (err) {
      // Check if it's JSONP
      const jsonpMatch = raw.match(/^\s*([a-zA-Z_$][\w$]*)\s*\(\s*([\s\S]*)\s*\)\s*;?\s*$/);
      if (jsonpMatch) {
        try {
          const parsed = window.JsonDocument.parse(jsonpMatch[2]);
          currentParsedData = parsed;
          return { ok: true, data: parsed, raw: jsonpMatch[2], isJsonp: true };
        } catch {}
      }

      currentParsedData = null;
      return { ok: false, error: err.message };
    }
  }

  function invalidateDerivedResults(text) {
    if (lastDocumentText !== text) {
      currentQueryResult = undefined;
      queryResultEl.textContent = '';
      currentConversionCode = '';
      convertedResultEl.textContent = '';
      lastDocumentText = text;
      if (document.getElementById('query-tab').classList.contains('active')) queryWorkspace.sync();
    }
  }

  function updateEditorDiagnostics() {
    const text = mainJsonInput?.value || '';
    editHistory.record(text);
    updateUndoButtonState();
    debouncedPersistMainJson();
    invalidateDerivedResults(text);
    const welcome = document.getElementById('editorWelcome');
    if (welcome) welcome.hidden = !!text.trim();
    const errorPanel = document.getElementById('editorError');
    if (errorPanel) errorPanel.hidden = true;
    const bytes = new TextEncoder().encode(text).length;
    if (charCountInfo) charCountInfo.textContent = formatBytes(bytes);

    if (!text.trim()) {
      if (jsonStatusChip) {
        jsonStatusChip.className = 'status-chip';
        jsonStatusChip.textContent = 'Empty';
        jsonStatusChip.title = '';
        currentParsedData = null;
      }
      if (nodeCountInfo) nodeCountInfo.textContent = '0 nodes';
      mainEditorHighlighter?.update();
      return;
    }

    const check = parseCurrentJson();
    if (check.ok) {
      if (jsonStatusChip) {
        jsonStatusChip.className = 'status-chip valid';
        jsonStatusChip.textContent = '✓ Valid JSON';
        jsonStatusChip.title = '';
      }
      if (nodeCountInfo && window.JsonUtils) {
        const stats = window.JsonUtils.computeStats(check.data);
        nodeCountInfo.textContent = `${stats.totalNodes.toLocaleString()} nodes, ${stats.totalKeys.toLocaleString()} keys`;
      }
    } else {
      if (jsonStatusChip) {
        jsonStatusChip.className = 'status-chip error';
        jsonStatusChip.textContent = '✗ Invalid JSON';
        jsonStatusChip.title = check.error;
        if (errorPanel) errorPanel.hidden = false;
        document.getElementById('editorErrorText').textContent = check.error + ' — Go to the error or choose Repair to review suggested fixes.';
      }
    }

    mainEditorHighlighter?.update();

    // Persist to storage
    debouncedPersistMainJson();
  }

  const debouncedPersistMainJson = debounce(() => {
    if (chrome?.storage?.local && mainJsonInput) {
      chrome.storage.local.set({ [STORAGE_KEYS.mainJson]: mainJsonInput.value });
    }
  }, 400);

  mainJsonInput.addEventListener('input', () => {
    invalidateDerivedResults(mainJsonInput.value);
    editHistory.record(mainJsonInput.value);
    updateUndoButtonState();
    debouncedPersistMainJson();
    scheduleDiagnostics();
  });
  const scheduleDiagnostics = debounce(updateEditorDiagnostics, 100);
  function jumpToError() {
    const check = parseCurrentJson();
    const position = check.error?.match(/position (\d+)/i);
    const location = check.error?.match(/line (\d+) column (\d+)/i);
    let offset = position ? Number(position[1]) : 0;
    if (!position && location) {
      const lines = mainJsonInput.value.split('\n');
      offset = lines.slice(0, Number(location[1]) - 1).reduce((sum, line) => sum + line.length + 1, 0) + Number(location[2]) - 1;
    }
    mainJsonInput.focus();
    mainJsonInput.setSelectionRange(offset, Math.min(mainJsonInput.value.length, offset + 1));
  }
  document.getElementById('jumpToErrorBtn')?.addEventListener('click', jumpToError);

  // Click error chip to trigger smart repair
  if (jsonStatusChip) {
    jsonStatusChip.addEventListener('click', () => {
      if (jsonStatusChip.classList.contains('error')) {
        jumpToError();
      }
    });
  }

  // Smart Repair
  function handleSmartRepair() {
    const raw = (mainJsonInput?.value || '').trim();
    if (!raw) {
      showNotification('No JSON data in editor to repair', 'warning');
      return;
    }

    if (!window.JsonRepair) {
      showNotification('Repair engine not loaded', 'error');
      return;
    }

    const res = window.JsonRepair.repair(raw);
    if (res.success) {
      if (res.repaired === raw) return showNotification('JSON is already valid. Use Format to change indentation.', 'info');
      pendingRepairSource = mainJsonInput.value;
      document.getElementById('repairOriginal').value = pendingRepairSource;
      document.getElementById('repairProposed').value = res.repaired;
      document.getElementById('repairNotes').textContent = res.notes.join(' · ') || 'Review these changes before applying.';
      document.getElementById('repairPreviewDialog').showModal();
    } else {
      showNotification(`Could not automatically repair: ${res.error}`, 'error');
    }
  }
  document.getElementById('applyRepairBtn')?.addEventListener('click', () => {
    if (mainJsonInput.value !== pendingRepairSource) return showNotification('The document changed. Close this preview and repair again.', 'warning');
    pushUndoState();
    mainJsonInput.value = document.getElementById('repairProposed').value;
    updateEditorDiagnostics();
    document.getElementById('repairPreviewDialog').close();
  });
  document.getElementById('cancelRepairBtn')?.addEventListener('click', () => document.getElementById('repairPreviewDialog').close());

  if (repairJsonBtn) repairJsonBtn.addEventListener('click', handleSmartRepair);

  // Undo button & Ctrl+Z shortcut
  if (undoEditorBtn) {
    undoEditorBtn.addEventListener('click', undoLastChange);
  }

  document.getElementById('redoEditorBtn')?.addEventListener('click', redoLastChange);
  mainJsonInput.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? redoLastChange() : undoLastChange();
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redoLastChange();
    }
  });
  function selectedIndent() {
    const value = document.getElementById('indentSelect').value;
    return value === 'tab' ? '\t' : Number(value);
  }
  document.getElementById('fontSizeSelect')?.addEventListener('change', event => {
    document.documentElement.style.setProperty('--editor-font-size', `${event.target.value}px`);
    chrome.storage.sync.set({ editorFontSize: Number(event.target.value) });
  });
  document.getElementById('openFileBtn')?.addEventListener('click', () => editorFileInput.click());
  document.getElementById('welcomeFileBtn')?.addEventListener('click', () => editorFileInput.click());
  document.getElementById('welcomeUrlBtn')?.addEventListener('click', () => fetchUrlBtn.click());
  document.getElementById('welcomeSampleBtn')?.addEventListener('click', () => {
    pushUndoState();
    mainJsonInput.value = JSON.stringify({ users: [{ id: 1, name: 'Alex', active: true }, { id: 2, name: 'Sam', active: false }] }, null, selectedIndent());
    updateEditorDiagnostics();
    mainJsonInput.focus();
  });
  document.getElementById('openFullTabBtn')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.mainJson]: mainJsonInput.value, [STORAGE_KEYS.compareA]: compareInputA.value, [STORAGE_KEYS.compareB]: compareInputB.value });
    await chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });
  document.querySelectorAll('textarea, input[type="text"]').forEach(field => { if (!field.hasAttribute('aria-label')) field.setAttribute('aria-label', field.placeholder || field.id); });
  document.querySelectorAll('button[title]').forEach(button => {
    if (!button.textContent.trim() && !button.hasAttribute('aria-label')) button.setAttribute('aria-label', button.title);
  });
  document.querySelectorAll('.tools-menu button').forEach(button => button.addEventListener('click', () => button.closest('details').removeAttribute('open')));

  // Formatting buttons
  if (format2Btn) {
    format2Btn.addEventListener('click', () => {
      formatEditorJson(selectedIndent());
    });
  }

  if (format4Btn) {
    format4Btn.addEventListener('click', () => {
      formatEditorJson(4);
    });
  }

  if (minifyBtn) {
    minifyBtn.addEventListener('click', () => {
      const parsed = parseCurrentJson();
      if (!parsed.ok) {
        showNotification('Invalid JSON: ' + parsed.error, 'error');
        return;
      }
      pushUndoState();
      mainJsonInput.value = window.JsonDocument.format(parsed.raw, 0);
      updateEditorDiagnostics();
      showNotification('JSON minified', 'success');
    });
  }

  function formatEditorJson(indentSize = 2) {
    const parsed = parseCurrentJson();
    if (!parsed.ok) {
      showNotification('Invalid JSON: ' + parsed.error, 'error');
      return;
    }
    pushUndoState();
    mainJsonInput.value = window.JsonDocument.format(parsed.raw, indentSize);
    updateEditorDiagnostics();
    showNotification(`JSON formatted (${indentSize} spaces)`, 'success');
  }

  // Sort Keys
  if (sortKeysBtn) {
    sortKeysBtn.addEventListener('click', () => {
      const parsed = parseCurrentJson();
      if (!parsed.ok) {
        showNotification('Invalid JSON', 'error');
        return;
      }

      function deepSort(val) {
        if (window.JsonDocument.isExactNumber(val)) return val;
        if (Array.isArray(val)) return val.map(deepSort);
        if (val !== null && typeof val === 'object') {
          const sorted = Object.create(null);
          Object.keys(val).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(k => {
            sorted[k] = deepSort(val[k]);
          });
          return sorted;
        }
        return val;
      }

      pushUndoState();
      const sortedData = deepSort(parsed.data);
      mainJsonInput.value = JSON.stringify(sortedData, null, 2);
      updateEditorDiagnostics();
      showNotification('Object keys sorted A–Z (Click Undo to revert)', 'success');
    });
  }

  // Escape / Unescape String
  if (escapeStringBtn) {
    escapeStringBtn.addEventListener('click', () => {
      const raw = mainJsonInput.value;
      const trimmed = raw.trim();
      if (!trimmed) return;

      pushUndoState();

      // Check if current text is an escaped JSON string literal
      let isStringLiteral = false;
      if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
        try {
          const parsed = window.JsonDocument.parse(trimmed);
          if (typeof parsed === 'string') {
            isStringLiteral = true;
          }
        } catch {}
      }

      if (isStringLiteral) {
        const unescaped = window.JsonUtils ? window.JsonUtils.unescapeJsonString(trimmed) : window.JsonDocument.parse(trimmed);
        try {
          const parsedJson = window.JsonDocument.parse(unescaped);
          mainJsonInput.value = JSON.stringify(parsedJson, null, 2);
        } catch {
          mainJsonInput.value = unescaped;
        }
        showNotification('Unescaped string literal back to JSON', 'info');
      } else {
        mainJsonInput.value = JSON.stringify(trimmed);
        showNotification('Escaped JSON to string literal', 'info');
      }
      updateEditorDiagnostics();
    });
  }

  // Copy & Clear
  if (copyEditorBtn) {
    copyEditorBtn.addEventListener('click', () => {
      if (!mainJsonInput.value) return showNotification('Editor is empty', 'warning');
      navigator.clipboard.writeText(mainJsonInput.value)
        .then(() => { copyEditorBtn.textContent = 'Copied!'; setTimeout(() => { copyEditorBtn.textContent = 'Copy'; }, 1200); })
        .catch(() => showNotification('Failed to copy', 'error'));
    });
  }

  if (clearEditorBtn) {
    clearEditorBtn.addEventListener('click', () => {
      if (!mainJsonInput.value) return;
      pushUndoState();
      mainJsonInput.value = '';
      updateEditorDiagnostics();
      showNotification('Editor cleared (Click Undo to restore)', 'info');
    });
  }

  // File Upload
  if (editorFileInput) {
    editorFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        pushUndoState();
        try {
          const parsed = window.JsonDocument.parse(text);
          mainJsonInput.value = window.JsonDocument.format(text, selectedIndent());
          showNotification('File loaded & formatted', 'success');
        } catch {
          mainJsonInput.value = text;
          showNotification('File loaded (Raw)', 'warning');
        }
        updateEditorDiagnostics();
        editorFileInput.value = '';
      };
      reader.onerror = () => showNotification('Could not read the file. Your document has been kept.', 'error');
      reader.readAsText(file);
    });
  }

  // Fetch URL Modal
  if (fetchUrlBtn) {
    fetchUrlBtn.addEventListener('click', async () => {
      const url = await showUrlInputModal();
      if (!url) return;

      const originalText = mainJsonInput.value;
      try {
        fetchUrlBtn.disabled = true;
        showNotification('Fetching JSON…', 'info');
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        const text = await res.text();
        if (mainJsonInput.value !== originalText) return showNotification('Import canceled because the document changed while loading.', 'warning');
        pushUndoState();
        try {
          const parsed = window.JsonDocument.parse(text);
          mainJsonInput.value = window.JsonDocument.format(text, selectedIndent());
          showNotification('JSON successfully fetched from URL', 'success');
        } catch {
          mainJsonInput.value = text;
          showNotification('Data fetched (Raw text)', 'warning');
        }
        updateEditorDiagnostics();
      } catch (err) {
        showNotification('Fetch failed: ' + err.message, 'error');
      } finally {
        fetchUrlBtn.disabled = false;
      }
    });
  }

  function showUrlInputModal() {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'repair-dialog save-query-dialog';
      dialog.setAttribute('aria-labelledby', 'urlImportTitle');
      dialog.innerHTML = `<form method="dialog"><h2 id="urlImportTitle">Import JSON from URL</h2><p>This sends a request to the URL you enter.</p><label>JSON URL<input type="url" aria-label="JSON URL" required placeholder="https://api.example.com/data.json"></label><div class="welcome-actions"><button value="fetch" class="btn btn-primary">Import</button><button value="cancel" formnovalidate class="btn btn-secondary">Cancel</button></div></form>`;
      document.body.appendChild(dialog);
      const input = dialog.querySelector('input');
      dialog.addEventListener('close', () => { const url = dialog.returnValue === 'fetch' ? input.value.trim() : null; dialog.remove(); resolve(url); }, { once: true });
      dialog.showModal();
      input.focus();
    });
  }

  // ─── 7. Query Tab Logic (JMESPath & JSONPath) ───────────────────────────────

  function setQueryEngine(engine) {
    currentQueryResult = undefined;
    queryResultEl.textContent = '';
    activeQueryEngine = engine === 'jsonpath' ? 'jsonpath' : 'jmespath';
    engineJmesBtn.classList.toggle('active', activeQueryEngine === 'jmespath');
    engineJsonPathBtn.classList.toggle('active', activeQueryEngine === 'jsonpath');
    engineJmesBtn.setAttribute('aria-pressed', String(activeQueryEngine === 'jmespath'));
    engineJsonPathBtn.setAttribute('aria-pressed', String(activeQueryEngine === 'jsonpath'));
    jmesPathInput.placeholder = activeQueryEngine === 'jsonpath' ? 'JSONPath: $.users[*].name' : 'JMESPath: users[].name';
    queryWorkspace.refreshPath();
  }
  engineJmesBtn?.addEventListener('click', () => setQueryEngine('jmespath'));
  engineJsonPathBtn?.addEventListener('click', () => setQueryEngine('jsonpath'));
  setQueryEngine(activeQueryEngine);

  if (executeQueryBtn) {
    executeQueryBtn.addEventListener('click', runQuery);
  }

  jmesPathInput?.addEventListener('input', () => { currentQueryResult = undefined; queryResultEl.textContent = ''; });
  jmesPathInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      runQuery();
    }
  });

  function runQuery() {
    currentQueryResult = undefined;
    queryResultEl.textContent = '';
    const rawJson = (mainJsonInput?.value || '').trim();
    const query = (jmesPathInput?.value || '').trim();

    if (!rawJson) return showNotification('Please enter JSON data in Editor first', 'warning');
    if (!query) return showNotification('Please enter a query expression', 'warning');

    queryWorkspace.sync();
    const parsed = parseCurrentJson();
    if (!parsed.ok) return showNotification('Invalid JSON in Editor: ' + parsed.error, 'error');

    try {
      let result;
      if (window.JsonDocument.containsExactNumber(parsed.data)) throw new Error('This document contains numbers beyond JavaScript precision. Querying is unavailable; formatting, viewing, exporting and comparison preserve the exact values.');
      if (activeQueryEngine === 'jmespath') {
        if (!window.jmespath) throw new Error('JMESPath library not loaded');
        result = window.jmespath.search(parsed.data, query);
      } else {
        if (!window.JsonPath) throw new Error('JSONPath library not loaded');
        result = window.JsonPath.search(parsed.data, query);
      }

      currentQueryResult = result;

      // Render Result
      queryResultEl.textContent = JSON.stringify(result, null, 2);
      if (window.Prism) {
        Prism.highlightElement(queryResultEl);
      }

      addToQueryHistory(query);
      showNotification('Query executed successfully', 'success');
    } catch (err) {
      showNotification(`Query Error: ${err.message}`, 'error');
    }
  }

  function addToQueryHistory(query) {
    if (!chrome?.storage?.local || !query) return;
    const entry = { expression: query, engine: activeQueryEngine };
    chrome.storage.local.get([STORAGE_KEYS.queryHistory], (res) => {
      let history = res[STORAGE_KEYS.queryHistory] || [];
      history = [entry, ...history.map(window.JsonDocument.normalizeQuery).filter(item => item.expression !== entry.expression || item.engine !== entry.engine)].slice(0, 15);
      chrome.storage.local.set({ [STORAGE_KEYS.queryHistory]: history });
    });
  }

  document.getElementById('useResultBtn')?.addEventListener('click', () => {
    if (currentQueryResult === undefined) return showNotification('Run a query first.', 'warning');
    const text = JSON.stringify(currentQueryResult, null, selectedIndent());
    pushUndoState();
    mainJsonInput.value = text;
    updateEditorDiagnostics();
    document.querySelector('[data-tab="editor"]').click();
    mainJsonInput.focus();
  });

  // Copy & Export Result
  if (copyResultBtn) {
    copyResultBtn.addEventListener('click', () => {
      if (currentQueryResult === undefined) {
        return showNotification('No query result to copy', 'warning');
      }
      navigator.clipboard.writeText(JSON.stringify(currentQueryResult, null, 2))
        .then(() => showNotification('Result copied to clipboard', 'success'))
        .catch(() => showNotification('Failed to copy', 'error'));
    });
  }

  if (exportResultBtn) {
    exportResultBtn.addEventListener('click', () => {
      if (currentQueryResult === undefined) return showNotification('No result to export', 'warning');
      downloadString(JSON.stringify(currentQueryResult, null, 2), 'query_result.json', 'application/json');
      showNotification('Result exported', 'success');
    });
  }

  // Saved Queries
  if (saveQueryBtn) {
    saveQueryBtn.addEventListener('click', async () => {
      const q = jmesPathInput?.value.trim();
      const queryEngine = activeQueryEngine;
      if (!q) return showNotification('Enter a query to save', 'warning');

      const name = await askQueryName(q);
      if (!name) return;

      chrome.storage.sync.get([STORAGE_KEYS.savedQueries], (res) => {
        const queries = res[STORAGE_KEYS.savedQueries] || {};
        Object.defineProperty(queries, name, { value: { expression: q, engine: queryEngine }, enumerable: true, configurable: true, writable: true });
        chrome.storage.sync.set({ [STORAGE_KEYS.savedQueries]: queries }, () => {
          loadSavedQueries();
          showNotification(`Saved query "${name}"`, 'success');
        });
      });
    });
  }

  async function askQueryName(expression) {
    const dialog = document.createElement('dialog');
    dialog.className = 'repair-dialog save-query-dialog';
    dialog.setAttribute('aria-labelledby', 'saveQueryTitle');
    dialog.innerHTML = `<form method="dialog"><h2 id="saveQueryTitle">Save query</h2><label>Query name<input name="queryName" aria-label="Query name" required maxlength="100"></label><div class="welcome-actions"><button value="save" class="btn btn-primary">Save</button><button value="cancel" formnovalidate class="btn btn-secondary">Cancel</button></div></form>`;
    document.body.appendChild(dialog);
    const input = dialog.querySelector('input');
    input.value = expression.slice(0, 100);
    const result = new Promise(resolve => dialog.addEventListener('close', () => { const name = dialog.returnValue === 'save' ? input.value.trim() : null; dialog.remove(); resolve(name); }, { once: true }));
    dialog.showModal();
    input.select();
    return result;
  }

  function loadSavedQueries() {
    if (!chrome?.storage?.sync || !savedQueriesList) return;
    chrome.storage.sync.get([STORAGE_KEYS.savedQueries], (res) => {
      const queries = res[STORAGE_KEYS.savedQueries] || {};
      savedQueriesList.innerHTML = '';

      const keys = Object.keys(queries);
      if (!keys.length) return;

      const header = document.createElement('div');
      header.style.cssText = 'font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin: 6px 0 4px;';
      header.textContent = 'Saved Queries:';
      savedQueriesList.appendChild(header);

      keys.forEach(name => {
        const query = window.JsonDocument.normalizeQuery(queries[name]);
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-xs); margin-bottom: 4px; font-size: 11px;';
        item.innerHTML = `
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
            <strong style="color: var(--text-primary);">${escapeHtml(name)}</strong> <small>${query.engine === 'jsonpath' ? 'JSONPath' : 'JMESPath'}</small>:
            <code style="color: var(--accent);">${escapeHtml(query.expression)}</code>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-secondary use-saved-query" data-query="${escapeHtml(query.expression)}" data-engine="${query.engine}" style="padding: 2px 6px; font-size: 10px;">Use</button>
            <button class="btn btn-secondary delete-saved-query" data-name="${escapeHtml(name)}" style="padding: 2px 6px; font-size: 10px; color: var(--error);">✕</button>
          </div>
        `;
        savedQueriesList.appendChild(item);
      });
    });
  }

  savedQueriesList?.addEventListener('click', (e) => {
    const useBtn = e.target.closest('.use-saved-query');
    if (useBtn) {
      setQueryEngine(useBtn.getAttribute('data-engine'));
      jmesPathInput.value = useBtn.getAttribute('data-query');
      runQuery();
      return;
    }

    const delBtn = e.target.closest('.delete-saved-query');
    if (delBtn) {
      const name = delBtn.getAttribute('data-name');
      chrome.storage.sync.get([STORAGE_KEYS.savedQueries], (res) => {
        const queries = res[STORAGE_KEYS.savedQueries] || {};
        delete queries[name];
        chrome.storage.sync.set({ [STORAGE_KEYS.savedQueries]: queries }, loadSavedQueries);
      });
    }
  });

  // History & Examples modals
  historyBtn?.addEventListener('click', () => {
    chrome.storage.local.get([STORAGE_KEYS.queryHistory], (res) => {
      const history = (res[STORAGE_KEYS.queryHistory] || []).map(window.JsonDocument.normalizeQuery);
      const popup = document.createElement('div');
      popup.className = 'format-popup';
      popup.innerHTML = `
        <div class="format-popup-content" style="width: 380px; max-height: 80vh;">
          <h3 style="font-size: 14px; font-weight: 600;">Recent Queries</h3>
          <div style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto;">
            ${history.length ? history.map(q => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: var(--bg-muted); border-radius: var(--radius-xs);">
                <code style="font-family: var(--font-mono); font-size: 11px; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${q.engine === 'jsonpath' ? 'JSONPath' : 'JMESPath'}: ${escapeHtml(q.expression)}</code>
                <button class="btn btn-primary use-history-item" data-query="${escapeHtml(q.expression)}" data-engine="${q.engine}" style="padding: 2px 8px; font-size: 10px;">Use</button>
              </div>
            `).join('') : '<p style="color: var(--text-muted); text-align: center; font-size: 12px;">No query history yet</p>'}
          </div>
          <button id="closeHistoryBtn" class="btn btn-secondary">Close</button>
        </div>
      `;
      document.body.appendChild(popup);

      popup.querySelectorAll('.use-history-item').forEach(b => {
        b.addEventListener('click', function () {
          setQueryEngine(this.getAttribute('data-engine'));
          jmesPathInput.value = this.getAttribute('data-query');
          popup.remove();
          runQuery();
        });
      });

      popup.querySelector('#closeHistoryBtn').addEventListener('click', () => popup.remove());
      popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
    });
  });

  // Sample dataset for testing queries
  const SAMPLE_QUERY_DATASET = {
    store: {
      book: [
        { category: "reference", author: "Nigel Rees", title: "Sayings of the Century", price: 8.95 },
        { category: "fiction", author: "Evelyn Waugh", title: "Sword of Honour", price: 12.99 },
        { category: "fiction", author: "Herman Melville", title: "Moby Dick", isbn: "0-553-21311-3", price: 8.99 },
        { category: "fiction", author: "J. R. R. Tolkien", title: "The Lord of the Rings", isbn: "0-395-19395-8", price: 22.99 }
      ],
      bicycle: { color: "red", price: 19.95 }
    },
    users: [
      { id: 1, name: "Alice Smith", role: "admin", age: 29, active: true, email: "alice@example.com" },
      { id: 2, name: "Bob Jones", role: "editor", age: 34, active: false, email: "bob@example.com" },
      { id: 3, name: "Charlie Brown", role: "viewer", age: 22, active: true, email: "charlie@example.com" },
      { id: 4, name: "Diana Prince", role: "admin", age: 31, active: true, email: "diana@example.com" }
    ],
    locations: [
      { city: "Seattle", state: "WA", population: 733919 },
      { city: "Olympia", state: "WA", population: 52882 },
      { city: "Portland", state: "OR", population: 641162 },
      { city: "San Francisco", state: "CA", population: 815201 }
    ],
    tags: ["developer", "javascript", "json", "workbench", "extension"]
  };

  const JMESPATH_EXAMPLES = [
    { tag: 'Projection', q: 'users[].name', d: 'Extract all user names into a flat array' },
    { tag: 'Filter', q: 'locations[?state == `WA`].city', d: 'Filter locations where state is WA' },
    { tag: 'Sort', q: 'sort_by(users, &age)', d: 'Sort array of objects ascending by numeric property' },
    { tag: 'Sort Desc', q: 'reverse(sort_by(store.book, &price))', d: 'Sort books descending by price' },
    { tag: 'Min / Max', q: 'max_by(store.book, &price)', d: 'Find object with the maximum property value' },
    { tag: 'Min / Max', q: 'min_by(store.book, &price)', d: 'Find object with the minimum property value' },
    { tag: 'Transform', q: 'users[*].{FullName: name, Role: role}', d: 'Construct a new custom object projection' },
    { tag: 'Slice', q: 'store.book[0:2]', d: 'Slice first 2 elements from the array' },
    { tag: 'Slice End', q: 'store.book[-2:]', d: 'Slice last 2 elements from the array' },
    { tag: 'Keys', q: 'keys(@)', d: 'List all top-level keys of current JSON document' },
    { tag: 'Length', q: 'length(users)', d: 'Get total count of elements or keys' },
    { tag: 'String Join', q: 'join(`, `, tags)', d: 'Join an array of strings with a comma separator' },
    { tag: 'Logical AND', q: 'users[?age > `25` && active == `true`].name', d: 'Filter with multiple combined conditions' }
  ];

  const JSONPATH_EXAMPLES = [
    { tag: 'Array Wildcard', q: '$.users[*].name', d: 'Get all user names using root array wildcard' },
    { tag: 'Deep Scan', q: '$..author', d: 'Deep scan (..) to find all authors anywhere in the document' },
    { tag: 'Deep Books', q: '$..book[*]', d: 'Recursively locate all book entries anywhere in the tree' },
    { tag: 'Filter Less Than', q: '$.store.book[?(@.price < 10)]', d: 'Filter books where price is less than $10' },
    { tag: 'Filter Exists', q: '$.store.book[?(@.isbn)]', d: 'Filter items that possess an "isbn" attribute' },
    { tag: 'Multiple Indices', q: '$.store.book[0,1]', d: 'Select first and second items by comma-separated indices' },
    { tag: 'Slice First Two', q: '$.store.book[:2]', d: 'Slice array from beginning up to index 2' },
    { tag: 'Last Item', q: '$.store.book[-1:]', d: 'Select the last item in the array' },
    { tag: 'Compound AND', q: '$.users[?(@.age >= 30 && @.active == true)]', d: 'Filter with compound boolean AND condition' },
    { tag: 'Compound OR', q: '$.users[?(@.role == "admin" || @.role == "editor")]', d: 'Filter with compound boolean OR condition' },
    { tag: 'All Store Values', q: '$.store.*', d: 'Select all values directly under the store object' },
    { tag: 'All Elements', q: '$..*', d: 'Recursively select all scalar and object elements' },
    { tag: 'Tag Index', q: '$.tags[0]', d: 'Retrieve the first element of tags array' }
  ];

  examplesBtn?.addEventListener('click', () => {
    let currentModalTab = activeQueryEngine === 'jsonpath' ? 'jsonpath' : 'jmespath';

    const popup = document.createElement('div');
    popup.className = 'format-popup';
    popup.innerHTML = `
      <div class="format-popup-content" style="width: 490px; max-height: 85vh; display: flex; flex-direction: column;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <h3 style="font-size: 14px; font-weight: 700; margin: 0;">Query Examples &amp; Cheat Sheet</h3>
          <button id="loadSampleDataBtn" class="btn btn-secondary sm" title="Load sample dataset into Editor tab and execute query">
            📋 Load Sample Data
          </button>
        </div>

        <div class="examples-nav" style="margin-bottom: 10px;">
          <button class="examples-tab-btn ${currentModalTab === 'jmespath' ? 'active' : ''}" data-target="jmespath">
            JMESPath (${JMESPATH_EXAMPLES.length})
          </button>
          <button class="examples-tab-btn ${currentModalTab === 'jsonpath' ? 'active' : ''}" data-target="jsonpath">
            JSONPath (${JSONPATH_EXAMPLES.length})
          </button>
        </div>

        <div id="examplesListContainer" style="display: flex; flex-direction: column; gap: 7px; overflow-y: auto; max-height: 52vh; padding-right: 4px;">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border-default);">
          <span style="font-size: 11px; color: var(--text-muted);">Click any example to insert and run it instantly.</span>
          <button id="closeExamplesBtn" class="btn btn-secondary sm">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    const listContainer = popup.querySelector('#examplesListContainer');

    function renderExampleItems(tab) {
      const list = tab === 'jsonpath' ? JSONPATH_EXAMPLES : JMESPATH_EXAMPLES;
      listContainer.innerHTML = list.map(ex => `
        <div class="example-box" data-query="${escapeHtml(ex.q)}" data-engine="${tab}" style="padding: 8px 10px; background: var(--bg-muted); border: 1px solid var(--border-default); border-radius: var(--radius-xs); cursor: pointer; transition: all 0.15s ease;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
            <code style="font-family: var(--font-mono); font-size: 11.5px; color: var(--accent); font-weight: 600;">${escapeHtml(ex.q)}</code>
            <span style="font-size: 9.5px; padding: 1px 6px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-full); color: var(--text-secondary); font-weight: 600; white-space: nowrap;">${escapeHtml(ex.tag)}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.35;">${escapeHtml(ex.d)}</div>
        </div>
      `).join('');

      listContainer.querySelectorAll('.example-box').forEach(box => {
        box.addEventListener('click', function () {
          const query = this.getAttribute('data-query');
          const engine = this.getAttribute('data-engine');
          if (engine === 'jsonpath') {
            engineJsonPathBtn?.click();
          } else {
            engineJmesBtn?.click();
          }
          jmesPathInput.value = query;
          popup.remove();
          runQuery();
        });
      });
    }

    renderExampleItems(currentModalTab);

    // Tab switching inside examples modal
    popup.querySelectorAll('.examples-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', function () {
        popup.querySelectorAll('.examples-tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentModalTab = this.getAttribute('data-target');
        renderExampleItems(currentModalTab);
      });
    });

    // Load sample dataset button
    popup.querySelector('#loadSampleDataBtn').addEventListener('click', () => {
      pushUndoState();
      mainJsonInput.value = JSON.stringify(SAMPLE_QUERY_DATASET, null, 2);
      updateEditorDiagnostics();
      const firstQuery = currentModalTab === 'jsonpath' ? '$.users[*].name' : 'users[].name';
      if (currentModalTab === 'jsonpath') {
        engineJsonPathBtn?.click();
      } else {
        engineJmesBtn?.click();
      }
      jmesPathInput.value = firstQuery;
      popup.remove();
      runQuery();
      showNotification('Loaded sample dataset & executed query!', 'success');
    });

    popup.querySelector('#closeExamplesBtn').addEventListener('click', () => popup.remove());
    popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
  });

  // ─── Source JSON Quick-View Drawer ─────────────────────────────────────────

  function openSourceJsonDrawer() {
    if (!sourceJsonDrawer) return;
    const raw = (mainJsonInput?.value || '').trim();
    if (!raw) {
      if (drawerJsonCode) drawerJsonCode.textContent = '// Editor is empty. Paste or load JSON in the Editor tab first.';
      if (drawerJsonSize) drawerJsonSize.textContent = '0 B';
    } else {
      const bytes = new TextEncoder().encode(raw).length;
      if (drawerJsonSize) drawerJsonSize.textContent = formatBytes(bytes);
      try {
        const parsed = window.JsonDocument.parse(raw);
        if (drawerJsonCode) drawerJsonCode.textContent = window.JsonDocument.format(raw, 2);
      } catch {
        if (drawerJsonCode) drawerJsonCode.textContent = raw;
      }
    }

    if (window.Prism && drawerJsonCode) {
      window.Prism.highlightElement(drawerJsonCode);
    }
    sourceJsonDrawer.style.display = 'flex';
  }

  function closeSourceJsonDrawer() {
    if (sourceJsonDrawer) {
      sourceJsonDrawer.style.display = 'none';
    }
  }

  viewSourceJsonHeaderBtn?.addEventListener('click', openSourceJsonDrawer);
  peekSourceBtns.forEach(btn => btn.addEventListener('click', openSourceJsonDrawer));
  drawerCloseBtn?.addEventListener('click', closeSourceJsonDrawer);
  sourceJsonDrawer?.addEventListener('click', (e) => {
    if (e.target === sourceJsonDrawer) closeSourceJsonDrawer();
  });

  drawerCopyBtn?.addEventListener('click', () => {
    const text = drawerJsonCode?.textContent || '';
    if (!text || text.startsWith('// Editor is empty')) {
      showNotification('No JSON data to copy', 'warning');
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => showNotification('Original JSON copied to clipboard', 'success'))
      .catch(() => showNotification('Failed to copy', 'error'));
  });

  drawerGoEditorBtn?.addEventListener('click', () => {
    closeSourceJsonDrawer();
    const editorTabBtn = document.querySelector('.nav-bar .tab-button[data-tab="editor"]');
    if (editorTabBtn) editorTabBtn.click();
    mainJsonInput?.focus();
  });

  // Attach Intellisense
  if (window.JmesIntellisense && jmesPathSuggestions && jmesPathInput) {
    window.JmesIntellisense.attach({
      input: jmesPathInput,
      dropdown: jmesPathSuggestions,
      getJson: () => mainJsonInput?.value || '',
    });
  }

  // ─── 8. Tree & Table Visual Tab Logic ───────────────────────────────────────

  if (viewModeTreeBtn && viewModeTableBtn) {
    viewModeTreeBtn.addEventListener('click', () => {
      activeViewMode = 'tree';
      viewModeTreeBtn.classList.add('active');
      viewModeTableBtn.classList.remove('active');
      treeDisplay.style.display = '';
      tableDisplay.style.display = 'none';
      treeSpecificActions.style.display = 'flex';
      treeSearchToolbar.style.display = 'flex';
      renderVisualView();
    });

    viewModeTableBtn.addEventListener('click', () => {
      activeViewMode = 'table';
      viewModeTableBtn.classList.add('active');
      viewModeTreeBtn.classList.remove('active');
      treeDisplay.style.display = 'none';
      tableDisplay.style.display = '';
      treeSpecificActions.style.display = 'none';
      treeSearchToolbar.style.display = 'none';
      renderVisualView();
    });
  }

  function renderVisualView() {
    const parsed = parseCurrentJson();

    if (!parsed.ok) {
      if (treeView) treeView.render(undefined);
      if (tableView) tableView.render(null);
      return;
    }

    if (activeViewMode === 'tree') {
      if (treeView) {
        treeView.setSortKeysEnabled(sortKeysEnabled);
        treeView.render(parsed.data);
      }
    } else {
      if (tableView) {
        tableView.render(parsed.data);
      }
    }
  }

  // Tree depth expanders
  expandAllBtn?.addEventListener('click', () => treeView?.expandAll());
  collapseAllBtn?.addEventListener('click', () => treeView?.collapseAll());
  depth1Btn?.addEventListener('click', () => treeView?.expandToDepth(1));
  depth2Btn?.addEventListener('click', () => treeView?.expandToDepth(2));
  depth3Btn?.addEventListener('click', () => treeView?.expandToDepth(3));

  treeSortKeysToggle?.addEventListener('click', () => {
    sortKeysEnabled = !sortKeysEnabled;
    treeView?.setSortKeysEnabled(sortKeysEnabled);
    treeSortKeysToggle.classList.toggle('active', sortKeysEnabled);
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ [STORAGE_KEYS.sortKeys]: sortKeysEnabled });
    }
    renderVisualView();
  });

  // Tree Search
  treeSearchInput?.addEventListener('input', debounce(() => {
    const q = treeSearchInput.value;
    if (!treeView) return;
    if (q.trim()) {
      const res = treeView.search(q);
      if (treeSearchCount) {
        treeSearchCount.textContent = res.total ? `${res.total} matches` : '0 matches';
      }
    } else {
      treeView.clearSearch();
      if (treeSearchCount) treeSearchCount.textContent = '';
    }
  }, 150));

  treeSearchPrev?.addEventListener('click', () => treeView?.searchPrev());
  treeSearchNext?.addEventListener('click', () => treeView?.searchNext());
  treeSearchClear?.addEventListener('click', () => {
    if (treeSearchInput) treeSearchInput.value = '';
    treeView?.clearSearch();
    if (treeSearchCount) treeSearchCount.textContent = '';
  });

  dismissTreePerf?.addEventListener('click', () => {
    if (treePerfWarning) treePerfWarning.style.display = 'none';
  });

  // ─── 9. Convert Tab Logic ───────────────────────────────────────────────────

  conversionCards.forEach(card => {
    card.addEventListener('click', function () {
      conversionCards.forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      selectedLang = this.getAttribute('data-lang') || 'typescript';
      runCurrentConversion();
    });
  });

  function runCurrentConversion() {
    currentConversionCode = '';
    const parsed = parseCurrentJson();
    if (!parsed.ok) {
      convertedResultEl.textContent = '// Enter valid JSON in the Editor tab to convert';
      return;
    }

    try {
      if (window.JsonDocument.containsExactNumber(parsed.data)) throw new Error('Code generation cannot safely infer numbers beyond JavaScript precision. Original values have been preserved.');
      const code = converter.convert(parsed.data, selectedLang);
      currentConversionCode = code;

      // Map language extensions & prism styles
      const langConfig = {
        typescript: { ext: 'ts', mime: 'text/typescript', prism: 'typescript' },
        python:     { ext: 'py', mime: 'text/x-python', prism: 'python' },
        go:         { ext: 'go', mime: 'text/plain', prism: 'go' },
        rust:       { ext: 'rs', mime: 'text/plain', prism: 'rust' },
        swift:      { ext: 'swift', mime: 'text/plain', prism: 'swift' },
        dart:       { ext: 'dart', mime: 'text/plain', prism: 'dart' },
        csharp:     { ext: 'cs', mime: 'text/plain', prism: 'csharp' },
        cpp:        { ext: 'cpp', mime: 'text/plain', prism: 'cpp' },
        java:       { ext: 'java', mime: 'text/x-java-source', prism: 'java' },
        kotlin:     { ext: 'kt', mime: 'text/plain', prism: 'kotlin' },
        php:        { ext: 'php', mime: 'text/x-php', prism: 'php' },
        sql:        { ext: 'sql', mime: 'application/sql', prism: 'sql' },
        schema:     { ext: 'json', mime: 'application/json', prism: 'json' },
        csv:        { ext: 'csv', mime: 'text/csv', prism: 'text' },
        yaml:       { ext: 'yaml', mime: 'text/yaml', prism: 'yaml' },
        xml:        { ext: 'xml', mime: 'application/xml', prism: 'markup' },
      };

      const cfg = langConfig[selectedLang] || { ext: 'txt', mime: 'text/plain', prism: 'text' };
      currentConversionMeta = { filename: `converted.${cfg.ext}`, mime: cfg.mime };

      convertedResultEl.className = `language-${cfg.prism}`;
      convertedResultEl.textContent = code;
      if (window.Prism) {
        Prism.highlightElement(convertedResultEl);
      }
    } catch (err) {
      convertedResultEl.textContent = `// Conversion Error: ${err.message}`;
    }
  }

  copyConvertedBtn?.addEventListener('click', () => {
    if (!currentConversionCode) return showNotification('No converted code to copy', 'warning');
    navigator.clipboard.writeText(currentConversionCode)
      .then(() => showNotification('Code copied to clipboard', 'success'))
      .catch(() => showNotification('Failed to copy', 'error'));
  });

  exportConvertedBtn?.addEventListener('click', () => {
    if (!currentConversionCode) return showNotification('No code to export', 'warning');
    downloadString(currentConversionCode, currentConversionMeta.filename, currentConversionMeta.mime);
    showNotification(`Exported as ${currentConversionMeta.filename}`, 'success');
  });

  // ─── 10. Compare & Diff Tab Logic ───────────────────────────────────────────

  compareFormatABtn?.addEventListener('click', () => {
    formatCompareInput(compareInputA);
    compareHighlighterA?.update();
    debouncedPersistCompare();
  });
  compareMinifyABtn?.addEventListener('click', () => {
    minifyCompareInput(compareInputA);
    compareHighlighterA?.update();
    debouncedPersistCompare();
  });
  compareFormatBBtn?.addEventListener('click', () => {
    formatCompareInput(compareInputB);
    compareHighlighterB?.update();
    debouncedPersistCompare();
  });
  compareMinifyBBtn?.addEventListener('click', () => {
    minifyCompareInput(compareInputB);
    compareHighlighterB?.update();
    debouncedPersistCompare();
  });

  const debouncedPersistCompare = debounce(() => {
    if (chrome?.storage?.local) {
      chrome.storage.local.set({
        [STORAGE_KEYS.compareA]: compareInputA?.value || '',
        [STORAGE_KEYS.compareB]: compareInputB?.value || '',
      });
    }
  }, 400);

  compareInputA?.addEventListener('input', debouncedPersistCompare);
  compareInputB?.addEventListener('input', debouncedPersistCompare);

  function formatCompareInput(el) {
    try {
      const parsed = window.JsonDocument.parse(el.value);
      el.value = window.JsonDocument.format(el.value, 2);
    } catch {
      showNotification('Invalid JSON in input', 'error');
    }
  }

  function minifyCompareInput(el) {
    try {
      const parsed = window.JsonDocument.parse(el.value);
      el.value = window.JsonDocument.format(el.value, 0);
    } catch {
      showNotification('Invalid JSON in input', 'error');
    }
  }

  compareSwapBtn?.addEventListener('click', () => {
    const temp = compareInputA.value;
    compareInputA.value = compareInputB.value;
    compareInputB.value = temp;
    compareHighlighterA?.update();
    compareHighlighterB?.update();
    debouncedPersistCompare();
    showNotification('Swapped JSON A and JSON B', 'info');
  });

  diffViewTreeBtn?.addEventListener('click', () => setDiffView('tree'));
  diffViewSplitBtn?.addEventListener('click', () => setDiffView('split'));

  function setDiffView(mode) {
    activeDiffMode = mode;
    if (mode === 'tree') {
      diffViewTreeBtn.classList.add('active');
      diffViewSplitBtn.classList.remove('active');
      compareTreeDiffEl.style.display = '';
      compareSideBySideEl.style.display = 'none';
    } else {
      diffViewSplitBtn.classList.add('active');
      diffViewTreeBtn.classList.remove('active');
      compareTreeDiffEl.style.display = 'none';
      compareSideBySideEl.style.display = '';
      if (lastPrettyA && lastPrettyB && window.JsonDiff) {
        window.JsonDiff.renderSideBySide(compareSideBySideEl, lastPrettyA, lastPrettyB);
      }
    }
  }

  compareRunBtn?.addEventListener('click', () => {
    lastDiffNode = null;
    lastPrettyA = lastPrettyB = '';
    compareTreeDiffEl.textContent = '';
    compareSideBySideEl.textContent = '';
    diffSummaryEl.textContent = '';
    const rawA = compareInputA.value.trim();
    const rawB = compareInputB.value.trim();

    if (!rawA) return showNotification('JSON A is empty', 'warning');
    if (!rawB) return showNotification('JSON B is empty', 'warning');

    let parsedA, parsedB;
    try { parsedA = window.JsonDocument.parse(rawA); } catch { return showNotification('JSON A is invalid', 'error'); }
    try { parsedB = window.JsonDocument.parse(rawB); } catch { return showNotification('JSON B is invalid', 'error'); }

    if (!window.JsonDiff) return showNotification('Diff engine not available', 'error');

    const diffNode = window.JsonDiff.computeDiff(parsedA, parsedB, null, 0);
    const counts = window.JsonDiff.summarize(diffNode);
    lastDiffNode = diffNode;
    lastPrettyA = JSON.stringify(parsedA, null, 2);
    lastPrettyB = JSON.stringify(parsedB, null, 2);

    // Update summary badge
    if (counts.added === 0 && counts.removed === 0 && counts.changed === 0) {
      diffSummaryEl.textContent = 'Identical';
      diffSummaryEl.className = 'diff-summary diff-equal';
    } else {
      const parts = [];
      if (counts.added) parts.push(`+${counts.added}`);
      if (counts.removed) parts.push(`−${counts.removed}`);
      if (counts.changed) parts.push(`~${counts.changed}`);
      diffSummaryEl.textContent = parts.join('  ');
      diffSummaryEl.className = 'diff-summary';
    }

    window.JsonDiff.renderTreeDiff(compareTreeDiffEl, diffNode);
    setDiffView(activeDiffMode);
    showNotification('Comparison complete', 'success');
  });

  copyDiffBtn?.addEventListener('click', () => {
    if (!lastDiffNode) return showNotification('Run comparison first', 'warning');
    const counts = window.JsonDiff.summarize(lastDiffNode);
    const summary = `Diff: +${counts.added} added, -${counts.removed} removed, ~${counts.changed} changed\n`;
    navigator.clipboard.writeText(summary + lastPrettyB)
      .then(() => showNotification('Diff copied to clipboard', 'success'))
      .catch(() => showNotification('Failed to copy', 'error'));
  });

  // ─── 11. Utilities Tab Logic ────────────────────────────────────────────────

  utilTabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const util = this.getAttribute('data-util');
      utilTabBtns.forEach(b => b.classList.remove('active'));
      utilPanes.forEach(p => p.classList.remove('active'));

      this.classList.add('active');
      const pane = document.getElementById(`util-${util}`);
      if (pane) pane.classList.add('active');

      if (util === 'stats') {
        updateJsonStatistics();
      } else if (util === 'settings') {
        renderSettingsThemeGrid();
      }
    });
  });

  // JWT Decoder
  decodeJwtBtn?.addEventListener('click', () => {
    const token = jwtInput?.value.trim();
    if (!token) return showNotification('Please paste a JWT token', 'warning');

    if (!window.JsonUtils) return showNotification('Utility module missing', 'error');

    const res = window.JsonUtils.decodeJwt(token);
    if (!res.success) return showNotification(res.error, 'error');

    const output = {
      header: res.header,
      payload: res.payload,
      meta: res.meta,
    };

    jwtResultCode.textContent = JSON.stringify(output, null, 2);
    if (window.Prism) Prism.highlightElement(jwtResultCode);

    if (jwtStatusBadge) {
      jwtStatusBadge.style.display = 'inline-flex';
      if (res.meta.isExpired === true) {
        jwtStatusBadge.className = 'status-chip error';
        jwtStatusBadge.textContent = 'Expired · Signature not verified';
      } else if (res.meta.isExpired === false) {
        jwtStatusBadge.className = 'status-chip valid';
        jwtStatusBadge.textContent = 'Not expired · Signature not verified';
      } else {
        jwtStatusBadge.className = 'status-chip';
        jwtStatusBadge.textContent = res.meta.hasExpiry ? 'Invalid expiry · Signature not verified' : 'No expiry · Signature not verified';
      }
    }

    showNotification('JWT decoded', 'success');
  });

  // Base64 JSON
  b64EncodeBtn?.addEventListener('click', () => {
    const raw = mainJsonInput?.value.trim() || base64Textarea.value.trim();
    if (!raw) return showNotification('Enter data to encode', 'warning');

    const res = window.JsonUtils?.encodeBase64(raw);
    if (res?.success) {
      base64Textarea.value = res.result;
      showNotification('Encoded to Base64', 'success');
    }
  });

  b64DecodeBtn?.addEventListener('click', () => {
    const raw = base64Textarea.value.trim();
    if (!raw) return showNotification('Enter Base64 string to decode', 'warning');

    const res = window.JsonUtils?.decodeBase64(raw);
    if (res?.success) {
      base64Textarea.value = res.result;
      showNotification('Decoded from Base64', 'success');
    } else {
      showNotification(res.error, 'error');
    }
  });

  copyB64Btn?.addEventListener('click', () => {
    if (!base64Textarea.value) return showNotification('Nothing to copy', 'warning');
    navigator.clipboard.writeText(base64Textarea.value)
      .then(() => showNotification('Copied', 'success'));
  });

  // JSON Schema Validator & Generator
  generateSchemaBtn?.addEventListener('click', () => {
    const parsed = parseCurrentJson();
    if (!parsed.ok) return showNotification('Enter valid JSON in Editor first', 'warning');

    const schema = window.JsonUtils?.generateSchema(parsed.data);
    schemaInput.value = schema;
    showNotification('Schema generated from current JSON', 'success');
  });

  validateSchemaBtn?.addEventListener('click', () => {
    const parsed = parseCurrentJson();
    if (!parsed.ok) return showNotification('Enter valid JSON in Editor first', 'warning');

    const schemaText = schemaInput.value.trim();
    if (!schemaText) return showNotification('Enter or generate a JSON Schema', 'warning');

    let schemaObj;
    try {
      schemaObj = window.JsonDocument.parse(schemaText);
    } catch {
      return showNotification('Invalid JSON in schema input', 'error');
    }

    const validation = window.JsonUtils?.validateAgainstSchema(parsed.data, schemaObj);
    if (validation?.valid) {
      schemaValidationResult.style.display = 'block';
      schemaValidationResult.style.background = 'var(--success-bg)';
      schemaValidationResult.style.color = 'var(--success)';
      schemaValidationResult.textContent = '✓ Validation Passed: Data conforms to the schema.';
    } else {
      schemaValidationResult.style.display = 'block';
      schemaValidationResult.style.background = 'var(--error-bg)';
      schemaValidationResult.style.color = 'var(--error)';
      schemaValidationResult.innerHTML = `<strong>${validation.supported === false ? 'Unable to validate' : '✗ Validation failed'}:</strong><br>` + validation.errors.map(e => `• ${escapeHtml(e)}`).join('<br>');
    }
  });

  // Statistics
  function updateJsonStatistics() {
    const parsed = parseCurrentJson();
    if (!parsed.ok || !window.JsonUtils) return;

    const raw = mainJsonInput?.value || '';
    const stats = window.JsonUtils.computeStats(parsed.data, raw);

    if (statSize) statSize.textContent = formatBytes(stats.byteSize);
    if (statNodes) statNodes.textContent = stats.totalNodes.toLocaleString();
    if (statDepth) statDepth.textContent = String(stats.maxDepth);
    if (statKeys) statKeys.textContent = stats.totalKeys.toLocaleString();
    if (statArrays) statArrays.textContent = stats.types.array.toLocaleString();
    if (statStrings) statStrings.textContent = stats.types.string.toLocaleString();
  }

  // ─── 12. Helper Downloads ───────────────────────────────────────────────────

  function downloadString(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── 13. Auto-Detect JSON & Theme Toggles ────────────────────────────────────

  const REQUIRED_PERMS = {
    permissions: ['webRequest'],
    origins: ['http://*/*', 'https://*/*'],
  };

  async function updateAutoDetectUI() {
    if (!chrome?.permissions) return;
    chrome.permissions.contains(REQUIRED_PERMS, (hasPerms) => {
      chrome.storage.sync.get([STORAGE_KEYS.autoDetect], (res) => {
        const enabled = hasPerms && res[STORAGE_KEYS.autoDetect] !== false;
        autodetectBtn?.classList.toggle('autodetect-active', enabled);
        if (autodetectToggle) autodetectToggle.checked = enabled;
      });
    });
  }

  autodetectBtn?.addEventListener('click', async () => {
    if (!chrome?.permissions) return;

    chrome.permissions.contains(REQUIRED_PERMS, (hasPerms) => {
      if (!hasPerms) {
        chrome.permissions.request(REQUIRED_PERMS, (granted) => {
          if (granted) {
            chrome.storage.sync.set({ [STORAGE_KEYS.autoDetect]: true }, () => {
              updateAutoDetectUI();
              showNotification('Auto-detect enabled for JSON web pages', 'success');
            });
          } else {
            showNotification('Permission needed to auto-detect JSON pages', 'warning');
          }
        });
      } else {
        chrome.storage.sync.get([STORAGE_KEYS.autoDetect], (res) => {
          const next = !(res[STORAGE_KEYS.autoDetect] !== false);
          chrome.storage.sync.set({ [STORAGE_KEYS.autoDetect]: next }, () => {
            updateAutoDetectUI();
            showNotification(`Auto-detect ${next ? 'enabled' : 'disabled'}`, 'info');
          });
        });
      }
    });
  });

  themeToggleBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if (darkmodeToggle) {
      darkmodeToggle.checked = next === 'dark';
    }
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ [STORAGE_KEYS.theme]: next });
    }
  });

  // ─── 14. Keyboard Shortcuts ─────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + F => Format 2
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      formatEditorJson(selectedIndent());
      return;
    }

    // Ctrl/Cmd + Enter => Run query or format
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const activeTab = document.querySelector('.tab-content.active');
      if (activeTab?.id === 'query-tab') {
        e.preventDefault();
        runQuery();
      } else if (activeTab?.id === 'editor-tab') {
        e.preventDefault();
        formatEditorJson(selectedIndent());
      }
    }
  });

  // Restore everything on load
  restoreState();
});
