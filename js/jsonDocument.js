/* JSON document helpers. Exact numeric literals stay numeric when serialized. */
(function () {
  'use strict';

  function canonicalNumber(source) {
    const [mantissa, exponent = '0'] = String(source).toLowerCase().split('e');
    const negative = mantissa.startsWith('-');
    const unsigned = negative ? mantissa.slice(1) : mantissa;
    const [whole, fraction = ''] = unsigned.split('.');
    let digits = (whole + fraction).replace(/^0+/, '');
    if (!digits) return '0e0';
    let power = BigInt(exponent) - BigInt(fraction.length);
    while (digits.endsWith('0')) { digits = digits.slice(0, -1); power++; }
    return `${negative ? '-' : ''}${digits}e${power}`;
  }

  class ExactNumber {
    constructor(source) { this.source = source; Object.freeze(this); }
    get [Symbol.toStringTag]() { return 'ExactNumber'; }
    toString() { return this.source; }
    toJSON() { return JSON.rawJSON(this.source); }
    valueOf() { throw new Error('This number needs exact precision. Numeric operations are unavailable; formatting, viewing, copying and comparison preserve it.'); }
  }

  function isExactNumber(value) { return value instanceof ExactNumber; }

  function needsExactNumber(source) {
    const number = Number(source);
    return !Number.isFinite(number)
      || (Number.isInteger(number) && !Number.isSafeInteger(number))
      || canonicalNumber(source) !== canonicalNumber(String(number));
  }

  function parse(text) {
    // Source text access and rawJSON ship together in modern Chromium.
    if (typeof JSON.rawJSON !== 'function') {
      const tokens = String(text).match(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) || [];
      if (tokens.some(token => token[0] !== '"' && needsExactNumber(token))) {
        throw new Error('Update Chrome or Edge to preserve the precision of this document. Your original text has been kept.');
      }
    }
    return JSON.parse(text, (key, value, context) => {
      if (typeof value === 'number' && context?.source && needsExactNumber(context.source)) {
        return new ExactNumber(context.source);
      }
      return value;
    });
  }

  function containsExactNumber(value) {
    const stack = [value];
    while (stack.length) {
      const next = stack.pop();
      if (isExactNumber(next)) return true;
      if (next && typeof next === 'object') {
        for (const item of Object.values(next)) stack.push(item);
      }
    }
    return false;
  }

  function numericEquals(a, b) {
    return canonicalNumber(String(a)) === canonicalNumber(String(b));
  }

  function compareNumbers(a, b) {
    const left = canonicalNumber(String(a));
    const right = canonicalNumber(String(b));
    if (left === right) return 0;
    const [lc, le] = left.split('e');
    const [rc, re] = right.split('e');
    const ln = lc.startsWith('-'), rn = rc.startsWith('-');
    if (ln !== rn) return ln ? -1 : 1;
    const ld = lc.replace('-', ''), rd = rc.replace('-', '');
    if (ld === '0') return rn ? 1 : -1;
    if (rd === '0') return ln ? -1 : 1;
    const lm = BigInt(ld.length) + BigInt(le), rm = BigInt(rd.length) + BigInt(re);
    const width = Math.max(ld.length, rd.length);
    const order = lm !== rm ? (lm > rm ? 1 : -1) : (ld.padEnd(width, '0') > rd.padEnd(width, '0') ? 1 : -1);
    return ln ? -order : order;
  }

  // Format token text rather than converting numbers or dropping duplicate keys.
  function format(text, indentation = 2) {
    JSON.parse(text); // Native syntax diagnostics, without using its rounded values.
    const tokens = String(text).match(/"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/g);
    const indent = typeof indentation === 'number' ? ' '.repeat(Math.min(10, Math.max(0, indentation))) : String(indentation).slice(0, 10);
    if (!indent) return tokens.join('');
    let depth = 0;
    let result = '';
    tokens.forEach((token, index) => {
      const previous = tokens[index - 1];
      const next = tokens[index + 1];
      if (token === '{' || token === '[') {
        result += token;
        depth++;
        if (next !== '}' && next !== ']') result += '\n' + indent.repeat(depth);
      } else if (token === '}' || token === ']') {
        depth--;
        if (previous !== '{' && previous !== '[') result += '\n' + indent.repeat(depth);
        result += token;
      } else if (token === ',') result += ',\n' + indent.repeat(depth);
      else if (token === ':') result += ': ';
      else result += token;
    });
    return result;
  }

  class EditHistory {
    constructor(text = '', limit = 100) { this.states = [text]; this.index = 0; this.limit = limit; }
    record(text) {
      if (this.states[this.index] === text) return;
      this.states.splice(this.index + 1);
      this.states.push(text);
      if (this.states.length > this.limit) this.states.shift();
      this.index = this.states.length - 1;
    }
    get canUndo() { return this.index > 0; }
    get canRedo() { return this.index < this.states.length - 1; }
    undo() { if (this.canUndo) this.index--; return this.states[this.index]; }
    redo() { if (this.canRedo) this.index++; return this.states[this.index]; }
  }

  function normalizeQuery(query) {
    if (typeof query === 'string') return { expression: query, engine: query.trim().startsWith('$') ? 'jsonpath' : 'jmespath' };
    return { expression: String(query?.expression || ''), engine: query?.engine === 'jsonpath' ? 'jsonpath' : 'jmespath' };
  }

  window.JsonDocument = { parse, format, isExactNumber, containsExactNumber, numericEquals, compareNumbers, canonicalNumber, EditHistory, normalizeQuery };
})();
