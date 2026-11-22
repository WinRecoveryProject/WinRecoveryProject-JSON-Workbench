(function () {
  'use strict';

  // Auto JSON Page Viewer
  // Strictly scoped inside Shadow DOM host to prevent affecting host pages.

  const MAX_PARSE_CHARS = 5_000_000; // Safety limit for huge responses
  const VIEWER_HOST_ID = 'json-studio-viewer-host';

  function loadViewerCssIntoShadow(shadowRoot, onReady) {
    const cssUrl = chrome.runtime.getURL('styles/pageViewer.css');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    let done = false;
    const finish = () => { if (!done) { done = true; onReady(); } };
    link.addEventListener('load', finish);
    link.addEventListener('error', finish);
    shadowRoot.appendChild(link);
    setTimeout(finish, 500);
  }

  function isJsonContentType(contentType) {
    if (!contentType) return false;
    const ct = contentType.toLowerCase();
    return ct === 'application/json' || ct.endsWith('+json') || ct === 'text/json';
  }

  function parseJson(text) {
    try {
      return { ok: true, data: window.JsonDocument.parse(text) };
    } catch (error) {
      return { ok: false, error: error.message || 'Not valid JSON' };
    }
  }

  function parseJsonOrJsonp(text) {
    const parsed = parseJson(text);
    if (!parsed.ok) return parsed;
    return { ok: true, data: parsed.data, isJsonp: false };
  }

  function parseJsonOrJsonpSafe(text) {
    return parseJsonOrJsonp(text);
  }

  function getPageRawText() {
    const body = document.body;
    if (!body) return '';

    if (body.children && body.children.length === 1) {
      const only = body.children[0];
      if (only && only.tagName && only.tagName.toLowerCase() === 'pre') {
        return only.textContent || '';
      }
    }

    return body.innerText || body.textContent || '';
  }

  function clearPage() {
    const html = document.documentElement;
    const body = document.body;
    if (!html || !body) return;

    const resetNode = (node) => {
      try {
        node.scrollLeft = 0;
        node.scrollTop = 0;
      } catch {}

      node.style.margin = '0';
      node.style.padding = '0';
      node.style.left = '0';
      node.style.top = '0';
      node.style.width = '100%';
      node.style.minWidth = '0';
      node.style.maxWidth = 'none';
      node.style.overflow = 'hidden';
      node.style.transform = 'none';
      node.style.perspective = 'none';
      node.style.textIndent = '0';
    };

    resetNode(html);
    resetNode(body);
    body.replaceChildren();
  }

  function resetViewerLayout(root, content) {
    try {
      document.documentElement.scrollLeft = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollLeft = 0;
      document.body.scrollTop = 0;
      if (content) {
        content.scrollLeft = 0;
        content.scrollTop = 0;
      }
      if (root) {
        root.scrollLeft = 0;
        root.scrollTop = 0;
        root.style.left = '0';
        root.style.right = '0';
        root.style.transform = 'none';
      }
    } catch {}
  }

  function setViewerTheme(root, mode) {
    if (!root) return;
    if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  function setViewerSyntaxTheme(root, syntaxTheme) {
    if (!root) return;
    const safeTheme = ['emerald', 'vscode', 'onedark', 'dracula', 'monokai', 'classic'].includes(syntaxTheme)
      ? syntaxTheme
      : 'emerald';
    root.setAttribute('data-json-theme', safeTheme);
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function getMetadataString(data, rawText) {
    const sizeStr = formatBytes(new Blob([rawText || '']).size);
    if (Array.isArray(data)) {
      return `${data.length.toLocaleString()} item${data.length === 1 ? '' : 's'} • ${sizeStr}`;
    }
    if (data !== null && typeof data === 'object') {
      const keys = Object.keys(data).length;
      return `${keys.toLocaleString()} key${keys === 1 ? '' : 's'} • ${sizeStr}`;
    }
    return sizeStr;
  }

  function segmentsToJsonPath(segments) {
    let path = '$';
    for (const seg of segments || []) {
      if (typeof seg === 'number') {
        path += `[${seg}]`;
      } else {
        const key = String(seg);
        if (/^[A-Za-z_$][\w$]*$/.test(key)) {
          path += `.${key}`;
        } else {
          path += `[${JSON.stringify(key)}]`;
        }
      }
    }
    return path;
  }

  function getValueAtPath(rootValue, segments) {
    let cur = rootValue;
    for (const seg of segments || []) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[seg];
    }
    return cur;
  }

  function renderViewer({ rawText, parsed, candidateReason }) {
    clearPage();

    const host = document.createElement('div');
    host.id = VIEWER_HOST_ID;
    host.dir = 'ltr';
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.left = '0';
    host.style.top = '0';
    host.style.right = '0';
    host.style.bottom = '0';
    host.style.zIndex = '2147483647';
    host.style.display = 'block';
    host.style.overflow = 'hidden';
    host.style.transform = 'none';
    host.style.perspective = 'none';

    const shadowRoot = host.attachShadow({ mode: 'open' });

    const root = document.createElement('div');
    root.id = 'json-studio-viewer';
    root.style.visibility = 'hidden';

    // Top Header Bar
    const header = document.createElement('div');
    header.id = 'json-studio-header';

    const titleBox = document.createElement('div');
    titleBox.id = 'json-studio-title';
    titleBox.innerHTML = `
      <div class="brand-row">
        <span class="brand-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </span>
        <span class="name">JSON Studio</span>
        <span class="meta-pill" data-meta-pill>JSON</span>
      </div>
    `;
    const metaPill = titleBox.querySelector('[data-meta-pill]');

    const toolbar = document.createElement('div');
    toolbar.className = 'json-studio-toolbar';

    // Segmented View Switcher: Tree, Table, Code, Raw
    const viewSeg = document.createElement('div');
    viewSeg.className = 'json-studio-segment';
    viewSeg.innerHTML = `
      <button type="button" class="json-studio-segbtn active" data-view="tree" title="Interactive Tree View">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="6" y1="3" x2="6" y2="21"></line>
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="18" cy="18" r="3"></circle>
          <path d="M6 9a9 9 0 0 1 9 9"></path>
        </svg>
        <span>Tree</span>
      </button>
      <button type="button" class="json-studio-segbtn" data-view="table" title="Spreadsheet Table View (Arrays)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="3" y1="15" x2="21" y2="15"></line>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="15" y1="3" x2="15" y2="21"></line>
        </svg>
        <span data-table-label>Table</span>
      </button>
      <button type="button" class="json-studio-segbtn" data-view="code" title="Syntax Highlighted Code & Editor">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        <span>Code</span>
      </button>
      <button type="button" class="json-studio-segbtn" data-view="raw" title="Raw Text View">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"></line>
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <line x1="4" y1="18" x2="14" y2="18"></line>
        </svg>
        <span>Raw</span>
      </button>
    `;

    const btnTree = viewSeg.querySelector('[data-view="tree"]');
    const btnTable = viewSeg.querySelector('[data-view="table"]');
    const btnCode = viewSeg.querySelector('[data-view="code"]');
    const btnRaw = viewSeg.querySelector('[data-view="raw"]');

    // Unified Compact Search Pill
    const searchPill = document.createElement('div');
    searchPill.className = 'json-studio-search-pill';
    searchPill.innerHTML = `
      <svg class="search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input type="text" class="json-studio-search-input" placeholder="Search keys/values…" autocomplete="off" spellcheck="false" />
      <span class="json-studio-search-badge" data-search-count></span>
      <button type="button" class="json-studio-search-action btn-prev" title="Previous match (Shift+Enter)">▲</button>
      <button type="button" class="json-studio-search-action btn-next" title="Next match (Enter)">▼</button>
      <button type="button" class="json-studio-search-action btn-clear" title="Clear search (Esc)">✕</button>
    `;

    const searchInput = searchPill.querySelector('.json-studio-search-input');
    const searchCount = searchPill.querySelector('[data-search-count]');
    const searchPrev = searchPill.querySelector('.btn-prev');
    const searchNext = searchPill.querySelector('.btn-next');
    const searchClear = searchPill.querySelector('.btn-clear');

    // Actions Group: Expand, Collapse, Sort A-Z, Minify, Copy, Download
    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'json-studio-actions-group';

    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'json-studio-icon-btn';
    expandBtn.title = 'Expand All Nodes';
    expandBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
    `;

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'json-studio-icon-btn';
    collapseBtn.title = 'Collapse All Nodes';
    collapseBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 14 10 14 10 20"></polyline>
        <polyline points="20 10 14 10 14 4"></polyline>
        <line x1="14" y1="10" x2="21" y2="3"></line>
        <line x1="10" y1="14" x2="3" y2="21"></line>
      </svg>
    `;

    const sortKeysBtn = document.createElement('button');
    sortKeysBtn.type = 'button';
    sortKeysBtn.className = 'json-studio-icon-btn';
    sortKeysBtn.title = 'Sort Object Keys A–Z (Tree View)';
    sortKeysBtn.innerHTML = `<span style="font-weight:700;font-size:11px;">A–Z</span>`;

    const minifyBtn = document.createElement('button');
    minifyBtn.type = 'button';
    minifyBtn.className = 'json-studio-icon-btn';
    minifyBtn.title = 'Minify JSON (Remove whitespace)';
    minifyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
      <span>Minify</span>
    `;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'json-studio-icon-btn';
    copyBtn.title = 'Copy formatted JSON to clipboard';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span data-copy-label>Copy</span>
    `;
    const copyLabel = copyBtn.querySelector('[data-copy-label]');

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'json-studio-icon-btn';
    downloadBtn.title = 'Download JSON File';
    downloadBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download</span>
    `;

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'json-studio-icon-btn primary';
    applyBtn.textContent = 'Apply';
    applyBtn.disabled = true;
    applyBtn.style.display = 'none';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'json-studio-icon-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.disabled = true;
    resetBtn.style.display = 'none';

    actionsGroup.appendChild(expandBtn);
    actionsGroup.appendChild(collapseBtn);
    actionsGroup.appendChild(sortKeysBtn);
    actionsGroup.appendChild(minifyBtn);
    actionsGroup.appendChild(copyBtn);
    actionsGroup.appendChild(downloadBtn);
    actionsGroup.appendChild(applyBtn);
    actionsGroup.appendChild(resetBtn);

    // Theme Mode Select
    const themeSelect = document.createElement('select');
    themeSelect.className = 'json-studio-select';
    themeSelect.title = 'Color Mode';
    themeSelect.innerHTML = `
      <option value="auto">Theme: Auto</option>
      <option value="light">Theme: Light</option>
      <option value="dark">Theme: Dark</option>
    `;

    // Syntax Theme Select
    const syntaxThemeSelect = document.createElement('select');
    syntaxThemeSelect.className = 'json-studio-select';
    syntaxThemeSelect.title = 'JSON Syntax Theme';
    syntaxThemeSelect.innerHTML = `
      <option value="emerald">Syntax: Emerald</option>
      <option value="vscode">Syntax: VS Code</option>
      <option value="onedark">Syntax: One Dark</option>
      <option value="dracula">Syntax: Dracula</option>
      <option value="monokai">Syntax: Monokai</option>
      <option value="classic">Syntax: Classic</option>
    `;

    toolbar.appendChild(viewSeg);
    toolbar.appendChild(searchPill);
    toolbar.appendChild(actionsGroup);
    toolbar.appendChild(syntaxThemeSelect);
    toolbar.appendChild(themeSelect);

    header.appendChild(titleBox);
    header.appendChild(toolbar);

    // Banner alert
    const banner = document.createElement('div');
    banner.id = 'json-studio-banner';
    banner.innerHTML = `<span>⚠</span><span data-banner-text></span>`;

    // Content Body & View Panes
    const body = document.createElement('div');
    body.id = 'json-studio-body';

    const content = document.createElement('div');
    content.id = 'json-studio-content';

    const treeHost = document.createElement('div');
    treeHost.className = 'tree-view';

    const tableHost = document.createElement('div');
    tableHost.id = 'json-studio-table-pane';
    tableHost.style.display = 'none';
    tableHost.style.height = '100%';

    const codePane = document.createElement('div');
    codePane.id = 'json-studio-code-pane';
    codePane.style.display = 'none';
    const codeEditor = document.createElement('textarea');
    codeEditor.id = 'json-studio-code-editor';
    codeEditor.spellcheck = false;
    codeEditor.setAttribute('aria-label', 'JSON Code Editor');
    const codePreviewWrap = document.createElement('div');
    codePreviewWrap.className = 'json-studio-preview-wrap';
    const codePreviewTitle = document.createElement('div');
    codePreviewTitle.className = 'json-studio-preview-title';
    codePreviewTitle.textContent = 'Preview';
    const codePre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.className = 'language-json';
    codePre.appendChild(codeEl);
    codePreviewWrap.appendChild(codePreviewTitle);
    codePreviewWrap.appendChild(codePre);
    codePane.appendChild(codeEditor);
    codePane.appendChild(codePreviewWrap);

    const rawPane = document.createElement('div');
    rawPane.id = 'json-studio-raw-pane';
    rawPane.style.display = 'none';
    const rawEditor = document.createElement('textarea');
    rawEditor.id = 'json-studio-raw-editor';
    rawEditor.spellcheck = false;
    rawEditor.setAttribute('aria-label', 'Raw Text Editor');
    rawPane.appendChild(rawEditor);

    content.appendChild(treeHost);
    content.appendChild(tableHost);
    content.appendChild(codePane);
    content.appendChild(rawPane);

    // Bottom Breadcrumb Navigator
    const breadcrumb = document.createElement('div');
    breadcrumb.id = 'json-studio-breadcrumb';
    breadcrumb.innerHTML = `
      <div class="breadcrumb-path-wrap" data-crumb-path>
        <span class="breadcrumb-root-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
        </span>
        <button type="button" class="breadcrumb-chip" data-crumb-idx="root">root</button>
      </div>
      <div class="breadcrumb-meta">
        <span class="breadcrumb-type-pill" data-crumb-type>JSON</span>
        <button type="button" class="breadcrumb-btn" data-action="copy-crumb-path" title="Copy JSON Path (e.g. $[0].bio)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span data-crumb-copy-label>Copy Path</span>
        </button>
        <button type="button" class="breadcrumb-btn" data-action="copy-crumb-value" title="Copy Value at this path">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span data-crumb-val-label>Copy Value</span>
        </button>
      </div>
    `;

    const crumbPathWrap = breadcrumb.querySelector('[data-crumb-path]');
    const crumbTypePill = breadcrumb.querySelector('[data-crumb-type]');
    const copyCrumbPathBtn = breadcrumb.querySelector('[data-action="copy-crumb-path"]');
    const copyCrumbValBtn = breadcrumb.querySelector('[data-action="copy-crumb-value"]');
    const copyCrumbPathLabel = breadcrumb.querySelector('[data-crumb-copy-label]');
    const copyCrumbValLabel = breadcrumb.querySelector('[data-crumb-val-label]');

    body.appendChild(content);
    body.appendChild(breadcrumb);

    const customCssTag = document.createElement('style');
    customCssTag.id = 'json-studio-custom-css';

    document.body.appendChild(host);
    shadowRoot.appendChild(root);
    root.appendChild(customCssTag);
    root.appendChild(header);
    root.appendChild(banner);
    root.appendChild(body);

    // Instances
    const treeView = window.TreeView ? new window.TreeView({ container: treeHost }) : null;
    const tableView = window.TableView ? new window.TableView({ container: tableHost }) : null;

    let selectedPathSegments = [];

    const original = {
      rawText: rawText || '',
      parsedOk: !!parsed.ok,
      data: parsed.ok ? parsed.data : null,
      pretty: parsed.ok ? JSON.stringify(parsed.data, null, 2) : '',
      isJsonp: !!parsed.isJsonp,
    };

    let current = {
      rawText: original.rawText,
      parsedOk: original.parsedOk,
      data: original.data,
      pretty: original.pretty,
      isJsonp: original.isJsonp,
    };

    let currentView = 'tree';
    let dirty = false;
    let sortKeysEnabled = false;

    // View Switching
    function setActiveSegBtn(activeBtn) {
      [btnTree, btnTable, btnCode, btnRaw].forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    }

    function showTree() {
      currentView = 'tree';
      setActiveSegBtn(btnTree);
      treeHost.style.display = '';
      tableHost.style.display = 'none';
      codePane.style.display = 'none';
      rawPane.style.display = 'none';
      expandBtn.style.display = '';
      collapseBtn.style.display = '';
      sortKeysBtn.style.display = '';
      searchPill.style.display = '';
      breadcrumb.style.display = '';
      applyBtn.style.display = 'none';
      resetBtn.style.display = 'none';
    }

    function showTable() {
      currentView = 'table';
      setActiveSegBtn(btnTable);
      treeHost.style.display = 'none';
      tableHost.style.display = '';
      codePane.style.display = 'none';
      rawPane.style.display = 'none';
      expandBtn.style.display = 'none';
      collapseBtn.style.display = 'none';
      sortKeysBtn.style.display = 'none';
      searchPill.style.display = 'none'; // TableView has its own fast filter input
      breadcrumb.style.display = 'none';
      applyBtn.style.display = 'none';
      resetBtn.style.display = 'none';

      if (tableView && current.parsedOk) {
        tableView.render(current.data);
      }
    }

    function showCode() {
      currentView = 'code';
      setActiveSegBtn(btnCode);
      treeHost.style.display = 'none';
      tableHost.style.display = 'none';
      codePane.style.display = '';
      rawPane.style.display = 'none';
      expandBtn.style.display = 'none';
      collapseBtn.style.display = 'none';
      sortKeysBtn.style.display = 'none';
      searchPill.style.display = 'none';
      breadcrumb.style.display = 'none';
      applyBtn.style.display = '';
      resetBtn.style.display = '';
    }

    function showRaw() {
      currentView = 'raw';
      setActiveSegBtn(btnRaw);
      treeHost.style.display = 'none';
      tableHost.style.display = 'none';
      codePane.style.display = 'none';
      rawPane.style.display = '';
      expandBtn.style.display = 'none';
      collapseBtn.style.display = 'none';
      sortKeysBtn.style.display = 'none';
      searchPill.style.display = 'none';
      breadcrumb.style.display = 'none';
      applyBtn.style.display = '';
      resetBtn.style.display = '';
    }

    btnTree.addEventListener('click', showTree);
    btnTable.addEventListener('click', showTable);
    btnCode.addEventListener('click', showCode);
    btnRaw.addEventListener('click', showRaw);

    function setBanner(msg) {
      const t = banner.querySelector('[data-banner-text]');
      if (t) t.textContent = msg;
      banner.style.display = msg ? 'flex' : 'none';
    }

    function setDirty(isDirty) {
      dirty = isDirty;
      applyBtn.disabled = !dirty;
      resetBtn.disabled = !dirty;
    }

    function highlightPreview() {
      codeEl.textContent = codeEditor.value || '';
      try {
        if (window.Prism) window.Prism.highlightElement(codeEl);
      } catch {}
    }

    let previewTimer;
    function schedulePreview() {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(highlightPreview, 250);
    }

    function syncEditorsFromCurrent() {
      codeEditor.value = current.pretty || '';
      rawEditor.value = current.rawText || '';
      highlightPreview();
      setDirty(false);
    }

    function syncCurrentFromEditors() {
      current.pretty = codeEditor.value;
      current.rawText = rawEditor.value;
    }

    function updateMetadataPill() {
      if (current.parsedOk) {
        metaPill.textContent = getMetadataString(current.data, current.rawText);
      } else {
        metaPill.textContent = `Raw Text • ${formatBytes(new Blob([current.rawText || '']).size)}`;
      }
    }

    function renderFromParsedState() {
      updateMetadataPill();

      if (!current.parsedOk) {
        setBanner('Not valid JSON. Showing raw content.');
        if (treeView) treeView.renderRawText(current.rawText || '', 'Not valid JSON');
        updateOverlaySearchUI();
        updateBreadcrumb([]);
        return;
      }

      treeView?.setSortKeysEnabled?.(sortKeysEnabled);
      if (treeView) treeView.render(current.data);
      updateOverlaySearchUI();
      updateBreadcrumb([]);
      setBanner(current.isJsonp ? 'JSONP detected and parsed.' : '');

      // Check if dataset is an array of objects for TableView badge
      if (Array.isArray(current.data) && current.data.length > 0) {
        const tableLabel = viewSeg.querySelector('[data-table-label]');
        if (tableLabel) tableLabel.textContent = `Table (${current.data.length.toLocaleString()})`;
      }
    }

    // Breadcrumb Logic
    function updateBreadcrumb(segments) {
      selectedPathSegments = Array.isArray(segments) ? segments : [];
      crumbPathWrap.innerHTML = `
        <span class="breadcrumb-root-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
        </span>
        <button type="button" class="breadcrumb-chip" data-crumb-idx="-1">root</button>
      `;

      for (let i = 0; i < selectedPathSegments.length; i++) {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.textContent = '›';
        crumbPathWrap.appendChild(sep);

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'breadcrumb-chip';
        chip.dataset.crumbIdx = String(i);
        const seg = selectedPathSegments[i];
        chip.textContent = typeof seg === 'number' ? `[${seg}]` : String(seg);
        crumbPathWrap.appendChild(chip);
      }

      // Compute type and summary
      if (!current.parsedOk) {
        crumbTypePill.textContent = 'RAW';
        return;
      }

      const val = getValueAtPath(current.data, selectedPathSegments);
      if (val === null) {
        crumbTypePill.textContent = 'NULL';
      } else if (Array.isArray(val)) {
        crumbTypePill.textContent = `ARRAY (${val.length})`;
      } else if (typeof val === 'object') {
        crumbTypePill.textContent = `OBJECT (${Object.keys(val).length})`;
      } else if (typeof val === 'string') {
        crumbTypePill.textContent = `STRING (${val.length} chars)`;
      } else if (typeof val === 'number') {
        crumbTypePill.textContent = 'NUMBER';
      } else if (typeof val === 'boolean') {
        crumbTypePill.textContent = 'BOOLEAN';
      } else {
        crumbTypePill.textContent = typeof val;
      }
    }

    crumbPathWrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.breadcrumb-chip');
      if (!chip || !treeView) return;
      const idx = parseInt(chip.dataset.crumbIdx, 10);
      const subSegments = idx === -1 ? [] : selectedPathSegments.slice(0, idx + 1);
      treeView.revealPath?.(subSegments);
      updateBreadcrumb(subSegments);
    });

    copyCrumbPathBtn.addEventListener('click', async () => {
      const jsonPath = segmentsToJsonPath(selectedPathSegments);
      await copyToClipboard(jsonPath);
      copyCrumbPathLabel.textContent = 'Copied!';
      setTimeout(() => { copyCrumbPathLabel.textContent = 'Copy Path'; }, 1000);
    });

    copyCrumbValBtn.addEventListener('click', async () => {
      const val = current.parsedOk ? getValueAtPath(current.data, selectedPathSegments) : current.rawText;
      const textToCopy = typeof val === 'object' && val !== null ? JSON.stringify(val, null, 2) : String(val ?? '');
      await copyToClipboard(textToCopy);
      copyCrumbValLabel.textContent = 'Copied!';
      setTimeout(() => { copyCrumbValLabel.textContent = 'Copy Value'; }, 1000);
    });

    // Listen to tree line clicks to update the breadcrumb bar
    treeHost.addEventListener('click', (e) => {
      const line = e.target.closest('.tree-line');
      if (!line || !line.dataset || !line.dataset.treePath) return;
      try {
        const segments = window.JsonDocument.parse(line.dataset.treePath);
        updateBreadcrumb(segments);
      } catch {}
    });

    // Tree View Actions
    expandBtn.addEventListener('click', () => treeView && treeView.expandAll());
    collapseBtn.addEventListener('click', () => treeView && treeView.collapseAll());

    function setSortKeysEnabled(next) {
      sortKeysEnabled = !!next;
      treeView?.setSortKeysEnabled?.(sortKeysEnabled);
      sortKeysBtn.classList.toggle('active', sortKeysEnabled);
    }

    sortKeysBtn.addEventListener('click', () => {
      setSortKeysEnabled(!sortKeysEnabled);
      chrome.storage.sync.set({ sortKeysEnabled: !!sortKeysEnabled });
      try {
        renderFromParsedState();
      } catch {}
    });

    // Tree Search
    function updateOverlaySearchCountOnly() {
      if (!treeView) return;
      const s = treeView.getSearchSummary ? treeView.getSearchSummary() : { query: '', total: 0 };
      if (!s.query || s.total === 0) {
        searchCount.textContent = s.query ? '0' : '';
      } else {
        const activeNum = s.activeIndex >= 0 ? s.activeIndex + 1 : 1;
        searchCount.textContent = `${activeNum}/${s.total.toLocaleString()}`;
      }
    }

    function updateOverlaySearchUI({ rerunSearch } = {}) {
      if (!treeView) return;
      const shouldRerun = rerunSearch !== false;

      if (shouldRerun) {
        const q = searchInput.value || '';
        if (q.trim()) treeView.search(q);
        else treeView.clearSearch();
      }

      updateOverlaySearchCountOnly();
    }

    let searchTimer;
    function scheduleOverlaySearch() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => updateOverlaySearchUI({ rerunSearch: true }), 150);
    }

    searchInput.addEventListener('input', scheduleOverlaySearch);
    searchInput.addEventListener('keydown', (e) => {
      if (!treeView) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) treeView.searchPrev();
        else treeView.searchNext();
        updateOverlaySearchUI({ rerunSearch: false });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        searchInput.value = '';
        treeView.clearSearch();
        updateOverlaySearchUI({ rerunSearch: false });
      }
    });

    searchPrev.addEventListener('click', () => {
      treeView?.searchPrev();
      updateOverlaySearchUI({ rerunSearch: false });
    });
    searchNext.addEventListener('click', () => {
      treeView?.searchNext();
      updateOverlaySearchUI({ rerunSearch: false });
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      treeView?.clearSearch();
      updateOverlaySearchUI({ rerunSearch: false });
    });

    // Editor Handlers
    codeEditor.addEventListener('input', () => {
      setDirty(true);
      schedulePreview();
    });
    rawEditor.addEventListener('input', () => {
      setDirty(true);
    });

    resetBtn.addEventListener('click', () => {
      current = {
        rawText: original.rawText,
        parsedOk: original.parsedOk,
        data: original.data,
        pretty: original.pretty,
        isJsonp: original.isJsonp,
      };
      syncEditorsFromCurrent();
      renderFromParsedState();

      if (!current.parsedOk) showRaw();
      else if (currentView === 'tree') showTree();
      else if (currentView === 'table') showTable();
      else if (currentView === 'code') showCode();
      else showRaw();
    });

    applyBtn.addEventListener('click', () => {
      syncCurrentFromEditors();

      const sourceText = currentView === 'raw' ? current.rawText : current.pretty;
      const trimmed = (sourceText || '').trim();
      if (!trimmed) {
        current.parsedOk = false;
        current.data = null;
        current.isJsonp = false;
        renderFromParsedState();
        showRaw();
        setDirty(false);
        return;
      }

      if (trimmed.length > MAX_PARSE_CHARS) {
        current.parsedOk = false;
        current.data = null;
        current.isJsonp = false;
        setBanner(`Not valid JSON (too large to parse safely: ${trimmed.length.toLocaleString()} chars)`);
        if (treeView) treeView.renderRawText(sourceText, 'Not valid JSON');
        showRaw();
        setDirty(false);
        return;
      }

      const nextParsed = parseJsonOrJsonpSafe(trimmed);
      if (!nextParsed.ok) {
        current.parsedOk = false;
        current.data = null;
        current.isJsonp = false;
        setBanner(`${nextParsed.error}. Showing raw content.`);
        if (treeView) treeView.renderRawText(sourceText, 'Not valid JSON');
        showRaw();
        setDirty(false);
        return;
      }

      current.parsedOk = true;
      current.data = nextParsed.data;
      current.isJsonp = !!nextParsed.isJsonp;
      current.pretty = JSON.stringify(nextParsed.data, null, 2);
      current.rawText = sourceText;

      syncEditorsFromCurrent();
      renderFromParsedState();
      showTree();
    });

    minifyBtn.addEventListener('click', () => {
      const sourceText = (currentView === 'code')
        ? (codeEditor.value || '')
        : currentView === 'raw' ? (rawEditor.value || '') : (current.parsedOk ? JSON.stringify(current.data) : (rawEditor.value || ''));

      const trimmed = (sourceText || '').trim();
      if (!trimmed) return;

      if (trimmed.length > MAX_PARSE_CHARS) {
        setBanner(`Too large to minify safely: ${trimmed.length.toLocaleString()} chars`);
        return;
      }

      const nextParsed = parseJsonOrJsonpSafe(trimmed);
      if (!nextParsed.ok) {
        setBanner(`${nextParsed.error}. Cannot minify.`);
        return;
      }

      codeEditor.value = JSON.stringify(nextParsed.data);
      schedulePreview();
      setDirty(true);
      showCode();
      setBanner(nextParsed.isJsonp ? 'JSONP detected. Minified JSON.' : 'Minified JSON (whitespace removed).');
    });

    async function copyToClipboard(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {}

      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }

    copyBtn.addEventListener('click', async () => {
      const textToCopy =
        currentView === 'code'
          ? (codeEditor.value || '')
          : currentView === 'raw' ? (rawEditor.value || '') : (current.parsedOk ? JSON.stringify(current.data, null, 2) : (current.rawText || ''));
      await copyToClipboard(textToCopy);
      copyLabel.textContent = 'Copied!';
      setTimeout(() => { copyLabel.textContent = 'Copy'; }, 1000);
    });

    downloadBtn.addEventListener('click', () => {
      const contentStr =
        currentView === 'code'
          ? (codeEditor.value || '')
          : currentView === 'raw' ? (rawEditor.value || '') : (current.parsedOk ? JSON.stringify(current.data, null, 2) : (current.rawText || ''));

      const isJson = currentView === 'code' || current.parsedOk;
      const filename = isJson ? 'data.json' : 'data.txt';
      const mime = isJson ? 'application/json' : 'text/plain';

      const blob = new Blob([contentStr], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Theme Mode Changes
    themeSelect.addEventListener('change', () => {
      const mode = themeSelect.value;
      chrome.storage.sync.set({ pageViewerTheme: mode });
      setViewerTheme(root, mode);
    });

    // Syntax Theme Changes
    syntaxThemeSelect.addEventListener('change', () => {
      const sTheme = syntaxThemeSelect.value;
      chrome.storage.sync.set({ jsonSyntaxTheme: sTheme });
      setViewerSyntaxTheme(root, sTheme);
    });

    // Load CSS into shadow root first, then load settings and render.
    loadViewerCssIntoShadow(shadowRoot, () => {
      chrome.storage.sync.get(
        ['pageViewerTheme', 'pageViewerCustomCss', 'sortKeysEnabled', 'jsonSyntaxTheme'],
        (res) => {
          const themeMode = res.pageViewerTheme || 'auto';
          themeSelect.value = themeMode;
          setViewerTheme(root, themeMode);

          const syntaxTheme = res.jsonSyntaxTheme || 'emerald';
          syntaxThemeSelect.value = syntaxTheme;
          setViewerSyntaxTheme(root, syntaxTheme);

          if (typeof res.pageViewerCustomCss === 'string' && res.pageViewerCustomCss.trim()) {
            customCssTag.textContent = res.pageViewerCustomCss;
            customCssTag.style.display = 'block';
          }

          setSortKeysEnabled(!!res.sortKeysEnabled);

          if (!parsed.ok) {
            setBanner(`${parsed.error}. Showing raw content.`);
            syncEditorsFromCurrent();
            if (treeView) treeView.renderRawText(original.rawText || '', 'Not valid JSON');
            showRaw();
          } else {
            syncEditorsFromCurrent();
            renderFromParsedState();
            showTree();
          }

          resetViewerLayout(root, content);
          root.style.visibility = '';
          setTimeout(() => resetViewerLayout(root, content), 0);
        }
      );
    });

    // Listen to changes in chrome.storage (e.g. if user changes theme in extension popup)
    chrome.storage.onChanged?.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.jsonSyntaxTheme) {
        const nextSyntax = changes.jsonSyntaxTheme.newValue || 'emerald';
        syntaxThemeSelect.value = nextSyntax;
        setViewerSyntaxTheme(root, nextSyntax);
      }
      if (changes.pageViewerTheme) {
        const nextTheme = changes.pageViewerTheme.newValue || 'auto';
        themeSelect.value = nextTheme;
        setViewerTheme(root, nextTheme);
      }
      if (changes.sortKeysEnabled) {
        setSortKeysEnabled(!!changes.sortKeysEnabled.newValue);
        renderFromParsedState();
      }
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        chrome.storage.sync.get(['pageViewerTheme'], (res) => {
          const mode = res.pageViewerTheme || 'auto';
          if (mode === 'auto') setViewerTheme(root, 'auto');
        });
      });
    }
  }

  function run() {
    if (location.protocol === 'chrome-extension:') return;
    if (document.getElementById(VIEWER_HOST_ID) || document.getElementById('json-studio-viewer')) return;

    const ct = document.contentType;
    if (!isJsonContentType(ct)) return;

    const raw = getPageRawText();
    const reason = 'content-type';

    const trimmed = (raw || '').trim();
    if (!trimmed) {
      renderViewer({ rawText: raw, parsed: { ok: false, error: 'Not valid JSON' }, candidateReason: reason });
      return;
    }

    if (trimmed.length > MAX_PARSE_CHARS) {
      renderViewer({
        rawText: raw,
        parsed: { ok: false, error: `Not valid JSON (or too large to parse safely: ${trimmed.length.toLocaleString()} chars)` },
        candidateReason: reason,
      });
      return;
    }

    const parsed = parseJson(trimmed);
    renderViewer({ rawText: raw, parsed, candidateReason: reason });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    setTimeout(run, 0);
  }
})();
