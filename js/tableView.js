/**
 * JSON Studio - Interactive Table View for JSON Data
 * Renders JSON arrays of objects into an interactive spreadsheet-like table
 * with sorting, filtering, row counting, and CSV/TSV export.
 */

(function () {
  'use strict';

  class TableView {
    constructor(options) {
      this.container = options.container;
      this.data = [];
      this.columns = [];
      this.sortColumn = null;
      this.sortDirection = 'asc';
      this.filterText = '';
      this.pageSize = options.pageSize || 100;
      this.currentPage = 1;

      if (!this.container) {
        throw new Error('TableView requires a container element');
      }
    }

    render(jsonData) {
      this.container.innerHTML = '';
      this.sortColumn = null;
      this.sortDirection = 'asc';
      this.filterText = '';
      this.currentPage = 1;

      if (!jsonData) {
        this._renderEmpty('No data to display in table view.');
        return;
      }

      let rows = [];
      if (Array.isArray(jsonData)) {
        rows = jsonData;
      } else if (typeof jsonData === 'object' && jsonData !== null && !window.JsonDocument?.isExactNumber(jsonData)) {
        // If it's a single object, wrap it in an array or check for array values
        const arrayProps = Object.keys(jsonData).filter(k => Array.isArray(jsonData[k]));
        if (arrayProps.length === 1 && jsonData[arrayProps[0]].length > 0) {
          rows = jsonData[arrayProps[0]];
        } else {
          rows = [jsonData];
        }
      } else {
        this._renderEmpty('Table view requires an array of objects or an object.');
        return;
      }

      // Filter out non-objects or format primitives
      this.data = rows.map((item, idx) => {
        if (item !== null && typeof item === 'object' && !window.JsonDocument?.isExactNumber(item)) {
          return item;
        }
        return { index: idx, value: item };
      });

      if (this.data.length === 0) {
        this._renderEmpty('The array is empty.');
        return;
      }

      // Collect all unique columns
      const colSet = new Set();
      for (const row of this.data) {
        if (typeof row === 'object' && row !== null) {
          for (const key of Object.keys(row)) {
            colSet.add(key);
          }
        }
      }

      this.columns = Array.from(colSet);
      if (this.columns.length === 0) {
        this._renderEmpty('No properties found to display as columns.');
        return;
      }

      this._buildUI();
    }

    _renderEmpty(msg) {
      const el = document.createElement('div');
      el.className = 'table-empty-state';
      el.textContent = msg;
      this.container.appendChild(el);
    }

    _buildUI() {
      this.container.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.className = 'table-view-wrapper';

      // Controls toolbar: Filter input + Row counts + Export buttons
      const toolbar = document.createElement('div');
      toolbar.className = 'table-view-toolbar';

      const searchWrap = document.createElement('div');
      searchWrap.className = 'table-search-wrap';
      searchWrap.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="table-search-input" placeholder="Filter rows..." autocomplete="off" spellcheck="false">
      `;

      const searchInput = searchWrap.querySelector('.table-search-input');
      searchInput.setAttribute('aria-label', 'Filter table rows');
      searchInput.addEventListener('input', (e) => {
        this.filterText = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this._renderTableBody();
      });

      const statsEl = document.createElement('div');
      statsEl.className = 'table-stats';
      statsEl.textContent = `${this.data.length} rows, ${this.columns.length} columns`;
      this.statsEl = statsEl;

      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'table-actions';
      actionsWrap.innerHTML = `
        <button class="table-action-btn export-csv" title="Export as CSV">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          CSV
        </button>
        <button class="table-action-btn export-tsv" title="Export as TSV (Excel)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          TSV
        </button>
      `;

      actionsWrap.querySelector('.export-csv').addEventListener('click', () => this._exportDelimited(','));
      actionsWrap.querySelector('.export-tsv').addEventListener('click', () => this._exportDelimited('\t'));

      toolbar.appendChild(searchWrap);
      toolbar.appendChild(statsEl);
      toolbar.appendChild(actionsWrap);
      wrapper.appendChild(toolbar);

      // Scrollable table container
      const tableScroll = document.createElement('div');
      tableScroll.className = 'table-scroll-container';

      const table = document.createElement('table');
      table.className = 'table-grid';

      // Header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');

      // Row index header
      const thIdx = document.createElement('th');
      thIdx.className = 'table-th-idx';
      thIdx.textContent = '#';
      headerRow.appendChild(thIdx);

      this.columns.forEach((col) => {
        const th = document.createElement('th');
        th.className = 'table-th';
        th.innerHTML = `
          <span class="th-title">${escapeHtml(col)}</span>
          <span class="th-sort-icon">↕</span>
        `;
        th.setAttribute('scope', 'col');
        th.setAttribute('aria-sort', 'none');
        th.tabIndex = 0;
        th.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this._handleSort(col, th); } });
        th.addEventListener('click', () => this._handleSort(col, th));
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Body
      const tbody = document.createElement('tbody');
      tbody.className = 'table-tbody';
      table.appendChild(tbody);
      this.tbody = tbody;

      tableScroll.appendChild(table);
      wrapper.appendChild(tableScroll);

      const pagination = document.createElement('div');
      pagination.className = 'table-pagination';
      pagination.innerHTML = '<button type="button" class="table-action-btn page-prev" aria-label="Previous table page">Previous</button><span class="page-info" role="status"></span><button type="button" class="table-action-btn page-next" aria-label="Next table page">Next</button>';
      this.pageInfo = pagination.querySelector('.page-info');
      this.prevPageBtn = pagination.querySelector('.page-prev');
      this.nextPageBtn = pagination.querySelector('.page-next');
      this.prevPageBtn.addEventListener('click', () => { this.currentPage--; this._renderTableBody(); tableScroll.scrollTop = 0; });
      this.nextPageBtn.addEventListener('click', () => { this.currentPage++; this._renderTableBody(); tableScroll.scrollTop = 0; });
      wrapper.appendChild(pagination);
      this.container.appendChild(wrapper);
      this._renderTableBody();
    }

    _handleSort(col, thEl) {
      if (this.sortColumn === col) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumn = col;
        this.sortDirection = 'asc';
      }

      this.currentPage = 1;
      // Update header indicators
      this.container.querySelectorAll('.table-th').forEach(th => {
        const icon = th.querySelector('.th-sort-icon');
        if (icon) icon.textContent = '↕';
        th.classList.remove('sorted-asc', 'sorted-desc');
        th.setAttribute('aria-sort', 'none');
      });

      thEl.setAttribute('aria-sort', this.sortDirection === 'asc' ? 'ascending' : 'descending');
      thEl.classList.add(this.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      const curIcon = thEl.querySelector('.th-sort-icon');
      if (curIcon) {
        curIcon.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
      }

      this._renderTableBody();
    }

    _getFilteredAndSortedRows() {
      let filtered = this.data;

      if (this.filterText) {
        filtered = filtered.filter(row => {
          if (!row) return false;
          return Object.values(row).some(v => {
            if (v === null || v === undefined) return false;
            return (typeof v === 'object' ? JSON.stringify(v) : String(v)).toLowerCase().includes(this.filterText);
          });
        });
      }

      if (this.sortColumn) {
        const col = this.sortColumn;
        const dir = this.sortDirection === 'asc' ? 1 : -1;
        filtered = [...filtered].sort((a, b) => {
          const va = a ? a[col] : undefined;
          const vb = b ? b[col] : undefined;

          if (va === vb || (va == null && vb == null)) return 0;
          if (va === undefined || va === null) return 1;
          if (vb === undefined || vb === null) return -1;

          if ((typeof va === 'number' || window.JsonDocument?.isExactNumber(va)) && (typeof vb === 'number' || window.JsonDocument?.isExactNumber(vb))) {
            return window.JsonDocument.compareNumbers(va, vb) * dir;
          }
          return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
        });
      }

      return filtered;
    }

    _renderTableBody() {
      if (!this.tbody) return;
      this.tbody.innerHTML = '';

      const rows = this._getFilteredAndSortedRows();

      const pageCount = Math.max(1, Math.ceil(rows.length / this.pageSize));
      this.currentPage = Math.max(1, Math.min(this.currentPage, pageCount));
      const start = (this.currentPage - 1) * this.pageSize;
      if (this.statsEl) this.statsEl.textContent = rows.length
        ? `${start + 1}–${Math.min(start + this.pageSize, rows.length)} of ${rows.length} matching rows (${this.data.length} total)`
        : `0 matching rows (${this.data.length} total)`;
      if (this.pageInfo) this.pageInfo.textContent = `Page ${this.currentPage} of ${pageCount}`;
      if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPage === 1;
      if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPage === pageCount;

      if (rows.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = this.columns.length + 1;
        td.className = 'table-no-results';
        td.textContent = 'No matching rows found.';
        tr.appendChild(td);
        this.tbody.appendChild(tr);
        return;
      }

      // Render one page; filtering, sorting and exports use the complete dataset.
      const renderRows = rows.slice(start, start + this.pageSize);
      renderRows.forEach((row, rowIdx) => {
        const tr = document.createElement('tr');
        tr.className = 'table-row';

        const tdIdx = document.createElement('td');
        tdIdx.className = 'table-cell-idx';
        tdIdx.textContent = String(start + rowIdx + 1);
        tr.appendChild(tdIdx);

        this.columns.forEach(col => {
          const td = document.createElement('td');
          td.className = 'table-cell';
          const val = row ? row[col] : undefined;
          this._formatCell(td, val);
          tr.appendChild(td);
        });

        this.tbody.appendChild(tr);
      });
    }

    _formatCell(td, val) {
      if (val === undefined) {
        td.className += ' cell-empty';
        td.textContent = '';
      } else if (val === null) {
        td.className += ' cell-null';
        td.textContent = 'null';
      } else if (typeof val === 'boolean') {
        td.className += ` cell-bool bool-${val}`;
        td.textContent = val ? 'true' : 'false';
      } else if (typeof val === 'number' || window.JsonDocument?.isExactNumber(val)) {
        td.className += ' cell-number';
        td.textContent = String(val);
      } else if (typeof val === 'object') {
        td.className += ' cell-object';
        td.textContent = JSON.stringify(val);
        td.title = JSON.stringify(val, null, 2);
      } else {
        td.className += ' cell-string';
        td.textContent = String(val);
        td.title = String(val);
      }
    }

    _exportDelimited(delimiter) {
      const rows = this._getFilteredAndSortedRows();
      if (!rows.length) return;

      const escapeCell = (v) => {
        const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
        if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter)) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const header = this.columns.map(escapeCell).join(delimiter);
      const lines = [header];

      for (const row of rows) {
        const line = this.columns.map(col => escapeCell(row ? row[col] : '')).join(delimiter);
        lines.push(line);
      }

      const content = lines.join('\r\n');
      const ext = delimiter === '\t' ? 'tsv' : 'csv';
      const mime = delimiter === '\t' ? 'text/tab-separated-values' : 'text/csv';

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.TableView = TableView;
})();
