/**
 * JSON Studio - Developer Utilities
 * - JWT Token Decoder
 * - Base64 JSON Encoder / Decoder
 * - String Escape / Unescape
 * - JSON Schema Generator & Draft-07 Validator
 * - JSON Metrics & Statistics Analyzer
 */

(function () {
  'use strict';

  // ─── 1. JWT Decoder ─────────────────────────────────────────────────────────

  function decodeJwt(token) {
    if (!token || typeof token !== 'string') {
      return { success: false, error: 'Please enter a JWT token.' };
    }

    const parts = token.trim().split('.');
    if (parts.length < 2 || parts.length > 3) {
      return { success: false, error: 'Invalid JWT format. Must contain 2 or 3 dot-separated segments.' };
    }

    try {
      const headerRaw = base64UrlDecode(parts[0]);
      const payloadRaw = base64UrlDecode(parts[1]);

      const header = window.JsonDocument.parse(headerRaw);
      const payload = window.JsonDocument.parse(payloadRaw);

      let isExpired = null;
      let expiresAt = null;
      let issuedAt = null;

      function numericDate(value) {
        const date = new Date(Number(String(value)) * 1000);
        return Number.isFinite(date.getTime())
          ? date.toISOString() + ` (${date.toLocaleString()})`
          : `${String(value)} Unix seconds (outside the supported date range)`;
      }
      if (typeof payload.exp === 'number' || window.JsonDocument.isExactNumber(payload.exp)) {
        expiresAt = numericDate(payload.exp);
        isExpired = window.JsonDocument.compareNumbers(payload.exp, Date.now() / 1000) <= 0;
      }
      if (typeof payload.iat === 'number' || window.JsonDocument.isExactNumber(payload.iat)) {
        issuedAt = numericDate(payload.iat);
      }

      return {
        success: true,
        header,
        payload,
        signature: parts[2] || '',
        meta: {
          isExpired,
          hasExpiry: Object.prototype.hasOwnProperty.call(payload, 'exp'),
          expiresAt,
          issuedAt,
        },
      };
    } catch (err) {
      return { success: false, error: 'Failed to decode JWT: ' + err.message };
    }
  }

  function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  // ─── 2. Base64 JSON ─────────────────────────────────────────────────────────

  function encodeBase64(text) {
    try {
      const bytes = new TextEncoder().encode(text);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return { success: true, result: btoa(binary) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function decodeBase64(base64Str) {
    try {
      const binary = atob(base64Str.trim());
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoded = new TextDecoder().decode(bytes);
      // Try parsing as JSON for pretty output
      try {
        const parsed = window.JsonDocument.parse(decoded);
        return { success: true, result: JSON.stringify(parsed, null, 2), parsed };
      } catch {
        return { success: true, result: decoded, isJson: false };
      }
    } catch (err) {
      return { success: false, error: 'Invalid Base64 string: ' + err.message };
    }
  }

  // ─── 3. Escape / Unescape ───────────────────────────────────────────────────

  function escapeJsonString(text) {
    if (typeof text !== 'string') text = JSON.stringify(text);
    return JSON.stringify(text);
  }

  function unescapeJsonString(text) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();

    // If it is wrapped in double quotes as a JSON string literal
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        return window.JsonDocument.parse(trimmed);
      } catch {
        // Fallback below
      }
    }

    // If not wrapped in quotes or parse failed, try parsing with quotes
    try {
      return window.JsonDocument.parse(`"${trimmed.replace(/"/g, '\\"')}"`);
    } catch {
      return trimmed
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }
  }

  // ─── 4. JSON Schema Generator & Validator ───────────────────────────────────

  function generateSchema(value, title = 'RootSchema') {
    function infer(val) {
      if (window.JsonDocument.isExactNumber(val)) {
        const power = BigInt(window.JsonDocument.canonicalNumber(String(val)).split('e')[1]);
        return { type: power >= 0n ? 'integer' : 'number' };
      }
      if (val === null) return { type: 'null' };
      if (Array.isArray(val)) {
        const variants = [...new Map(val.map(item => {
          const schema = infer(item);
          return [JSON.stringify(schema), schema];
        })).values()];
        return { type: 'array', ...(variants.length ? { items: variants.length === 1 ? variants[0] : { anyOf: variants } } : {}) };
      }
      if (typeof val === 'object') {
        return {
          type: 'object',
          properties: Object.fromEntries(Object.entries(val).map(([key, item]) => [key, infer(item)])),
          required: Object.keys(val),
        };
      }
      return { type: typeof val === 'number' && Number.isInteger(val) ? 'integer' : typeof val };
    }
    return JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', title, ...infer(value) }, null, 2);
  }

  function validateAgainstSchema(data, schema) {
    try {
      if (!window.JsonSchema) throw new Error('The local schema validator is unavailable.');
      if (window.JsonDocument.containsExactNumber(data) || window.JsonDocument.containsExactNumber(schema)) {
        throw new Error('Cannot safely validate numbers beyond JavaScript precision. The original numeric values are preserved; no validation result has been inferred.');
      }
      if (schema && typeof schema === 'object' && schema.$schema && !/^https?:\/\/json-schema\.org\/draft-07\/schema#?$/.test(schema.$schema)) {
        throw new Error('Choose a Draft-07 schema. Other schema drafts are not supported by this workspace yet.');
      }
      const { Validator, draft7Meta } = window.JsonSchema;
      // The library resolves references on schema objects; never mutate user input.
      const copy = JSON.parse(JSON.stringify(schema));
      const schemaCheck = new Validator(draft7Meta, '7', false).validate(copy);
      if (!schemaCheck.valid) {
        return { valid: false, supported: false, errors: schemaCheck.errors.map(error => `Schema ${error.instanceLocation}: ${error.error}`) };
      }
      const result = new Validator(copy, '7', false).validate(data);
      return { valid: result.valid, supported: true, errors: result.errors.map(error => `At ${error.instanceLocation}: ${error.error}`) };
    } catch (error) {
      return { valid: false, supported: false, errors: [error.message] };
    }
  }

  // ─── 5. JSON Statistics & Analyzer ──────────────────────────────────────────

  function computeStats(val, rawText = '') {
    const stats = {
      byteSize: rawText ? new TextEncoder().encode(rawText).length : 0,
      totalNodes: 0,
      maxDepth: 0,
      totalKeys: 0,
      types: {
        string: 0,
        number: 0,
        boolean: 0,
        null: 0,
        object: 0,
        array: 0,
      },
    };

    const stack = [{ node: val, depth: 0 }];
    while (stack.length) {
      const { node, depth } = stack.pop();
      stats.totalNodes++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      const type = node === null ? 'null' : window.JsonDocument.isExactNumber(node) ? 'number' : Array.isArray(node) ? 'array' : typeof node;
      if (type in stats.types) stats.types[type]++;
      if (type === 'object' || type === 'array') {
        if (type === 'object') stats.totalKeys += Object.keys(node).length;
        for (const item of Object.values(node)) stack.push({ node: item, depth: depth + 1 });
      }
    }
    return stats;
  }

  window.JsonUtils = {
    decodeJwt,
    encodeBase64,
    decodeBase64,
    escapeJsonString,
    unescapeJsonString,
    generateSchema,
    validateAgainstSchema,
    computeStats,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.JsonUtils;
  }
})();
