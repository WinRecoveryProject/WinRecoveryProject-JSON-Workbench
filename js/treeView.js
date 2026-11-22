(function () {
  'use strict';

  const DEFAULTS = {
    childBatchSize: 100,
    maxDepth: 50,
    largeJsonNodeThreshold: 10000,
    searchMaxMatches: 2000,
    searchMaxVisitedNodes: 250000,
    sortKeysEnabled: false,
  };

  function compareObjectKeys(a, b) {
    const as = String(a);
    const bs = String(b);
    // Numeric + case-insensitive comparison for intuitive A–Z ordering.
    return as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' });
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function countNodes(value) {
    let count = 0;
    // Interactive stack-based traversal to avoid call stack overflow on deep trees
    const stack = [value];
    while (stack.length > 0) {
      count++;
      const curr = stack.pop();
      if (Array.isArray(curr)) {
        for (let i = 0; i < curr.length; i++) {
          stack.push(curr[i]);
        }
      } else if (isPlainObject(curr)) {
        const keys = Object.keys(curr);
        for (let i = 0; i < keys.length; i++) {
          stack.push(curr[keys[i]]);
        }
      }
    }
    return count;
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function linkifyString(container, text) {
    const urlRegex = /https?:\/\/[^\s"'<>]+/g;
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const start = match.index;
      const end = start + url.length;

      if (start > lastIndex) {
        container.appendChild(document.createTextNode(text.slice(lastIndex, start)));
      }

      const a = document.createElement('a');
      a.className = 'clickable-url';
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = url;
      container.appendChild(a);

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function isIdentifierKey(key) {
    return /^[A-Za-z_$][\w$]*$/.test(key);
  }

  function segmentsToJsonPath(segments) {
    let path = '$';
    for (const seg of segments || []) {
      if (typeof seg === 'number') {
        path += `[${seg}]`;
        continue;
      }

      const key = String(seg);
      if (isIdentifierKey(key)) {
        path += `.${key}`;
      } else {
        path += `[${JSON.stringify(key)}]`;
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

  class TreeView {
    constructor(options) {
      const merged = { ...DEFAULTS, ...(options || {}) };

      this.container = merged.container;
      this.perfWarningEl = merged.perfWarningEl || null;
      this.childBatchSize = merged.childBatchSize;
      this.maxDepth = merged.maxDepth;
      this.largeJsonNodeThreshold = merged.largeJsonNodeThreshold;
      this.menuRootEl = merged.menuRootEl || null;

      this.sortKeysEnabled = !!merged.sortKeysEnabled;

      if (!this.container) {
        throw new Error('TreeView requires a container element');
      }

      this._nodeId = 0;
      this._rootValue = undefined;
      this._menuEl = null;
      this._menuAnchorLine = null;
      this._menuPathSegments = null;
      this._boundDocEvents = false;

      this.searchMaxMatches = merged.searchMaxMatches;
      this.searchMaxVisitedNodes = merged.searchMaxVisitedNodes;

      this._pathKeyToLine = new Map();
      this._search = {
        query: '',
        matches: [],
        matchSet: new Set(),
        activeIndex: -1,
        activePathKey: null,
      };

      this._attachDelegatedHandlers();
    }

    setSortKeysEnabled(enabled) {
      this.sortKeysEnabled = !!enabled;
    }

    render(value) {
      this.container.innerHTML = '';
      this._nodeId = 0;
      this._rootValue = value;
      this._pathKeyToLine.clear();
      this._resetSearchState();
      this._closeContextMenu();

      if (value === undefined) {
        this._renderEmptyState('Load or paste JSON above to view tree.');
        this._setPerfWarning(false);
        return;
      }

      const totalNodes = countNodes(value);
      this._setPerfWarning(totalNodes > this.largeJsonNodeThreshold, totalNodes);

      const rootNode = this._createNode({ key: '(root)', value, depth: 0, pathSegments: [] });
      this.container.appendChild(rootNode);
    }

    renderRawText(rawText, title) {
      this.container.innerHTML = '';
      this._setPerfWarning(false);
      this._rootValue = undefined;
      this._pathKeyToLine.clear();
      this._resetSearchState();
      this._closeContextMenu();

      const box = createEl('div', 'tree-raw');
      const heading = createEl('div', 'tree-raw-title', title || 'Raw text');
      const pre = createEl('pre', 'tree-raw-pre');
      pre.textContent = rawText || '';

      box.appendChild(heading);
      box.appendChild(pre);
      this.container.appendChild(box);
    }

    collapseAll() {
      this.container.querySelectorAll('.tree-node.tree-composite').forEach(node => {
        node.classList.add('collapsed');
        const toggle = node.querySelector(':scope > .tree-line .tree-toggle');
        if (toggle) {
          toggle.textContent = '▶';
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    expandAll() {
      this.container.querySelectorAll('.tree-node.tree-composite').forEach(node => {
        node.classList.remove('collapsed');
        const toggle = node.querySelector(':scope > .tree-line .tree-toggle');
        if (toggle) {
          toggle.textContent = '▼';
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
    }

    expandToDepth(targetDepth) {
      this.container.querySelectorAll('.tree-node.tree-composite').forEach(node => {
        const line = node.querySelector(':scope > .tree-line');
        const depth = parseInt(line?.style.getPropertyValue('--tree-depth') || '0', 10);
        const toggle = line?.querySelector('.tree-toggle');
        if (depth < targetDepth) {
          node.classList.remove('collapsed');
          if (toggle) {
            toggle.textContent = '▼';
            toggle.setAttribute('aria-expanded', 'true');
          }
        } else {
          node.classList.add('collapsed');
          if (toggle) {
            toggle.textContent = '▶';
            toggle.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }

    revealPath(segments) {
      return this._revealPath(segments);
    }

    search(query, options) {
      const opts = options || {};
      const raw = query == null ? '' : String(query);
      const trimmed = raw.trim();

      if (!trimmed) {
        this.clearSearch();
        return { query: '', total: 0, activeIndex: -1 };
      }

      if (this._rootValue === undefined) {
        this._resetSearchState();
        this._search.query = trimmed;
        return { query: trimmed, total: 0, activeIndex: -1 };
      }

      const caseSensitive = !!opts.caseSensitive;
      const needle = caseSensitive ? trimmed : trimmed.toLowerCase();

      this._search.query = trimmed;
      this._search.matches = [];
      this._search.matchSet = new Set();
      this._search.activeIndex = -1;
      this._search.activePathKey = null;

      const matches = this._search.matches;
      const matchSet = this._search.matchSet;

      let visited = 0;
      const stack = [{ value: this._rootValue, pathSegments: [], keyText: '(root)' }];

      const addMatch = (segments) => {
        const pathKey = JSON.stringify(segments || []);
        if (matchSet.has(pathKey)) return;
        matchSet.add(pathKey);
        matches.push(segments);
      };

      while (stack.length) {
        const node = stack.pop();
        visited++;

        if (visited > this.searchMaxVisitedNodes) break;
        if (matches.length >= this.searchMaxMatches) break;

        const keyText = node.keyText == null ? '' : String(node.keyText);
        const keyHay = caseSensitive ? keyText : keyText.toLowerCase();
        if (needle && keyHay.includes(needle)) {
          addMatch(node.pathSegments);
        }

        const value = node.value;
        if (value === null) {
          const vHay = caseSensitive ? 'null' : 'null';
          if (needle && vHay.includes(needle)) addMatch(node.pathSegments);
        } else if (typeof value === 'string' || typeof value === 'number' || window.JsonDocument?.isExactNumber(value) || typeof value === 'boolean') {
          const vText = String(value);
          const vHay = caseSensitive ? vText : vText.toLowerCase();
          if (needle && vHay.includes(needle)) addMatch(node.pathSegments);
        }

        if (Array.isArray(value)) {
          for (let i = value.length - 1; i >= 0; i--) {
            stack.push({
              value: value[i],
              pathSegments: [...node.pathSegments, i],
              keyText: `[${i}]`,
            });
          }
          continue;
        }

        if (isPlainObject(value)) {
          const keys = Object.keys(value);
          if (this.sortKeysEnabled) keys.sort(compareObjectKeys);
          for (let i = keys.length - 1; i >= 0; i--) {
            const k = keys[i];
            stack.push({
              value: value[k],
              pathSegments: [...node.pathSegments, k],
              keyText: k,
            });
          }
        }
      }

      this._refreshSearchHighlight();
      return { query: trimmed, total: matches.length, activeIndex: this._search.activeIndex };
    }

    clearSearch() {
      this._resetSearchState();
      this._refreshSearchHighlight();
      return { query: '', total: 0, activeIndex: -1 };
    }

    getSearchSummary() {
      return {
        query: this._search.query || '',
        total: Array.isArray(this._search.matches) ? this._search.matches.length : 0,
        activeIndex: Number.isFinite(this._search.activeIndex) ? this._search.activeIndex : -1,
      };
    }

    searchNext() {
      if (!this._search.matches.length) return null;
      const nextIndex = this._search.activeIndex < 0
        ? 0
        : (this._search.activeIndex + 1) % this._search.matches.length;
      return this._setActiveMatch(nextIndex);
    }

    searchPrev() {
      if (!this._search.matches.length) return null;
      const n = this._search.matches.length;
      const prevIndex = this._search.activeIndex < 0
        ? n - 1
        : (this._search.activeIndex - 1 + n) % n;
      return this._setActiveMatch(prevIndex);
    }

    _resetSearchState() {
      this._search.query = '';
      this._search.matches = [];
      this._search.matchSet = new Set();
      this._search.activeIndex = -1;
      this._search.activePathKey = null;
    }

    _setActiveMatch(index) {
      const i = Number(index);
      if (!Number.isFinite(i)) return null;
      if (i < 0 || i >= this._search.matches.length) return null;

      const segments = this._search.matches[i];
      const pathKey = JSON.stringify(segments || []);
      this._search.activeIndex = i;
      this._search.activePathKey = pathKey;

      this._revealPath(segments);
      this._refreshSearchHighlight();
      return { total: this._search.matches.length, activeIndex: i };
    }

    _refreshSearchHighlight() {
      if (!this._pathKeyToLine) return;
      for (const [pathKey, lineEl] of this._pathKeyToLine.entries()) {
        if (!lineEl) continue;
        lineEl.classList.toggle('tree-search-hit', this._search.matchSet && this._search.matchSet.has(pathKey));
        lineEl.classList.toggle('tree-search-active', !!this._search.activePathKey && this._search.activePathKey === pathKey);
      }
    }

    _registerLine(lineEl) {
      if (!lineEl || !lineEl.dataset || !lineEl.dataset.treePath) return;
      const pathKey = lineEl.dataset.treePath;
      this._pathKeyToLine.set(pathKey, lineEl);
      lineEl.classList.toggle('tree-search-hit', this._search.matchSet && this._search.matchSet.has(pathKey));
      lineEl.classList.toggle('tree-search-active', !!this._search.activePathKey && this._search.activePathKey === pathKey);
    }

    _setNodeExpanded(nodeEl, expanded) {
      if (!nodeEl || !nodeEl.classList) return;
      const shouldExpand = !!expanded;
      nodeEl.classList.toggle('collapsed', !shouldExpand);
      const toggle = nodeEl.querySelector(':scope > .tree-line .tree-toggle');
      if (toggle) {
        toggle.textContent = shouldExpand ? '▼' : '▶';
        toggle.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');
      }
    }

    _revealPath(pathSegments) {
      if (!Array.isArray(pathSegments)) return false;
      if (this._rootValue === undefined) return false;

      const targetKey = JSON.stringify(pathSegments);
      const rootKey = JSON.stringify([]);
      if (!this._pathKeyToLine.has(rootKey)) return false;

      for (let i = 1; i <= pathSegments.length; i++) {
        const prefix = pathSegments.slice(0, i);
        const prefixKey = JSON.stringify(prefix);
        if (this._pathKeyToLine.has(prefixKey)) {
          continue;
        }

        const parentPrefix = pathSegments.slice(0, i - 1);
        const parentKey = JSON.stringify(parentPrefix);
        const parentLine = this._pathKeyToLine.get(parentKey);
        if (!parentLine) return false;

        const parentNode = parentLine.closest('.tree-node.tree-composite');
        if (!parentNode) return false;
        this._setNodeExpanded(parentNode, true);

        // Render more batches until the desired child exists (or until all children are rendered)
        let safety = 0;
        while (!this._pathKeyToLine.has(prefixKey)) {
          const loadMoreBtn = parentNode.querySelector(':scope > .tree-children > .tree-load-more');
          if (!loadMoreBtn) break;
          loadMoreBtn.click();
          safety++;
          if (safety > 5000) break;
        }

        if (!this._pathKeyToLine.has(prefixKey)) return false;
      }

      const targetLine = this._pathKeyToLine.get(targetKey);
      if (targetLine && targetLine.scrollIntoView) {
        try {
          targetLine.scrollIntoView({ block: 'center' });
        } catch {
          targetLine.scrollIntoView(true);
        }
      }

      // Ensure all ancestors are expanded for visibility
      const targetNode = targetLine ? targetLine.closest('.tree-node.tree-composite') : null;
      if (targetNode) this._setNodeExpanded(targetNode, true);
      return true;
    }

    _renderEmptyState(message) {
      const empty = createEl('div', 'tree-empty');
      empty.textContent = message;
      this.container.appendChild(empty);
    }

    _setPerfWarning(visible, totalNodes) {
      if (!this.perfWarningEl) return;
      if (!visible) {
        this.perfWarningEl.style.display = 'none';
        return;
      }

      const textEl = this.perfWarningEl.querySelector('[data-perf-text]');
      if (textEl) {
        textEl.textContent = `Large JSON detected (${totalNodes.toLocaleString()} nodes). Tree view uses lazy rendering.`;
      }
      this.perfWarningEl.style.display = 'flex';
    }

    _attachDelegatedHandlers() {
      // Context menu (right click) and actions button, via event delegation.
      // This works with lazy-rendered nodes.
      this.container.addEventListener('contextmenu', (e) => {
        const target = e.target;
        if (target && target.closest && target.closest('a.clickable-url')) return;

        const line = target && target.closest ? target.closest('.tree-line') : null;
        if (!line || !this.container.contains(line)) return;
        if (!line.dataset || !line.dataset.treePath) return;
        if (this._rootValue === undefined) return;

        e.preventDefault();
        e.stopPropagation();
        this._openContextMenuForLine(line, e.clientX, e.clientY);
      });

      this.container.addEventListener('click', (e) => {
        const target = e.target;
        const btn = target && target.closest ? target.closest('.tree-actions') : null;
        if (!btn || !this.container.contains(btn)) return;

        const line = btn.closest('.tree-line');
        if (!line || !line.dataset || !line.dataset.treePath) return;
        if (this._rootValue === undefined) return;

        e.preventDefault();
        e.stopPropagation();
        const rect = btn.getBoundingClientRect();
        this._openContextMenuForLine(line, rect.left, rect.bottom + 6);
      });
    }

    _ensureContextMenu() {
      if (this._menuEl) return this._menuEl;

      const menu = createEl('div', 'tree-context-menu');
      menu.setAttribute('role', 'menu');
      menu.style.display = 'none';

      const makeItem = (label, action, iconSvg) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tree-context-item';
        b.dataset.action = action;
        b.setAttribute('role', 'menuitem');
        b.innerHTML = `${iconSvg}<span>${label}</span>`;
        return b;
      };

      menu.appendChild(makeItem('Copy Object Path', 'copy-path', `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      `));
      menu.appendChild(makeItem('Copy Outer JSON', 'copy-outer', `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
      `));
      menu.appendChild(makeItem('Copy Inner JSON', 'copy-inner', `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `));

      menu.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('button.tree-context-item') : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        await this._handleMenuAction(btn.dataset.action);
        this._closeContextMenu();
      });

      const doc = this.container.ownerDocument || document;
      const root =
        this.menuRootEl ||
        (this.container.closest && this.container.closest('#json-studio-viewer')) ||
        doc.body ||
        this.container;
      root.appendChild(menu);
      this._menuEl = menu;

      if (!this._boundDocEvents) {
        doc.addEventListener('click', (ev) => {
          if (!this._menuEl || this._menuEl.style.display === 'none') return;
          if (ev.target && (this._menuEl.contains(ev.target) || (this._menuAnchorLine && this._menuAnchorLine.contains(ev.target)))) return;
          this._closeContextMenu();
        }, true);

        doc.addEventListener('keydown', (ev) => {
          if (ev.key === 'Escape') this._closeContextMenu();
        }, true);

        doc.addEventListener('scroll', () => this._closeContextMenu(), true);
        doc.defaultView && doc.defaultView.addEventListener('resize', () => this._closeContextMenu(), true);
        this._boundDocEvents = true;
      }

      return menu;
    }

    _openContextMenuForLine(lineEl, x, y) {
      const menu = this._ensureContextMenu();
      let segments;
      try {
        segments = JSON.parse(lineEl.dataset.treePath);
      } catch {
        return;
      }

      if (this._menuAnchorLine && this._menuAnchorLine !== lineEl) {
        this._menuAnchorLine.classList.remove('tree-line-selected');
      }
      this._menuAnchorLine = lineEl;
      this._menuPathSegments = segments;
      lineEl.classList.add('tree-line-selected');

      const doc = this.container.ownerDocument || document;
      const vw = doc.defaultView ? doc.defaultView.innerWidth : window.innerWidth;
      const vh = doc.defaultView ? doc.defaultView.innerHeight : window.innerHeight;

      menu.style.display = 'flex';
      menu.style.position = 'fixed';
      menu.style.left = '0px';
      menu.style.top = '0px';

      // Measure then clamp
      const rect = menu.getBoundingClientRect();
      const clampedLeft = Math.max(8, Math.min(x, vw - rect.width - 8));
      const clampedTop = Math.max(8, Math.min(y, vh - rect.height - 8));
      menu.style.left = `${clampedLeft}px`;
      menu.style.top = `${clampedTop}px`;
      menu.style.zIndex = '2147483647';
    }

    _closeContextMenu() {
      if (this._menuEl) this._menuEl.style.display = 'none';
      if (this._menuAnchorLine) this._menuAnchorLine.classList.remove('tree-line-selected');
      this._menuAnchorLine = null;
      this._menuPathSegments = null;
    }

    async _handleMenuAction(action) {
      if (!action || !this._menuPathSegments) return;
      const segments = this._menuPathSegments;

      if (action === 'copy-path') {
        await this._copyText(segmentsToJsonPath(segments));
        return;
      }

      const innerVal = getValueAtPath(this._rootValue, segments);
      if (action === 'copy-inner') {
        await this._copyText(JSON.stringify(innerVal, null, 2));
        return;
      }

      if (action === 'copy-outer') {
        if (!segments.length) {
          await this._copyText(JSON.stringify(innerVal, null, 2));
          return;
        }

        const parentSegments = segments.slice(0, -1);
        const last = segments[segments.length - 1];
        const parentVal = getValueAtPath(this._rootValue, parentSegments);

        let outer;
        if (Array.isArray(parentVal) && typeof last === 'number') {
          // Recommended behavior: preserve array-ness
          outer = [innerVal];
        } else if (isPlainObject(parentVal) && typeof last === 'string') {
          outer = { [last]: innerVal };
        } else {
          // Fallback (should not happen unless data changed unexpectedly)
          outer = innerVal;
        }

        await this._copyText(JSON.stringify(outer, null, 2));
      }
    }

    async _copyText(text) {
      const str = text == null ? '' : String(text);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(str);
          return true;
        }
      } catch {
        // fall through to execCommand fallback
      }

      try {
        const doc = this.container.ownerDocument || document;
        const ta = doc.createElement('textarea');
        ta.value = str;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        (doc.body || this.container).appendChild(ta);
        ta.select();
        doc.execCommand('copy');
        ta.parentElement && ta.parentElement.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }

    _createNode({ key, value, depth, pathSegments }) {
      if (depth > this.maxDepth) {
        const node = createEl('div', 'tree-node tree-leaf');
        node.style.setProperty('--tree-depth', String(depth));
        const line = createEl('div', 'tree-line');
        line.dataset.treePath = JSON.stringify(pathSegments || []);
        this._registerLine(line);
        line.appendChild(createEl('span', 'tree-key', String(key)));
        line.appendChild(document.createTextNode(': '));
        line.appendChild(createEl('span', 'tree-value tree-value-null', '[Max depth exceeded]'));
        line.appendChild(this._createActionsButton());
        node.appendChild(line);
        return node;
      }

      const isArray = Array.isArray(value);
      const isObject = isPlainObject(value);

      if (!isArray && !isObject) {
        return this._createLeafNode({ key, value, depth, pathSegments });
      }

      const nodeId = ++this._nodeId;
      const node = createEl('div', 'tree-node tree-composite');
      node.dataset.nodeId = String(nodeId);
      node.style.setProperty('--tree-depth', String(depth));

      const line = createEl('div', 'tree-line');
      line.dataset.treePath = JSON.stringify(pathSegments || []);
      this._registerLine(line);

      const toggle = createEl('span', 'tree-toggle', '▼');
      toggle.setAttribute('role', 'button');
      toggle.setAttribute('tabindex', '0');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.addEventListener('click', () => this._toggleNode(node, toggle));
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleNode(node, toggle);
        }
      });

      const keyEl = createEl('span', 'tree-key', String(key));
      const colon = createEl('span', 'tree-colon', ': ');

      const openToken = createEl('span', 'tree-brace', isArray ? '[' : '{');
      const count = isArray ? value.length : Object.keys(value).length;
      const badgeText = isArray ? `${count} items` : `${count} keys`;
      const badge = createEl('span', 'item-count-badge', badgeText);

      line.appendChild(toggle);
      line.appendChild(keyEl);
      line.appendChild(colon);
      line.appendChild(openToken);
      line.appendChild(badge);
      line.appendChild(this._createActionsButton());

      const children = createEl('div', 'tree-children');

      const closeLine = createEl('div', 'tree-line tree-close');
      closeLine.appendChild(createEl('span', 'tree-brace', isArray ? ']' : '}'));

      node.appendChild(line);
      node.appendChild(children);
      node.appendChild(closeLine);

      if (isArray) {
        this._renderArrayChildren(children, value, depth + 1, pathSegments || []);
      } else {
        this._renderObjectChildren(children, value, depth + 1, pathSegments || []);
      }

      return node;
    }

    _toggleNode(node, toggleEl) {
      const isCollapsed = node.classList.toggle('collapsed');
      toggleEl.textContent = isCollapsed ? '▶' : '▼';
      toggleEl.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    }

    _createLeafNode({ key, value, depth, pathSegments }) {
      const node = createEl('div', 'tree-node tree-leaf');
      node.style.setProperty('--tree-depth', String(depth));

      const line = createEl('div', 'tree-line');
      line.dataset.treePath = JSON.stringify(pathSegments || []);
      this._registerLine(line);
      line.appendChild(createEl('span', 'tree-key', String(key)));
      line.appendChild(document.createTextNode(': '));

      const valueEl = createEl('span', 'tree-value');

      if (value === null) {
        valueEl.classList.add('tree-value-null');
        valueEl.textContent = 'null';
      } else if (typeof value === 'string') {
        valueEl.classList.add('tree-value-string');
        valueEl.appendChild(document.createTextNode('"'));
        linkifyString(valueEl, value);
        valueEl.appendChild(document.createTextNode('"'));
      } else if (typeof value === 'number' || window.JsonDocument?.isExactNumber(value)) {
        valueEl.classList.add('tree-value-number');
        valueEl.textContent = String(value);
      } else if (typeof value === 'boolean') {
        valueEl.classList.add('tree-value-boolean');
        valueEl.textContent = value ? 'true' : 'false';
      } else {
        valueEl.textContent = String(value);
      }

      line.appendChild(valueEl);
      line.appendChild(this._createActionsButton());
      node.appendChild(line);
      return node;
    }

    _createActionsButton() {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tree-actions';
      btn.title = 'Node actions (Copy path, JSON)';
      btn.setAttribute('aria-label', 'Node actions');
      btn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2.2"></circle>
          <circle cx="12" cy="12" r="2.2"></circle>
          <circle cx="12" cy="19" r="2.2"></circle>
        </svg>
      `;
      return btn;
    }

    _renderArrayChildren(container, arrayValue, depth, parentSegments) {
      const total = arrayValue.length;
      const batchSize = this.childBatchSize;
      let rendered = 0;

      const renderBatch = () => {
        const end = Math.min(rendered + batchSize, total);
        for (let i = rendered; i < end; i++) {
          const child = this._createNode({
            key: `[${i}]`,
            value: arrayValue[i],
            depth,
            pathSegments: [...(parentSegments || []), i],
          });
          container.appendChild(child);
        }
        rendered = end;

        if (rendered >= total) {
          if (loadMoreBtn && loadMoreBtn.parentElement) loadMoreBtn.parentElement.removeChild(loadMoreBtn);
        } else {
          loadMoreBtn.textContent = `Load more (${(total - rendered).toLocaleString()} remaining)`;
        }
      };

      const loadMoreBtn = createEl('button', 'tree-load-more');
      loadMoreBtn.type = 'button';
      loadMoreBtn.addEventListener('click', () => renderBatch());

      renderBatch();
      if (rendered < total) {
        container.appendChild(loadMoreBtn);
        loadMoreBtn.textContent = `Load more (${(total - rendered).toLocaleString()} remaining)`;
      }
    }

    _renderObjectChildren(container, objectValue, depth, parentSegments) {
      const keys = Object.keys(objectValue);
      if (this.sortKeysEnabled) keys.sort(compareObjectKeys);
      const total = keys.length;
      const batchSize = this.childBatchSize;
      let rendered = 0;

      const renderBatch = () => {
        const end = Math.min(rendered + batchSize, total);
        for (let i = rendered; i < end; i++) {
          const k = keys[i];
          const child = this._createNode({
            key: k,
            value: objectValue[k],
            depth,
            pathSegments: [...(parentSegments || []), k],
          });
          container.appendChild(child);
        }
        rendered = end;

        if (rendered >= total) {
          if (loadMoreBtn && loadMoreBtn.parentElement) loadMoreBtn.parentElement.removeChild(loadMoreBtn);
        } else {
          loadMoreBtn.textContent = `Load more (${(total - rendered).toLocaleString()} remaining)`;
        }
      };

      const loadMoreBtn = createEl('button', 'tree-load-more');
      loadMoreBtn.type = 'button';
      loadMoreBtn.addEventListener('click', () => renderBatch());

      renderBatch();
      if (rendered < total) {
        container.appendChild(loadMoreBtn);
        loadMoreBtn.textContent = `Load more (${(total - rendered).toLocaleString()} remaining)`;
      }
    }
  }

  window.TreeView = TreeView;
})();
