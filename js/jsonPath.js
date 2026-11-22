/**
 * JSON Studio - Lightweight JSONPath Query Engine
 * Supports standard JSONPath expressions:
 * - $ (root)
 * - $.key or $['key'] (child)
 * - $..key (recursive descent)
 * - $[*] or $.* (wildcard)
 * - $[0], $[1, 2] (index / union)
 * - $[0:3] (slice)
 * - $[?(@.price < 10)] (filter expressions)
 */

(function () {
  'use strict';

  function jsonPath(obj, expr) {
    if (!expr || typeof expr !== 'string') return [];
    const normalized = expr.trim();
    if (!normalized.startsWith('$')) {
      // Auto-prefix $ if missing
      return jsonPath(obj, '$' + (normalized.startsWith('.') || normalized.startsWith('[') ? '' : '.') + normalized);
    }

    const results = [];

    function trace(curr, path, remaining) {
      if (!remaining || remaining === '') {
        results.push(curr);
        return;
      }

      if (curr === null || curr === undefined) {
        return;
      }

      // Recursive descent: ..
      if (remaining.startsWith('..')) {
        const nextPart = remaining.slice(2);
        // Match at current level
        trace(curr, path, nextPart);
        // Descend into all children
        if (typeof curr === 'object') {
          if (Array.isArray(curr)) {
            for (let i = 0; i < curr.length; i++) {
              trace(curr[i], path + `[${i}]`, remaining);
            }
          } else {
            for (const k of Object.keys(curr)) {
              trace(curr[k], path + `.${k}`, remaining);
            }
          }
        }
        return;
      }

      // Child step .key or .*
      if (remaining.startsWith('.')) {
        const afterDot = remaining.slice(1);
        // Find end of token
        const match = afterDot.match(/^([a-zA-Z0-9_$]+|\*)(.*)/);
        if (match) {
          const key = match[1];
          const rest = match[2];
          if (key === '*') {
            if (typeof curr === 'object') {
              const vals = Array.isArray(curr) ? curr : Object.values(curr);
              for (const v of vals) {
                trace(v, path + '.*', rest);
              }
            }
          } else if (typeof curr === 'object' && curr !== null && Object.prototype.hasOwnProperty.call(curr, key)) {
            trace(curr[key], path + '.' + key, rest);
          }
          return;
        }
      }

      // Bracket step [...]
      if (remaining.startsWith('[')) {
        const closeIdx = findMatchingBracket(remaining, 0);
        if (closeIdx === -1) return;

        const inside = remaining.slice(1, closeIdx).trim();
        const rest = remaining.slice(closeIdx + 1);

        // Wildcard [*]
        if (inside === '*') {
          if (Array.isArray(curr)) {
            for (let i = 0; i < curr.length; i++) {
              trace(curr[i], path + `[${i}]`, rest);
            }
          } else if (typeof curr === 'object' && curr !== null) {
            for (const k of Object.keys(curr)) {
              trace(curr[k], path + `[${k}]`, rest);
            }
          }
          return;
        }

        // Filter expression [?(@.price < 10)]
        if (inside.startsWith('?(') && inside.endsWith(')')) {
          const filterBody = inside.slice(2, -1).trim();
          if (Array.isArray(curr)) {
            for (let i = 0; i < curr.length; i++) {
              if (evaluateFilter(curr[i], filterBody)) {
                trace(curr[i], path + `[${i}]`, rest);
              }
            }
          } else if (typeof curr === 'object' && curr !== null) {
            if (evaluateFilter(curr, filterBody)) {
              trace(curr, path, rest);
            }
          }
          return;
        }

        // Quoted keys are decoded before checking for slices: a key can contain ':'.
        if (inside.startsWith("'") || inside.startsWith('"')) {
          const token = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y;
          let cursor = 0;
          while (cursor < inside.length) {
            token.lastIndex = cursor;
            const match = token.exec(inside);
            if (!match) throw new Error('Invalid quoted property in JSONPath.');
            const raw = match[0];
            const prop = raw[0] === '"' ? JSON.parse(raw)
              : JSON.parse('"' + raw.slice(1, -1).replace(/\\.|"/g, escape => escape === "\\'" ? "'" : escape === '"' ? '\\"' : escape) + '"');
            if (typeof curr === 'object' && curr !== null && Object.prototype.hasOwnProperty.call(curr, prop)) {
              trace(curr[prop], path + `[${JSON.stringify(prop)}]`, rest);
            }
            cursor = token.lastIndex;
            while (/\s/.test(inside[cursor] || '') && cursor < inside.length) cursor++;
            if (cursor === inside.length) break;
            if (inside[cursor++] !== ',') throw new Error('Separate JSONPath property names with commas.');
            while (/\s/.test(inside[cursor] || '') && cursor < inside.length) cursor++;
            if (cursor === inside.length) throw new Error('JSONPath property list cannot end with a comma.');
          }
          return;
        }

        // Array slice [start:end:step]
        if (inside.includes(':')) {
          if (!Array.isArray(curr)) return;
          const parts = inside.split(':').map(s => s.trim());
          const len = curr.length;
          let start = parts[0] ? parseInt(parts[0], 10) : 0;
          let end = parts[1] ? parseInt(parts[1], 10) : len;
          let step = parts[2] ? parseInt(parts[2], 10) : 1;

          if (start < 0) start = Math.max(0, len + start);
          if (end < 0) end = Math.max(0, len + end);
          if (step <= 0) step = 1;

          for (let i = start; i < Math.min(end, len); i += step) {
            trace(curr[i], path + `[${i}]`, rest);
          }
          return;
        }

        // Numeric index [0] or union [0, 1]
        const indices = inside.split(',').map(s => s.trim());
        for (const idxStr of indices) {
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx)) {
            if (Array.isArray(curr)) {
              const actualIdx = idx < 0 ? curr.length + idx : idx;
              if (actualIdx >= 0 && actualIdx < curr.length) {
                trace(curr[actualIdx], path + `[${actualIdx}]`, rest);
              }
            }
          } else if (typeof curr === 'object' && curr !== null && Object.prototype.hasOwnProperty.call(curr, idxStr)) {
            trace(curr[idxStr], path + `.${idxStr}`, rest);
          }
        }
        return;
      }
    }

    trace(obj, '$', normalized.slice(1));
    return results;
  }

  function findMatchingBracket(str, startIdx) {
    let depth = 0;
    let inQuote = false;
    let quoteChar = '';

    for (let i = startIdx; i < str.length; i++) {
      const ch = str[i];
      if (inQuote) {
        if (ch === '\\') i++;
        else if (ch === quoteChar) {
          inQuote = false;
        }
      } else {
        if (ch === "'" || ch === '"') {
          inQuote = true;
          quoteChar = ch;
        } else if (ch === '[') {
          depth++;
        } else if (ch === ']') {
          depth--;
          if (depth === 0) return i;
        }
      }
    }
    return -1;
  }

  function evaluateFilter(item, expr) {
    if (!item || typeof item !== 'object') return false;

    // Supports: @.prop op val, e.g. @.price < 10, @.name == 'Alice', @.inStock == true
    const match = expr.match(/^@\.([a-zA-Z0-9_$]+)\s*(==|!=|<=|>=|<|>|=)\s*(.+)$/);
    if (!match) {
      // Exists check: @.prop
      const existsMatch = expr.match(/^@\.([a-zA-Z0-9_$]+)$/);
      if (existsMatch) {
        const val = item[existsMatch[1]];
        return val !== undefined && val !== null && val !== false;
      }
      return false;
    }

    const prop = match[1];
    let op = match[2];
    if (op === '=') op = '==';
    let target = match[3].trim();

    const actual = item[prop];
    let parsedTarget = target;

    // Parse target primitive
    if (target === 'true') parsedTarget = true;
    else if (target === 'false') parsedTarget = false;
    else if (target === 'null') parsedTarget = null;
    else if (/^['"].*['"]$/.test(target)) parsedTarget = target.slice(1, -1);
    else if (!isNaN(Number(target))) parsedTarget = Number(target);

    switch (op) {
      case '==': return actual == parsedTarget;
      case '!=': return actual != parsedTarget;
      case '<': return actual < parsedTarget;
      case '<=': return actual <= parsedTarget;
      case '>': return actual > parsedTarget;
      case '>=': return actual >= parsedTarget;
      default: return false;
    }
  }

  window.JsonPath = {
    search: jsonPath,
  };
})();
