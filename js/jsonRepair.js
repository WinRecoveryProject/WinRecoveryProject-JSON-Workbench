/**
 * JSON Studio - Smart JSON Repair & Normalizer
 * Fixes common malformed JSON issues:
 * - Trailing commas in objects and arrays
 * - Unquoted or single-quoted keys
 * - Single-quoted strings
 * - Python literals (True, False, None)
 * - JavaScript comments (// and /* *\/)
 * - Backtick template strings
 * - Special numbers (NaN, Infinity)
 * - Missing quotes on simple identifier values
 */

(function () {
  'use strict';

  function repairJson(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') {
      return { success: false, error: 'Input is empty' };
    }

    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { success: false, error: 'Input is empty' };
    }

    // First attempt standard parse: if already valid, return as is
    try {
      window.JsonDocument.parse(trimmed);
      return {
        success: true,
        repaired: trimmed,
        fixesCount: 0,
        notes: ['Input was already valid JSON.'],
      };
    } catch {
      // Proceed with repair pipeline
    }

    const fixes = [];
    let text = trimmed;

    // 1. Strip JavaScript comments (while respecting strings)
    const withoutComments = stripComments(text);
    if (withoutComments !== text) {
      fixes.push('Removed JavaScript comments (//, /* */)');
      text = withoutComments;
    }

    // 4. Tokenizer & state-machine based quote & comma normalizer
    try {
      const normalized = normalizeJsonStructure(text);
      if (normalized.text !== text) {
        fixes.push(...normalized.fixes);
        text = normalized.text;
      }

      // Check if it parses now
      const parsed = window.JsonDocument.parse(text);
      return {
        success: true,
        repaired: window.JsonDocument.format(text, 2),
        parsedData: parsed,
        fixesCount: fixes.length || 1,
        notes: fixes.length ? fixes : ['Repaired malformed structure'],
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Unable to automatically repair JSON',
        partialResult: text,
      };
    }
  }

  // Strip // and /* */ comments outside strings
  function stripComments(str) {
    let result = '';
    let inString = false;
    let stringQuote = '';
    let i = 0;
    const len = str.length;

    while (i < len) {
      const ch = str[i];
      const next = str[i + 1];

      if (inString) {
        result += ch;
        if (ch === '\\') {
          // Escaped character inside string
          if (i + 1 < len) {
            result += str[++i];
          }
        } else if (ch === stringQuote) {
          inString = false;
        }
        i++;
      } else {
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = true;
          stringQuote = ch;
          result += ch;
          i++;
        } else if (ch === '/' && next === '/') {
          // Line comment: skip until newline
          i += 2;
          while (i < len && str[i] !== '\n' && str[i] !== '\r') {
            i++;
          }
        } else if (ch === '/' && next === '*') {
          // Block comment: skip until */
          i += 2;
          while (i < len && !(str[i] === '*' && str[i + 1] === '/')) {
            i++;
          }
          i += 2; // skip */
          result += ' '; // A comment must not join two neighboring tokens.
        } else {
          result += ch;
          i++;
        }
      }
    }
    return result;
  }

  // State machine to fix quotes (single -> double), unquoted keys, and trailing commas
  function normalizeJsonStructure(input) {
    const fixes = [];
    let out = '';
    let i = 0;
    const len = input.length;

    while (i < len) {
      const ch = input[i];

      // Single-quoted or backtick strings -> double-quoted string
      if (ch === "'" || ch === '`') {
        const quoteChar = ch;
        let strContent = '';
        i++; // skip opening quote
        while (i < len) {
          const c = input[i];
          if (c === '\\') {
            if (i + 1 < len) {
              const escaped = input[i + 1];
              if (escaped === quoteChar) {
                strContent += quoteChar;
                i += 2;
                continue;
              } else if (escaped === '"') {
                strContent += '\\"';
                i += 2;
                continue;
              } else {
                strContent += '\\' + escaped;
                i += 2;
                continue;
              }
            }
          }
          if (c === quoteChar) {
            i++; // skip closing quote
            break;
          }
          if (c === '"') {
            strContent += '\\"';
          } else if (c === '\n') {
            strContent += '\\n';
          } else if (c === '\r') {
            strContent += '\\r';
          } else if (c === '\t') {
            strContent += '\\t';
          } else {
            strContent += c;
          }
          i++;
        }
        out += '"' + strContent + '"';
        fixes.push('Normalized single-quoted string to double quotes');
        continue;
      }

      // Normal double-quoted string: pass through safely
      if (ch === '"') {
        out += '"';
        i++;
        while (i < len) {
          const c = input[i];
          out += c;
          if (c === '\\') {
            if (i + 1 < len) {
              out += input[++i];
            }
          } else if (c === '"') {
            i++;
            break;
          }
          i++;
        }
        continue;
      }

      if (input.startsWith('-Infinity', i)) {
        out += 'null'; i += 9; fixes.push('Replaced NaN/Infinity with null'); continue;
      }
      // Consume complete numeric literals, including exponents, without conversion.
      if (ch === '-' || /[0-9]/.test(ch)) {
        const number = input.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (number) { out += number[0]; i += number[0].length; continue; }
      }

      // Identifier / unquoted key or value
      if (isIdentifierStart(ch)) {
        let ident = '';
        while (i < len && isIdentifierChar(input[i])) {
          ident += input[i];
          i++;
        }

        // Look ahead (skipping whitespace) to see if followed by ':'
        let peekIdx = i;
        while (peekIdx < len && /\s/.test(input[peekIdx])) {
          peekIdx++;
        }

        if (peekIdx < len && input[peekIdx] === ':') {
          // It's an unquoted key!
          out += '"' + ident + '"';
          fixes.push(`Quoted unquoted key "${ident}"`);
        } else if (['True', 'False', 'None'].includes(ident)) {
          out += { True: 'true', False: 'false', None: 'null' }[ident];
          fixes.push('Converted Python literal to JSON');
        } else if (ident === 'NaN' || ident === 'Infinity') {
          out += 'null';
          fixes.push('Replaced NaN/Infinity with null');
        } else if (ident === 'true' || ident === 'false' || ident === 'null') {
          out += ident;
        } else {
          // Unquoted string value?
          out += '"' + ident + '"';
          fixes.push(`Quoted unquoted value "${ident}"`);
        }
        continue;
      }

      // Trailing commas before '}' or ']'
      if (ch === ',') {
        let peekIdx = i + 1;
        while (peekIdx < len && /\s/.test(input[peekIdx])) {
          peekIdx++;
        }
        if (peekIdx < len && (input[peekIdx] === '}' || input[peekIdx] === ']')) {
          fixes.push('Removed trailing comma');
          i++; // skip this comma
          continue;
        }
      }

      out += ch;
      i++;
    }

    return { text: out, fixes: Array.from(new Set(fixes)) };
  }

  function isIdentifierStart(ch) {
    return /[a-zA-Z_$]/.test(ch);
  }

  function isIdentifierChar(ch) {
    return /[a-zA-Z0-9_$-]/.test(ch);
  }

  // Export to window
  window.JsonRepair = {
    repair: repairJson,
    stripComments,
  };
})();
