(function () {
  'use strict';

  const MAX_DIFF_CHARS = 500_000;
  const MAX_LCS_LINES = 3000;

  // ─── Diff computation ────────────────────────────────────────────────────────

  function typeOf(v) {
    if (window.JsonDocument?.isExactNumber(v)) return 'number';
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  function computeDiff(a, b, key, depth) {
    depth = depth || 0;
    const ta = typeOf(a);
    const tb = typeOf(b);

    if (ta !== tb) {
      return { status: 'changed', key, depth, oldValue: a, newValue: b, children: null };
    }

    if (ta === 'object') {
      const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
      const children = [];
      let hasChange = false;

      for (const k of allKeys) {
        const inA = Object.prototype.hasOwnProperty.call(a, k);
        const inB = Object.prototype.hasOwnProperty.call(b, k);

        if (inA && !inB) {
          children.push({ status: 'removed', key: k, depth: depth + 1, oldValue: a[k], newValue: undefined, children: null });
          hasChange = true;
        } else if (!inA && inB) {
          children.push({ status: 'added', key: k, depth: depth + 1, oldValue: undefined, newValue: b[k], children: null });
          hasChange = true;
        } else {
          const child = computeDiff(a[k], b[k], k, depth + 1);
          children.push(child);
          if (child.status !== 'unchanged') hasChange = true;
        }
      }

      return { status: hasChange ? 'changed' : 'unchanged', key, depth, oldValue: a, newValue: b, children };
    }

    if (ta === 'array') {
      const len = Math.max(a.length, b.length);
      const children = [];
      let hasChange = false;

      for (let i = 0; i < len; i++) {
        if (i >= a.length) {
          children.push({ status: 'added', key: i, depth: depth + 1, oldValue: undefined, newValue: b[i], children: null });
          hasChange = true;
        } else if (i >= b.length) {
          children.push({ status: 'removed', key: i, depth: depth + 1, oldValue: a[i], newValue: undefined, children: null });
          hasChange = true;
        } else {
          const child = computeDiff(a[i], b[i], i, depth + 1);
          children.push(child);
          if (child.status !== 'unchanged') hasChange = true;
        }
      }

      return { status: hasChange ? 'changed' : 'unchanged', key, depth, oldValue: a, newValue: b, children };
    }

    // primitives
    if (a === b || (ta === 'number' && window.JsonDocument?.numericEquals(a, b))) {
      return { status: 'unchanged', key, depth, oldValue: a, newValue: b, children: null };
    }
    return { status: 'changed', key, depth, oldValue: a, newValue: b, children: null };
  }

  function summarize(node) {
    const counts = { added: 0, removed: 0, changed: 0 };
    const stack = [node];
    while (stack.length) {
      const n = stack.pop();
      if (!n) continue;
      if (n.status === 'added') counts.added++;
      else if (n.status === 'removed') counts.removed++;
      else if (n.status === 'changed' && !n.children) counts.changed++;
      if (n.children) {
        for (const c of n.children) stack.push(c);
      }
    }
    return counts;
  }

  // ─── Tree diff renderer ───────────────────────────────────────────────────────

  function valueLabel(v) {
    if (window.JsonDocument?.isExactNumber(v)) return String(v);
    if (v === null) return 'null';
    if (typeof v === 'string') return `"${v}"`;
    if (typeof v === 'object') return Array.isArray(v) ? `[${v.length} items]` : `{${Object.keys(v).length} keys}`;
    return String(v);
  }

  function renderTreeDiff(container, node) {
    container.innerHTML = '';

    function renderNode(n, parentEl) {
      const line = document.createElement('div');
      line.className = `tree-line diff-${n.status}`;
      line.style.setProperty('--tree-depth', n.depth);

      const keySpan = document.createElement('span');
      keySpan.className = 'tree-key';
      if (n.key !== undefined && n.key !== null) {
        keySpan.textContent = typeof n.key === 'number' ? `[${n.key}]` : `"${n.key}"`;
      }

      const sep = document.createElement('span');
      sep.className = 'tree-colon';
      sep.textContent = n.key !== undefined && n.key !== null ? ': ' : '';

      const valSpan = document.createElement('span');

      if (n.children) {
        valSpan.className = 'tree-brace';
        const isArr = Array.isArray(n.newValue !== undefined ? n.newValue : n.oldValue);
        valSpan.textContent = isArr ? '[…]' : '{…}';
      } else if (n.status === 'changed') {
        valSpan.className = 'diff-change-inline';
        const oldEl = document.createElement('span');
        oldEl.className = 'diff-old-val';
        oldEl.textContent = valueLabel(n.oldValue);
        const arrow = document.createElement('span');
        arrow.className = 'diff-arrow';
        arrow.textContent = ' → ';
        const newEl = document.createElement('span');
        newEl.className = 'diff-new-val';
        newEl.textContent = valueLabel(n.newValue);
        valSpan.appendChild(oldEl);
        valSpan.appendChild(arrow);
        valSpan.appendChild(newEl);
      } else if (n.status === 'added') {
        valSpan.className = 'diff-new-val';
        valSpan.textContent = valueLabel(n.newValue);
      } else if (n.status === 'removed') {
        valSpan.className = 'diff-old-val';
        valSpan.textContent = valueLabel(n.oldValue);
      } else {
        const v = n.newValue !== undefined ? n.newValue : n.oldValue;
        const t = typeOf(v);
        valSpan.className = `tree-value-${t}`;
        valSpan.textContent = valueLabel(v);
      }

      if (n.key !== undefined && n.key !== null) line.appendChild(keySpan);
      if (n.key !== undefined && n.key !== null) line.appendChild(sep);
      line.appendChild(valSpan);
      parentEl.appendChild(line);

      if (n.children) {
        const childWrap = document.createElement('div');
        childWrap.className = 'tree-children';
        for (const child of n.children) {
          renderNode(child, childWrap);
        }
        parentEl.appendChild(childWrap);
      }
    }

    if (!node) {
      const empty = document.createElement('div');
      empty.className = 'tree-empty';
      empty.textContent = 'No diff to display.';
      container.appendChild(empty);
      return;
    }

    if (node.status === 'unchanged' && !node.children) {
      const empty = document.createElement('div');
      empty.className = 'tree-empty diff-equal-msg';
      empty.textContent = 'The two JSON documents are identical.';
      container.appendChild(empty);
      return;
    }

    // For the root object/array, skip its own line and just show children
    if (node.children) {
      for (const child of node.children) {
        renderNode(child, container);
      }
    } else {
      renderNode(node, container);
    }
  }

  // ─── Side-by-side line diff ──────────────────────────────────────────────────

  // Simple LCS-based line diff. Bails gracefully when inputs are too large.
  function lcs(aLines, bLines) {
    const m = aLines.length;
    const n = bLines.length;

    // O(m*n) — bail for very large inputs to protect performance
    if (m * n > MAX_LCS_LINES * MAX_LCS_LINES) {
      return null; // signal fallback
    }

    const dp = new Uint32Array((m + 1) * (n + 1));
    const width = n + 1;

    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (aLines[i] === bLines[j]) {
          dp[i * width + j] = dp[(i + 1) * width + (j + 1)] + 1;
        } else {
          const down = dp[(i + 1) * width + j];
          const right = dp[i * width + (j + 1)];
          dp[i * width + j] = down > right ? down : right;
        }
      }
    }

    // Backtrack
    const common = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (aLines[i] === bLines[j]) {
        common.push([i, j]);
        i++; j++;
      } else if (dp[(i + 1) * width + j] >= dp[i * width + (j + 1)]) {
        i++;
      } else {
        j++;
      }
    }
    return common;
  }

  function computeLineDiff(prettyA, prettyB) {
    const aLines = prettyA.split('\n');
    const bLines = prettyB.split('\n');

    if ((prettyA.length + prettyB.length) > MAX_DIFF_CHARS * 2) {
      return { rows: null, tooLarge: true };
    }

    const common = lcs(aLines, bLines);
    if (!common) {
      return { rows: null, tooLarge: true };
    }

    const rows = [];
    let ai = 0, bi = 0, ci = 0;

    while (ci < common.length) {
      const [ca, cb] = common[ci];

      // Drain removed lines from A
      while (ai < ca) {
        rows.push({ left: aLines[ai], right: null, status: 'removed' });
        ai++;
      }
      // Drain added lines from B
      while (bi < cb) {
        rows.push({ left: null, right: bLines[bi], status: 'added' });
        bi++;
      }
      // Matching line
      rows.push({ left: aLines[ai], right: bLines[bi], status: 'unchanged' });
      ai++; bi++; ci++;
    }

    // Remaining lines after last common
    while (ai < aLines.length) {
      rows.push({ left: aLines[ai], right: null, status: 'removed' });
      ai++;
    }
    while (bi < bLines.length) {
      rows.push({ left: null, right: bLines[bi], status: 'added' });
      bi++;
    }

    return { rows, tooLarge: false };
  }

  function renderSideBySide(container, prettyA, prettyB) {
    container.innerHTML = '';

    const result = computeLineDiff(prettyA, prettyB);

    if (result.tooLarge) {
      const msg = document.createElement('div');
      msg.className = 'tree-empty';
      msg.textContent = 'Inputs too large for side-by-side diff.';
      container.appendChild(msg);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'compare-side-by-side';

    for (const row of result.rows) {
      const left = document.createElement('div');
      left.className = `compare-cell compare-cell-left diff-${row.status}`;
      left.textContent = row.left !== null ? row.left : '';
      if (row.left === null) left.classList.add('diff-empty');

      const right = document.createElement('div');
      right.className = `compare-cell compare-cell-right diff-${row.status}`;
      right.textContent = row.right !== null ? row.right : '';
      if (row.right === null) right.classList.add('diff-empty');

      grid.appendChild(left);
      grid.appendChild(right);
    }

    container.appendChild(grid);
  }

  // ─── Export ──────────────────────────────────────────────────────────────────

  window.JsonDiff = {
    computeDiff,
    summarize,
    renderTreeDiff,
    computeLineDiff,
    renderSideBySide,
    MAX_DIFF_CHARS,
  };
})();
