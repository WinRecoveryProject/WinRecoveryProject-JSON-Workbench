/* A read-only view of the editor document beside query results. */
(function () {
  'use strict';

  class QueryWorkspace {
    constructor({ editor, parse, getEngine, onEdit, queryInput }) {
      this.editor = editor;
      this.parse = parse;
      this.getEngine = getEngine;
      this.queryInput = queryInput;
      this.lastSource = null;
      this.selectedPath = null;
      this.codeText = '';
      this.codeMatches = [];
      this.codeMatchIndex = -1;
      this.workspace = document.getElementById('queryWorkspace');
      this.card = document.getElementById('query-source-card');
      this.toggle = document.getElementById('querySourceToggle');
      this.handle = document.getElementById('querySplitHandle');
      this.treeHost = document.getElementById('querySourceTree');
      this.codePane = document.getElementById('querySourceCodePane');
      this.code = document.getElementById('querySourceCode');
      this.search = document.getElementById('querySourceSearch');
      this.count = document.getElementById('querySourceSearchCount');
      this.message = document.getElementById('querySourceMessage');
      this.pathBar = document.getElementById('querySourcePathBar');
      this.pathLabel = document.getElementById('querySourcePath');
      this.treeButton = document.getElementById('querySourceTreeBtn');
      this.codeButton = document.getElementById('querySourceCodeBtn');
      this.tree = new window.TreeView({ container: this.treeHost });
      this.keyboardLineIndex = -1;
      this.preferences = { mode: 'tree', collapsed: false, width: 45 };
      try {
        const saved = JSON.parse(localStorage.getItem('queryWorkspacePreferences') || '{}');
        this.preferences.mode = saved.mode === 'code' ? 'code' : 'tree';
        this.preferences.collapsed = saved.collapsed === true;
        this.preferences.width = Number.isFinite(saved.width) ? Math.max(25, Math.min(70, saved.width)) : 45;
      } catch { /* Start with visible source if an old preference cannot be read. */ }

      this.toggle.addEventListener('click', () => this.setCollapsed(!this.preferences.collapsed));
      this.compactLayout = window.matchMedia('(max-width: 680px)');
      this.compactLayout.addEventListener('change', () => this.updateToggleLabel());
      document.getElementById('queryEditSource').addEventListener('click', onEdit);
      this.treeButton.addEventListener('click', () => this.setMode('tree'));
      this.codeButton.addEventListener('click', () => this.setMode('code'));
      let searchTimer;
      this.search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => this.find(), 120);
      });
      this.search.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); clearTimeout(searchTimer); this.findIfChanged(); this.moveMatch(event.shiftKey ? -1 : 1); }
        if (event.key === 'Escape') { event.preventDefault(); clearTimeout(searchTimer); this.search.value = ''; this.find(); }
      });
      document.getElementById('querySourceSearchPrev').addEventListener('click', () => { this.findIfChanged(); this.moveMatch(-1); });
      document.getElementById('querySourceSearchNext').addEventListener('click', () => { this.findIfChanged(); this.moveMatch(1); });
      this.treeHost.addEventListener('click', event => {
        if (event.target.closest('.tree-toggle, .tree-actions, .tree-context-menu, a, button')) return;
        const line = event.target.closest('[data-tree-path]');
        if (!line || !this.valid) return;
        this.selectLine(line);
      });
      this.treeHost.title = 'Select a field to use its path. Keyboard: arrow keys select, Enter uses the path.';
      this.treeHost.addEventListener('keydown', event => {
        if (event.target !== this.treeHost) return;
        const lines = [...this.treeHost.querySelectorAll('[data-tree-path]')].filter(line => line.getClientRects().length);
        if (!lines.length) return;
        if (event.key === 'Enter' && this.selectedPath) {
          event.preventDefault(); document.getElementById('queryUsePath').click(); return;
        }
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        this.keyboardLineIndex = event.key === 'Home' ? 0 : event.key === 'End' ? lines.length - 1
          : Math.max(0, Math.min(lines.length - 1, this.keyboardLineIndex + (event.key === 'ArrowUp' ? -1 : 1)));
        this.selectLine(lines[this.keyboardLineIndex]);
        lines[this.keyboardLineIndex].scrollIntoView({ block: 'nearest' });
      });
      document.getElementById('queryUsePath').addEventListener('click', () => {
        if (!this.selectedPath) return;
        this.queryInput.value = this.pathExpression();
        this.queryInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.queryInput.focus();
      });

      this.handle.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        this.handle.setPointerCapture(event.pointerId);
        this.workspace.classList.add('is-resizing');
      });
      this.handle.addEventListener('pointermove', event => {
        if (!this.handle.hasPointerCapture(event.pointerId)) return;
        const bounds = this.workspace.getBoundingClientRect();
        this.setWidth(100 * (event.clientX - bounds.left) / bounds.width, false);
      });
      const stopResize = event => {
        if (this.handle.hasPointerCapture(event.pointerId)) this.handle.releasePointerCapture(event.pointerId);
        this.workspace.classList.remove('is-resizing');
        this.save();
      };
      this.handle.addEventListener('pointerup', stopResize);
      this.handle.addEventListener('pointercancel', stopResize);
      this.handle.addEventListener('lostpointercapture', () => this.workspace.classList.remove('is-resizing'));
      this.handle.addEventListener('dblclick', () => this.setWidth(45));
      this.handle.addEventListener('keydown', event => {
        const step = event.shiftKey ? 10 : 2;
        const widths = { ArrowLeft: this.preferences.width - step, ArrowRight: this.preferences.width + step, Home: 25, End: 70, Enter: 45 };
        if (event.key in widths) { event.preventDefault(); this.setWidth(widths[event.key]); }
      });
      this.setWidth(this.preferences.width, false);
      this.setMode(this.preferences.mode, false);
      this.setCollapsed(this.preferences.collapsed, false);
    }

    save() {
      try { localStorage.setItem('queryWorkspacePreferences', JSON.stringify(this.preferences)); } catch { /* Preferences are optional. */ }
    }

    setWidth(width, persist = true) {
      this.preferences.width = Math.round(Math.max(25, Math.min(70, width)));
      this.workspace.style.setProperty('--query-source-width', `${this.preferences.width}%`);
      this.handle.setAttribute('aria-valuenow', String(this.preferences.width));
      this.handle.setAttribute('aria-valuetext', `Source ${this.preferences.width} percent`);
      if (persist) this.save();
    }

    setCollapsed(collapsed, persist = true) {
      this.preferences.collapsed = collapsed;
      this.card.hidden = collapsed;
      this.handle.hidden = collapsed;
      this.workspace.classList.toggle('source-collapsed', collapsed);
      this.updateToggleLabel();
      this.toggle.setAttribute('aria-expanded', String(!collapsed));
      if (persist) this.save();
    }

    updateToggleLabel() {
      const collapsed = this.preferences.collapsed;
      this.toggle.textContent = this.compactLayout.matches ? `Source ${collapsed ? '▾' : '▴'}` : collapsed ? 'Show source' : 'Hide source';
      this.toggle.setAttribute('aria-label', collapsed ? 'Show source JSON' : 'Hide source JSON');
    }

    setMode(mode, persist = true) {
      this.preferences.mode = mode;
      this.treeHost.hidden = mode !== 'tree';
      this.codePane.hidden = mode !== 'code';
      this.treeButton.classList.toggle('active', mode === 'tree');
      this.codeButton.classList.toggle('active', mode === 'code');
      this.treeButton.setAttribute('aria-pressed', String(mode === 'tree'));
      this.codeButton.setAttribute('aria-pressed', String(mode === 'code'));
      this.refreshPath();
      this.find();
      if (persist) this.save();
    }

    sync() {
      const source = this.editor.value;
      if (source === this.lastSource) return;
      this.lastSource = source;
      this.selectedPath = null;
      this.keyboardLineIndex = -1;
      const parsed = this.parse();
      this.valid = parsed.ok;
      this.message.hidden = parsed.ok;
      this.message.textContent = parsed.empty ? 'Add JSON in the Editor to start exploring.' : parsed.ok ? '' : `Fix the source in Editor: ${parsed.error}`;
      this.codeText = parsed.ok ? window.JsonDocument.format(parsed.raw, 2) : source;
      if (parsed.ok) this.tree.render(parsed.data);
      else this.tree.renderRawText(source, parsed.empty ? 'No JSON loaded' : 'Source needs fixing');
      document.getElementById('querySourceMeta').textContent = `From Editor · Read only · ${new TextEncoder().encode(source).length.toLocaleString()} B`;
      this.refreshPath();
      this.find();
    }

    pathExpression() {
      let path = this.getEngine() === 'jsonpath' ? '$' : '';
      for (const segment of this.selectedPath || []) {
        if (typeof segment === 'number') path += `[${segment}]`;
        else if (this.getEngine() === 'jsonpath') path += /^[A-Za-z_$][\w$]*$/.test(segment) ? `.${segment}` : `[${JSON.stringify(segment)}]`;
        else path += `${path ? '.' : ''}${/^[A-Za-z_][\w]*$/.test(segment) ? segment : JSON.stringify(segment)}`;
      }
      return path || '@';
    }

    refreshPath() {
      this.pathBar.hidden = !this.valid || this.preferences.mode !== 'tree';
      this.pathLabel.textContent = this.selectedPath ? this.pathExpression() : 'Select a field to use its path';
      this.pathLabel.title = this.pathLabel.textContent;
      document.getElementById('queryUsePath').disabled = !this.selectedPath;
    }

    selectLine(line) {
      if (!this.valid) return;
      try {
        this.selectedPath = JSON.parse(line.dataset.treePath);
        this.treeHost.querySelector('.query-selected-path')?.classList.remove('query-selected-path');
        line.classList.add('query-selected-path');
        this.refreshPath();
      } catch { /* Ignore non-document rows. */ }
    }

    findIfChanged() { if (this.lastSearch !== this.search.value) this.find(); }

    find() {
      this.lastSearch = this.search.value;
      const needle = this.lastSearch.trim();
      if (this.preferences.mode === 'tree') {
        const result = needle ? this.tree.search(needle) : this.tree.clearSearch();
        this.updateCount(result.activeIndex, result.total, needle);
        return;
      }
      this.codeMatches = [];
      this.codeMatchIndex = -1;
      this.code.textContent = this.codeText;
      if (needle) {
        const text = this.codeText.toLowerCase();
        let offset = 0, start;
        while ((start = text.indexOf(needle.toLowerCase(), offset)) !== -1 && this.codeMatches.length < 2000) {
          this.codeMatches.push(start);
          offset = start + needle.length;
        }
        const fragment = document.createDocumentFragment();
        offset = 0;
        this.codeMatches.forEach(start => {
          fragment.append(document.createTextNode(this.codeText.slice(offset, start)));
          const mark = document.createElement('mark');
          mark.textContent = this.codeText.slice(start, start + needle.length);
          fragment.append(mark);
          offset = start + needle.length;
        });
        fragment.append(document.createTextNode(this.codeText.slice(offset)));
        this.code.replaceChildren(fragment);
        if (this.codeMatches.length) this.codeMatchIndex = 0;
        this.revealCodeMatch();
      } else if (this.valid && this.codeText.length <= 500000 && window.Prism) {
        window.Prism.highlightElement(this.code);
      }
      this.updateCount(this.codeMatchIndex, this.codeMatches.length, needle);
    }

    moveMatch(direction) {
      if (this.preferences.mode === 'tree') {
        const result = direction < 0 ? this.tree.searchPrev() : this.tree.searchNext();
        if (result) this.updateCount(result.activeIndex, result.total, this.search.value.trim());
      } else if (this.codeMatches.length) {
        this.codeMatchIndex = (this.codeMatchIndex + direction + this.codeMatches.length) % this.codeMatches.length;
        this.revealCodeMatch();
        this.updateCount(this.codeMatchIndex, this.codeMatches.length, this.search.value.trim());
      }
    }

    revealCodeMatch() {
      const marks = this.code.querySelectorAll('mark');
      marks.forEach((mark, index) => mark.classList.toggle('active-match', index === this.codeMatchIndex));
      marks[this.codeMatchIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    updateCount(index, total, needle) {
      this.count.textContent = needle ? `${index < 0 ? 0 : index + 1}/${total}${total >= 2000 ? '+' : ''}` : '';
      document.getElementById('querySourceSearchPrev').disabled = !total;
      document.getElementById('querySourceSearchNext').disabled = !total;
    }
  }

  window.QueryWorkspace = QueryWorkspace;
})();
