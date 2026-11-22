(function () {
  'use strict';

  // ─── JMESPath built-in functions ─────────────────────────────────────────────

  const JMES_FUNCTIONS = [
    'abs', 'avg', 'ceil', 'contains', 'ends_with', 'floor', 'join',
    'keys', 'length', 'map', 'max', 'max_by', 'merge', 'min', 'min_by',
    'not_null', 'reverse', 'sort', 'sort_by', 'starts_with', 'sum',
    'to_array', 'to_number', 'to_string', 'type', 'values', 'zip',
  ];

  const FUNCTION_SIGNATURES = {
    abs: 'number',
    avg: 'array',
    ceil: 'number',
    contains: 'subject, search',
    ends_with: 'subject, suffix',
    floor: 'number',
    join: 'glue, array',
    keys: 'object',
    length: 'subject',
    map: 'expr, array',
    max: 'collection',
    max_by: 'array, expr',
    merge: '…objects',
    min: 'collection',
    min_by: 'array, expr',
    not_null: '…values',
    reverse: 'array|string',
    sort: 'array',
    sort_by: 'array, expr',
    starts_with: 'subject, prefix',
    sum: 'array',
    to_array: 'value',
    to_number: 'value',
    to_string: 'value',
    type: 'value',
    values: 'object',
    zip: '…arrays',
  };

  // ─── Schema extraction ────────────────────────────────────────────────────────

  const MAX_DEPTH = 8;
  const MAX_ARRAY_SAMPLE = 20;

  function extractKeys(value, depth) {
    depth = depth || 0;
    if (depth > MAX_DEPTH || value === null || value === undefined) return [];
    if (Array.isArray(value)) {
      const keySet = new Set();
      const sample = value.slice(0, MAX_ARRAY_SAMPLE);
      for (const item of sample) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          for (const k of Object.keys(item)) keySet.add(k);
        }
      }
      return Array.from(keySet);
    }
    if (typeof value === 'object') {
      return Object.keys(value);
    }
    return [];
  }

  // ─── Context detection ────────────────────────────────────────────────────────

  // Chars that can appear in a JMESPath identifier (unquoted)
  const IDENT_RE = /[\w$]/;

  function getContext(queryText, cursorPos) {
    const prefix = queryText.slice(0, cursorPos);

    // Walk backwards from cursor to collect the current token
    let i = prefix.length - 1;
    let currentToken = '';
    while (i >= 0 && IDENT_RE.test(prefix[i])) {
      currentToken = prefix[i] + currentToken;
      i--;
    }
    const tokenStart = i + 1;

    // The char immediately before the token (or before the cursor if no token)
    const triggerChar = i >= 0 ? prefix[i] : '';

    // Build parentPath: everything in prefix before the trigger char + token
    // Trim trailing dot/bracket that signals navigation
    let parentPath = prefix.slice(0, tokenStart);
    // Remove trailing '.' so we get the parent, not an incomplete expression
    if (parentPath.endsWith('.')) {
      parentPath = parentPath.slice(0, -1);
    }

    // Detect if we're inside a function argument context
    // Simple heuristic: look for an unclosed '(' with no matching ')' after it
    const lastOpen = parentPath.lastIndexOf('(');
    const lastClose = parentPath.lastIndexOf(')');
    const isInFunction = lastOpen > lastClose;

    // Detect if this looks like a function name position:
    // - no trigger char (start of expression)
    // - after pipe |, &&, ||, comma
    const functionTriggers = ['', '|', '&', ',', '('];
    const suggestFunctions = functionTriggers.includes(triggerChar.trim()) || isInFunction;

    return { parentPath, currentToken, tokenStart, triggerChar, suggestFunctions };
  }

  // ─── Data navigation ─────────────────────────────────────────────────────────

  // Splits a path with an unclosed bracket into an array portion and a sub-path
  // that was being navigated inside the bracket.
  //
  // "people[?general"     → { arrayPath: "people",  subPath: "general" }
  // "people[?gen.addr"    → { arrayPath: "people",  subPath: "gen.addr" }
  // "users[?"             → { arrayPath: "users",   subPath: "" }
  // "users[*"             → { arrayPath: "users",   subPath: "" }
  // "users[].name"        → { arrayPath: "users[]", subPath: "" }  (bracket closed)
  // "users[?age > `30`]"  → { arrayPath: "...",     subPath: "" }  (bracket closed)
  function getFilterContext(path) {
    if (!path) return { arrayPath: '', subPath: '' };

    let depth = 0;
    let lastUnclosed = -1;
    for (let i = 0; i < path.length; i++) {
      if (path[i] === '[') {
        depth++;
        lastUnclosed = i;
      } else if (path[i] === ']') {
        depth--;
        if (depth <= 0) { depth = 0; lastUnclosed = -1; }
      }
    }

    if (lastUnclosed < 0) {
      // No unclosed bracket — path is already navigable
      return { arrayPath: path, subPath: '' };
    }

    let arrayPath = path.slice(0, lastUnclosed);
    if (arrayPath.endsWith('.')) arrayPath = arrayPath.slice(0, -1);

    let inner = path.slice(lastUnclosed + 1);
    if (inner.startsWith('?')) inner = inner.slice(1);
    if (inner === '*') inner = '';

    // Only treat inner as a sub-navigation path if it contains only simple
    // identifier chars and dots. Complex filter conditions (e.g. "age > `30`")
    // have spaces/operators and should be ignored.
    const subPath = /^[\w$.]*$/.test(inner) ? inner : '';

    return { arrayPath, subPath };
  }

  function navigatePath(data, path) {
    if (!path || !path.trim()) return data;
    try {
      if (window.jmespath && typeof window.jmespath.search === 'function') {
        return window.jmespath.search(data, path);
      }
    } catch {
      // Fall back to root
    }
    return data;
  }

  // ─── Suggestion generation ────────────────────────────────────────────────────

  const MAX_SUGGESTIONS = 10;

  function matchPrefix(str, prefix) {
    if (!prefix) return true;
    return str.toLowerCase().startsWith(prefix.toLowerCase());
  }

  function getSuggestions(data, queryText, cursorPos) {
    if (!data) return { items: [], tokenStart: cursorPos };

    const { parentPath, currentToken, tokenStart, triggerChar, suggestFunctions } = getContext(queryText, cursorPos);

    // Resolve navigation path, preserving sub-paths typed inside filter brackets.
    // e.g. "people[?general" → navigate "people[].general" → keys: id, age
    // e.g. "users[?ag"       → navigate "users[]"          → keys: age, …
    const { arrayPath, subPath } = getFilterContext(parentPath);
    let navPath;
    if (subPath) {
      navPath = arrayPath ? `${arrayPath}[].${subPath}` : subPath;
    } else {
      navPath = arrayPath;
    }
    if (navPath && navPath.endsWith('.')) navPath = navPath.slice(0, -1);

    const parentNode = navigatePath(data, navPath);

    const items = [];
    const seen = new Set();

    function addKey(label, detail) {
      if (seen.has(label) || !matchPrefix(label, currentToken)) return;
      seen.add(label);
      items.push({ label, type: 'key', detail: detail || '' });
    }

    function addFunction(name) {
      if (seen.has(name) || !matchPrefix(name, currentToken)) return;
      seen.add(name);
      items.push({ label: name, type: 'fn', detail: FUNCTION_SIGNATURES[name] || '' });
    }

    // Keys from the parent node
    if (parentNode !== null && parentNode !== undefined) {
      const keys = extractKeys(parentNode, 0);
      for (const k of keys) {
        // Determine value type for detail hint
        let detail = '';
        if (Array.isArray(parentNode)) {
          // parent is array — try first element
          const first = parentNode[0];
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const v = first[k];
            if (v !== undefined) detail = Array.isArray(v) ? 'array' : typeof v;
          }
        } else if (typeof parentNode === 'object' && parentNode !== null) {
          const v = parentNode[k];
          if (v !== undefined) detail = Array.isArray(v) ? 'array' : typeof v;
        }
        addKey(k, detail);
      }

      // If parent is an array and we're directly after '[', suggest array expressions
      if (Array.isArray(parentNode) && (triggerChar === '[' || parentPath.endsWith(']'))) {
        if (!currentToken) {
          if (!seen.has('*')) { seen.add('*'); items.push({ label: '*', type: 'op', detail: 'all elements' }); }
          if (!seen.has('?')) { seen.add('?'); items.push({ label: '?', type: 'op', detail: 'filter expression' }); }
        }
      }

      // Suggest [] and [*] if parent is an array and user is navigating
      if (Array.isArray(parentNode) && !currentToken && triggerChar === '.') {
        // They typed "arr." which is unusual but let them keep going
      }
    }

    // JMESPath functions
    if (suggestFunctions || !parentPath) {
      for (const fn of JMES_FUNCTIONS) {
        addFunction(fn);
      }
    }

    return { items: items.slice(0, MAX_SUGGESTIONS), tokenStart };
  }

  // ─── Dropdown rendering ───────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightMatch(label, prefix) {
    if (!prefix) return escapeHtml(label);
    const idx = label.toLowerCase().indexOf(prefix.toLowerCase());
    if (idx < 0) return escapeHtml(label);
    return (
      escapeHtml(label.slice(0, idx)) +
      '<mark>' + escapeHtml(label.slice(idx, idx + prefix.length)) + '</mark>' +
      escapeHtml(label.slice(idx + prefix.length))
    );
  }

  function typeIcon(type) {
    if (type === 'fn') return 'ƒ';
    if (type === 'op') return '⊕';
    return '·';
  }

  function renderDropdown(dropdown, items, activeIndex, currentToken) {
    if (!items.length) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = items.map((item, i) => `
      <div class="jmes-suggestion-item${i === activeIndex ? ' active' : ''}" data-index="${i}">
        <span class="jmes-suggestion-type">${escapeHtml(typeIcon(item.type))}</span>
        <span class="jmes-suggestion-label">${highlightMatch(item.label, currentToken)}</span>
        ${item.detail ? `<span class="jmes-suggestion-detail">${escapeHtml(item.detail)}</span>` : ''}
      </div>
    `).join('');

    dropdown.style.display = 'block';

    // Scroll active item into view
    if (activeIndex >= 0) {
      const activeEl = dropdown.children[activeIndex];
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  // ─── JSON parsing (reuse jmespath or plain JSON.parse) ────────────────────────

  let _cachedJsonStr = null;
  let _cachedJsonData = null;

  function parseJson(str) {
    if (!str || !str.trim()) return null;
    if (str === _cachedJsonStr) return _cachedJsonData;
    _cachedJsonStr = str;
    try {
      _cachedJsonData = JSON.parse(str);
    } catch {
      // Try JSONP pattern: callbackName({...})
      const m = str.match(/^\s*[\w$.]+\s*\(\s*([\s\S]*)\s*\)\s*;?\s*$/);
      if (m) {
        try { _cachedJsonData = JSON.parse(m[1]); }
        catch { _cachedJsonData = null; }
      } else {
        _cachedJsonData = null;
      }
    }
    return _cachedJsonData;
  }

  // ─── Attach ──────────────────────────────────────────────────────────────────

  function attach({ input, dropdown, getJson }) {
    if (!input || !dropdown) return;

    let activeIndex = -1;
    let currentItems = [];
    let currentTokenForHighlight = '';

    function close() {
      dropdown.style.display = 'none';
      activeIndex = -1;
      currentItems = [];
    }

    function accept(item) {
      if (!item) return;
      const cursorPos = input.selectionStart;
      const { tokenStart } = getContext(input.value, cursorPos);
      const completion = item.type === 'fn' ? item.label + '(' : item.label;
      input.value =
        input.value.slice(0, tokenStart) +
        completion +
        input.value.slice(cursorPos);
      const newCaret = tokenStart + completion.length;
      input.setSelectionRange(newCaret, newCaret);
      close();
      input.focus();
      // Trigger a fresh suggestion pass after inserting a function open-paren
      if (item.type === 'fn') {
        setTimeout(updateSuggestions, 0);
      }
    }

    function updateSuggestions() {
      const jsonStr = getJson ? getJson() : '';
      const data = parseJson(jsonStr);
      const cursorPos = input.selectionStart;
      const queryText = input.value;

      if (!queryText.trim()) { close(); return; }

      const { items, tokenStart } = getSuggestions(data, queryText, cursorPos);
      currentItems = items;
      const { currentToken } = getContext(queryText, cursorPos);
      currentTokenForHighlight = currentToken;

      if (!items.length) { close(); return; }

      // Keep activeIndex valid after re-render
      if (activeIndex >= items.length) activeIndex = items.length - 1;
      renderDropdown(dropdown, items, activeIndex, currentTokenForHighlight);
    }

    // Debounce helper
    let timer;
    function debounced() {
      clearTimeout(timer);
      timer = setTimeout(updateSuggestions, 50);
    }

    // Input events
    input.addEventListener('input', debounced);

    input.addEventListener('focus', () => {
      if (input.value.trim()) debounced();
    });

    input.addEventListener('keydown', (e) => {
      const visible = dropdown.style.display !== 'none' && currentItems.length > 0;

      if (e.key === 'Escape') {
        if (visible) { e.preventDefault(); close(); }
        return;
      }

      if (!visible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentItems.length - 1);
        renderDropdown(dropdown, currentItems, activeIndex, currentTokenForHighlight);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderDropdown(dropdown, currentItems, activeIndex, currentTokenForHighlight);
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (activeIndex >= 0 && currentItems[activeIndex]) {
          e.preventDefault();
          accept(currentItems[activeIndex]);
        } else if (e.key === 'Tab' && currentItems.length > 0) {
          e.preventDefault();
          accept(currentItems[0]);
        } else {
          close();
        }
        return;
      }
    });

    // Click on dropdown items
    dropdown.addEventListener('mousedown', (e) => {
      // Use mousedown (before blur) so we can intercept before input loses focus
      const item = e.target.closest('.jmes-suggestion-item');
      if (!item) return;
      e.preventDefault();
      const idx = parseInt(item.getAttribute('data-index'), 10);
      if (!isNaN(idx) && currentItems[idx]) {
        accept(currentItems[idx]);
      }
    });

    // Close when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        close();
      }
    });

    // Close when input loses focus (unless clicking the dropdown)
    input.addEventListener('blur', () => {
      // Small delay so the mousedown on dropdown fires first
      setTimeout(() => {
        if (document.activeElement !== input) close();
      }, 150);
    });
  }

  // ─── Export ──────────────────────────────────────────────────────────────────

  window.JmesIntellisense = { attach, getSuggestions, getContext, extractKeys };
})();
