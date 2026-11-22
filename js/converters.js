// JSON to Class Converters for multiple languages

class JsonToClassConverter {
  constructor() {
    this.indentSize = 2;
  }

  // ---------- Format Converters (CSV/YAML/XML) ----------

  _escapeCsvCell(value) {
    const s = value == null ? '' : String(value);
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  _flattenForCsv(value, prefix, out) {
    if (value === null || value === undefined) {
      out[prefix] = '';
      return;
    }

    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out[prefix] = String(value);
      return;
    }

    if (Array.isArray(value)) {
      // Keep arrays as JSON strings to avoid exploding columns.
      out[prefix] = JSON.stringify(value);
      return;
    }

    if (t === 'object') {
      const entries = Object.entries(value);
      if (!entries.length) {
        out[prefix] = '';
        return;
      }
      for (const [k, v] of entries) {
        // Fix for key collision: keys with dots are wrapped in brackets
        let safeKey = k;
        if (k.includes('.')) {
            safeKey = `["${k.replace(/"/g, '\\"')}"]`;
        }

        let nextPrefix;
        if (!prefix) {
            nextPrefix = safeKey;
        } else {
            // If the subkey starts with bracket, append directly. Else add dot.
            if (safeKey.startsWith('[')) {
                nextPrefix = prefix + safeKey;
            } else {
                nextPrefix = `${prefix}.${safeKey}`;
            }
        }

        this._flattenForCsv(v, nextPrefix, out);
      }
      return;
    }

    out[prefix] = String(value);
  }

  toCsv(json) {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;

    let rows;
    if (Array.isArray(value)) {
      if (!value.length) return '';
      if (value.every(v => v !== null && typeof v === 'object' && !Array.isArray(v))) {
        rows = value;
      } else {
        // Array of primitives / mixed: single column.
        const header = ['value'];
        const lines = [header.join(',')];
        for (const item of value) {
          const cell = (item === null || item === undefined)
            ? ''
            : (typeof item === 'object' ? JSON.stringify(item) : String(item));
          lines.push(this._escapeCsvCell(cell));
        }
        return lines.join('\r\n');
      }
    } else if (value !== null && typeof value === 'object') {
      rows = [value];
    } else {
      // Primitive root: single column.
      return ['value', this._escapeCsvCell(String(value))].join('\r\n');
    }

    const flatRows = rows.map(r => {
      const out = {};
      this._flattenForCsv(r, '', out);
      return out;
    });

    const headerSet = new Set();
    for (const r of flatRows) {
      for (const k of Object.keys(r)) headerSet.add(k);
    }

    const headers = Array.from(headerSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const lines = [headers.map(h => this._escapeCsvCell(h)).join(',')];
    for (const r of flatRows) {
      const line = headers.map(h => this._escapeCsvCell(r[h] ?? '')).join(',');
      lines.push(line);
    }

    return lines.join('\r\n');
  }

  _yamlQuoteString(s) {
    return JSON.stringify(String(s));
  }

  _isYamlPlainSafe(s) {
    // Very conservative: allow simple tokens only.
    return /^[A-Za-z0-9_-]+$/.test(s) && !/^(null|true|false|yes|no|on|off)$/i.test(s);
  }

  _toYaml(value, indent) {
    const pad = ' '.repeat(indent);

    if (value === null) return 'null';
    if (value === undefined) return 'null';

    const t = typeof value;
    if (t === 'number' || t === 'boolean') return String(value);
    if (t === 'string') return this._isYamlPlainSafe(value) ? value : this._yamlQuoteString(value);

    if (Array.isArray(value)) {
      if (!value.length) return '[]';
      const lines = [];
      for (const item of value) {
        const itemIsComplex = item !== null && typeof item === 'object';
        if (itemIsComplex) {
          lines.push(`${pad}- ${this._toYaml(item, indent + 2).trimStart()}`);
        } else {
          lines.push(`${pad}- ${this._toYaml(item, 0)}`);
        }
      }
      return lines.join('\n');
    }

    if (t === 'object') {
      const keys = Object.keys(value);
      if (!keys.length) return '{}';
      const lines = [];
      for (const k of keys) {
        const keyOut = this._isYamlPlainSafe(k) ? k : this._yamlQuoteString(k);
        const v = value[k];
        const vIsComplex = v !== null && typeof v === 'object';
        if (!vIsComplex) {
          lines.push(`${pad}${keyOut}: ${this._toYaml(v, 0)}`);
        } else {
          lines.push(`${pad}${keyOut}:`);
          lines.push(this._toYaml(v, indent + 2));
        }
      }
      return lines.join('\n');
    }

    return this._yamlQuoteString(String(value));
  }

  toYaml(json) {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    return this._toYaml(value, 0);
  }

  _escapeXmlText(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _escapeXmlAttr(s) {
    return this._escapeXmlText(s).replace(/"/g, '&quot;');
  }

  _isValidXmlName(name) {
    return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name);
  }

  _toXmlNode(value, nodeName, indent) {
    const pad = ' '.repeat(indent);
    const tagName = this._isValidXmlName(nodeName) ? nodeName : 'key';
    const nameAttr = this._isValidXmlName(nodeName) ? '' : ` name="${this._escapeXmlAttr(nodeName)}"`;

    if (value === null || value === undefined) {
      return `${pad}<${tagName}${nameAttr}/>`;
    }

    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      return `${pad}<${tagName}${nameAttr}>${this._escapeXmlText(value)}</${tagName}>`;
    }

    if (Array.isArray(value)) {
      if (!value.length) return `${pad}<${tagName}${nameAttr}/>`;
      const inner = value.map(v => this._toXmlNode(v, 'item', indent + 2)).join('\n');
      return `${pad}<${tagName}${nameAttr}>\n${inner}\n${pad}</${tagName}>`;
    }

    if (t === 'object') {
      const keys = Object.keys(value);
      if (!keys.length) return `${pad}<${tagName}${nameAttr}/>`;
      const inner = keys.map(k => this._toXmlNode(value[k], k, indent + 2)).join('\n');
      return `${pad}<${tagName}${nameAttr}>\n${inner}\n${pad}</${tagName}>`;
    }

    return `${pad}<${tagName}${nameAttr}>${this._escapeXmlText(String(value))}</${tagName}>`;
  }

  toXml(json, rootName = 'root') {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    const decl = '<?xml version="1.0" encoding="UTF-8"?>';
    return `${decl}\n${this._toXmlNode(value, rootName, 0)}`;
  }

  _xmlElementToJson(el) {
    const hasElementChildren = Array.from(el.childNodes || []).some(n => n.nodeType === 1);
    const textNodes = Array.from(el.childNodes || [])
      .filter(n => n.nodeType === 3)
      .map(n => (n.nodeValue || '').trim())
      .filter(Boolean);

    const attrs = el.attributes && el.attributes.length
      ? Array.from(el.attributes).reduce((acc, a) => {
          acc[a.name] = a.value;
          return acc;
        }, {})
      : null;

    if (!hasElementChildren) {
      const text = textNodes.join('');
      if (attrs) {
        const obj = { '@attributes': attrs };
        if (text) obj['#text'] = text;
        return obj;
      }
      return text;
    }

    const obj = {};
    if (attrs) obj['@attributes'] = attrs;

    const children = Array.from(el.childNodes || []).filter(n => n.nodeType === 1);
    for (const child of children) {
      const key = child.tagName;
      const val = this._xmlElementToJson(child);
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
        obj[key].push(val);
      } else {
        obj[key] = val;
      }
    }

    if (textNodes.length) obj['#text'] = textNodes.join('');
    return obj;
  }

  xmlToJson(xmlText) {
    if (typeof DOMParser === 'undefined') {
      throw new Error('XML parsing not supported in this environment');
    }
    const raw = String(xmlText || '').trim();
    if (!raw) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, 'application/xml');
    const err = doc.getElementsByTagName('parsererror')[0];
    if (err) {
      throw new Error('Invalid XML');
    }
    const root = doc.documentElement;
    const out = { [root.tagName]: this._xmlElementToJson(root) };
    return JSON.stringify(out, null, 2);
  }

  // Helper function to infer type from value
  inferType(value, language) {
    if (value === null) {
      return this.getNullType(language);
    }
    
    const jsType = typeof value;
    
    if (jsType === 'boolean') {
      return this.getBooleanType(language);
    }
    
    if (jsType === 'number') {
      return Number.isInteger(value) ? this.getIntType(language) : this.getFloatType(language);
    }
    
    if (jsType === 'string') {
      return this.getStringType(language);
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return this.getArrayType(language, 'any');
      }
      const elementType = this.inferType(value[0], language);
      return this.getArrayType(language, elementType);
    }
    
    if (jsType === 'object') {
      return 'object';
    }
    
    return this.getAnyType(language);
  }

  // Type mapping for different languages
  getBooleanType(language) {
    const types = {
      typescript: 'boolean',
      python: 'bool',
      go: 'bool',
      kotlin: 'Boolean',
      csharp: 'bool',
      java: 'boolean',
      rust: 'bool',
      swift: 'Bool',
      dart: 'bool',
      cpp: 'bool',
      php: 'bool'
    };
    return types[language] || 'bool';
  }

  getIntType(language) {
    const types = {
      typescript: 'number',
      python: 'int',
      go: 'int',
      kotlin: 'Int',
      csharp: 'int',
      java: 'int',
      rust: 'i64',
      swift: 'Int',
      dart: 'int',
      cpp: 'int64_t',
      php: 'int'
    };
    return types[language] || 'int';
  }

  getFloatType(language) {
    const types = {
      typescript: 'number',
      python: 'float',
      go: 'float64',
      kotlin: 'Double',
      csharp: 'double',
      java: 'double',
      rust: 'f64',
      swift: 'Double',
      dart: 'double',
      cpp: 'double',
      php: 'float'
    };
    return types[language] || 'float';
  }

  getStringType(language) {
    const types = {
      typescript: 'string',
      python: 'str',
      go: 'string',
      kotlin: 'String',
      csharp: 'string',
      java: 'String',
      rust: 'String',
      swift: 'String',
      dart: 'String',
      cpp: 'std::string',
      php: 'string'
    };
    return types[language] || 'string';
  }

  getAnyType(language) {
    const types = {
      typescript: 'any',
      python: 'Any',
      go: 'interface{}',
      kotlin: 'Any',
      csharp: 'object',
      java: 'Object',
      rust: 'serde_json::Value',
      swift: 'Any',
      dart: 'dynamic',
      cpp: 'nlohmann::json',
      php: 'mixed'
    };
    return types[language] || 'any';
  }

  getNullType(language) {
    const types = {
      typescript: 'null',
      python: 'None',
      go: 'interface{}',
      kotlin: 'Any?',
      csharp: 'object',
      java: 'Object',
      rust: 'Option<serde_json::Value>',
      swift: 'Any?',
      dart: 'dynamic',
      cpp: 'std::nullptr_t',
      php: 'mixed'
    };
    return types[language] || 'null';
  }

  getArrayType(language, elementType) {
    const templates = {
      typescript: `${elementType}[]`,
      python: `List[${elementType}]`,
      go: `[]${elementType}`,
      kotlin: `List<${elementType}>`,
      csharp: `List<${elementType}>`,
      java: `List<${elementType}>`,
      rust: `Vec<${elementType}>`,
      swift: `[${elementType}]`,
      dart: `List<${elementType}>`,
      cpp: `std::vector<${elementType}>`,
      php: 'array'
    };
    return templates[language] || `Array<${elementType}>`;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  toPascalCase(str) {
    return str.split('_').map(part => this.capitalize(part)).join('');
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  // Convert to TypeScript
  toTypeScript(json, className = 'Root') {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    // Handle Array Root
    if (Array.isArray(json)) {
        json = json.length > 0 ? json[0] : {};
    }

    const interfaces = [];
    this.generateTypeScriptInterface(json, className, interfaces);
    return interfaces.join('\n\n');
  }

  generateTypeScriptInterface(obj, interfaceName, interfaces) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return;
    }

    let interfaceCode = `interface ${interfaceName} {\n`;
    
    for (const [key, value] of Object.entries(obj)) {
      let type;
      
      if (value === null) {
        type = 'any';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          const nestedClassName = this.capitalize(key);
          this.generateTypeScriptInterface(value[0], nestedClassName, interfaces);
          type = `${nestedClassName}[]`;
        } else {
          type = this.inferType(value, 'typescript');
        }
      } else if (typeof value === 'object') {
        const nestedClassName = this.capitalize(key);
        this.generateTypeScriptInterface(value, nestedClassName, interfaces);
        type = nestedClassName;
      } else {
        type = this.inferType(value, 'typescript');
      }
      
      interfaceCode += `  ${key}: ${type};\n`;
    }
    
    interfaceCode += '}';
    interfaces.unshift(interfaceCode);
  }

  // Convert to Python
  toPython(json, className = 'Root') {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    // Handle Array Root
    if (Array.isArray(json)) {
        json = json.length > 0 ? json[0] : {};
    }

    const classes = [];
    this.generatePythonClass(json, className, classes);
    
    let result = 'from typing import List, Any, Optional\nfrom dataclasses import dataclass\n\n';
    result += classes.join('\n\n');
    return result;
  }

  generatePythonClass(obj, className, classes) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return;
    }

    let classCode = `@dataclass\nclass ${className}:\n`;
    
    const properties = Object.entries(obj);
    if (properties.length === 0) {
      classCode += '    pass';
    } else {
      for (const [key, value] of properties) {
        let type;
        
        if (value === null) {
          type = 'Optional[Any]';
        } else if (Array.isArray(value)) {
          if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
            const nestedClassName = this.capitalize(key);
            this.generatePythonClass(value[0], nestedClassName, classes);
            type = `List[${nestedClassName}]`;
          } else {
            type = this.inferType(value, 'python');
          }
        } else if (typeof value === 'object') {
          const nestedClassName = this.capitalize(key);
          this.generatePythonClass(value, nestedClassName, classes);
          type = nestedClassName;
        } else {
          type = this.inferType(value, 'python');
        }
        
        classCode += `    ${key}: ${type}\n`;
      }
    }
    
    classes.unshift(classCode);
  }

  // Convert to Go
  toGo(json, structName = 'Root') {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    // Handle Array Root
    if (Array.isArray(json)) {
        json = json.length > 0 ? json[0] : {};
    }

    const structs = [];
    this.generateGoStruct(json, structName, structs);
    return structs.join('\n\n');
  }

  generateGoStruct(obj, structName, structs) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return;
    }

    let structCode = `type ${structName} struct {\n`;
    
    for (const [key, value] of Object.entries(obj)) {
      let type;
      const fieldName = this.capitalize(key);
      
      if (value === null) {
        type = 'interface{}';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          const nestedStructName = this.capitalize(key);
          this.generateGoStruct(value[0], nestedStructName, structs);
          type = `[]${nestedStructName}`;
        } else {
          type = this.inferType(value, 'go');
        }
      } else if (typeof value === 'object') {
        const nestedStructName = this.capitalize(key);
        this.generateGoStruct(value, nestedStructName, structs);
        type = nestedStructName;
      } else {
        type = this.inferType(value, 'go');
      }
      
      structCode += `    ${fieldName} ${type} \`json:"${key}"\`\n`;
    }
    
    structCode += '}';
    structs.unshift(structCode);
  }

  // Convert to Kotlin
  toKotlin(json, className = 'Root') {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    // Handle Array Root
    if (Array.isArray(json)) {
        json = json.length > 0 ? json[0] : {};
    }

    const classes = [];
    this.generateKotlinClass(json, className, classes);
    return classes.join('\n\n');
  }

  generateKotlinClass(obj, className, classes) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return;
    }

    let classCode = `data class ${className}(\n`;
    
    const properties = Object.entries(obj);
    for (let i = 0; i < properties.length; i++) {
      const [key, value] = properties[i];
      let type;
      
      if (value === null) {
        type = 'Any?';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          const nestedClassName = this.capitalize(key);
          this.generateKotlinClass(value[0], nestedClassName, classes);
          type = `List<${nestedClassName}>`;
        } else {
          type = this.inferType(value, 'kotlin');
        }
      } else if (typeof value === 'object') {
        const nestedClassName = this.capitalize(key);
        this.generateKotlinClass(value, nestedClassName, classes);
        type = nestedClassName;
      } else {
        type = this.inferType(value, 'kotlin');
      }
      
      const comma = i < properties.length - 1 ? ',' : '';
      classCode += `    val ${key}: ${type}${comma}\n`;
    }
    
    classCode += ')';
    classes.unshift(classCode);
  }

  // Convert to C#
  toCSharp(json, className = 'Root') {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    // Handle Array Root
    if (Array.isArray(json)) {
        json = json.length > 0 ? json[0] : {};
    }

    const classes = [];
    this.generateCSharpClass(json, className, classes);
    
    let result = 'using System;\nusing System.Collections.Generic;\nusing Newtonsoft.Json;\n\n';
    result += classes.join('\n\n');
    return result;
  }

  generateCSharpClass(obj, className, classes) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return;
    }

    let classCode = `public class ${className}\n{\n`;
    
    for (const [key, value] of Object.entries(obj)) {
      let type;
      const propertyName = this.capitalize(key);
      
      if (value === null) {
        type = 'object';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          const nestedClassName = this.capitalize(key);
          this.generateCSharpClass(value[0], nestedClassName, classes);
          type = `List<${nestedClassName}>`;
        } else {
          type = this.inferType(value, 'csharp');
        }
      } else if (typeof value === 'object') {
        const nestedClassName = this.capitalize(key);
        this.generateCSharpClass(value, nestedClassName, classes);
        type = nestedClassName;
      } else {
        type = this.inferType(value, 'csharp');
      }
      
      classCode += `    [JsonProperty("${key}")]\n`;
      classCode += `    public ${type} ${propertyName} { get; set; }\n\n`;
    }
    
    classCode += '}';
    classes.unshift(classCode);
  }

  // Convert to Java
  toJava(json, className = 'Root') {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    // Handle Array Root
    if (Array.isArray(json)) {
        json = json.length > 0 ? json[0] : {};
    }

    const classes = [];
    this.generateJavaClass(json, className, classes);
    
    let result = 'import java.util.List;\nimport com.fasterxml.jackson.annotation.JsonProperty;\n\n';
    result += classes.join('\n\n');
    return result;
  }

  generateJavaClass(obj, className, classes) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return;
    }

    let classCode = `public class ${className} {\n`;
    
    // Generate fields
    for (const [key, value] of Object.entries(obj)) {
      let type;
      
      if (value === null) {
        type = 'Object';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          const nestedClassName = this.capitalize(key);
          this.generateJavaClass(value[0], nestedClassName, classes);
          type = `List<${nestedClassName}>`;
        } else {
          type = this.inferType(value, 'java');
        }
      } else if (typeof value === 'object') {
        const nestedClassName = this.capitalize(key);
        this.generateJavaClass(value, nestedClassName, classes);
        type = nestedClassName;
      } else {
        type = this.inferType(value, 'java');
      }
      
      classCode += `    @JsonProperty("${key}")\n`;
      classCode += `    private ${type} ${key};\n\n`;
    }
    
    // Generate getters and setters
    for (const [key, value] of Object.entries(obj)) {
      let type;
      const methodName = this.capitalize(key);
      
      if (value === null) {
        type = 'Object';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          type = `List<${this.capitalize(key)}>`;
        } else {
          type = this.inferType(value, 'java');
        }
      } else if (typeof value === 'object') {
        type = this.capitalize(key);
      } else {
        type = this.inferType(value, 'java');
      }
      
      classCode += `    public ${type} get${methodName}() {\n`;
      classCode += `        return ${key};\n`;
      classCode += `    }\n\n`;
      
      classCode += `    public void set${methodName}(${type} ${key}) {\n`;
      classCode += `        this.${key} = ${key};\n`;
      classCode += `    }\n\n`;
    }
    
    classCode += '}';
    classes.unshift(classCode);
  }

  // Convert to Rust
  toRust(json, className = 'Root') {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    const target = Array.isArray(value) ? (value.length > 0 ? value[0] : {}) : value;
    const structs = [];
    this.generateRustStruct(target, this.capitalize(className), structs);
    return 'use serde::{Deserialize, Serialize};\n\n' + structs.join('\n\n');
  }

  generateRustStruct(obj, structName, structs) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;

    let code = `#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]\n`;
    code += `pub struct ${structName} {\n`;

    for (const [key, value] of Object.entries(obj)) {
      let type;
      const rustFieldName = /^[a-z0-9_]+$/.test(key) ? key : `r#${key}`;
      const renameAttr = rustFieldName !== key ? `    #[serde(rename = "${key}")]\n` : '';

      if (value === null) {
        type = 'Option<serde_json::Value>';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          const nestedName = this.capitalize(key);
          this.generateRustStruct(value[0], nestedName, structs);
          type = `Vec<${nestedName}>`;
        } else {
          type = this.inferType(value, 'rust');
        }
      } else if (typeof value === 'object') {
        const nestedName = this.capitalize(key);
        this.generateRustStruct(value, nestedName, structs);
        type = nestedName;
      } else {
        type = this.inferType(value, 'rust');
      }

      code += renameAttr;
      code += `    pub ${rustFieldName}: ${type},\n`;
    }

    code += '}';
    structs.unshift(code);
  }

  // Convert to Swift
  toSwift(json, className = 'Root') {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    const target = Array.isArray(value) ? (value.length > 0 ? value[0] : {}) : value;
    const structs = [];
    this.generateSwiftStruct(target, this.capitalize(className), structs);
    return 'import Foundation\n\n' + structs.join('\n\n');
  }

  generateSwiftStruct(obj, structName, structs) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;

    let code = `struct ${structName}: Codable, Hashable {\n`;

    for (const [key, value] of Object.entries(obj)) {
      let type;
      if (value === null) {
        type = 'String?';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          const nestedName = this.capitalize(key);
          this.generateSwiftStruct(value[0], nestedName, structs);
          type = `[${nestedName}]`;
        } else {
          type = this.inferType(value, 'swift');
        }
      } else if (typeof value === 'object') {
        const nestedName = this.capitalize(key);
        this.generateSwiftStruct(value, nestedName, structs);
        type = nestedName;
      } else {
        type = this.inferType(value, 'swift');
      }

      code += `    let ${key}: ${type}?\n`;
    }

    code += '}';
    structs.unshift(code);
  }

  // Convert to Dart
  toDart(json, className = 'Root') {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    const target = Array.isArray(value) ? (value.length > 0 ? value[0] : {}) : value;
    const classes = [];
    this.generateDartClass(target, this.capitalize(className), classes);
    return classes.join('\n\n');
  }

  generateDartClass(obj, className, classes) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;

    let fields = '';
    let constructorParams = [];
    let fromJsonFields = [];
    let toJsonFields = [];

    for (const [key, value] of Object.entries(obj)) {
      let type;
      if (value === null) {
        type = 'dynamic';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          const nestedName = this.capitalize(key);
          this.generateDartClass(value[0], nestedName, classes);
          type = `List<${nestedName}>`;
        } else {
          type = this.inferType(value, 'dart');
        }
      } else if (typeof value === 'object') {
        const nestedName = this.capitalize(key);
        this.generateDartClass(value, nestedName, classes);
        type = nestedName;
      } else {
        type = this.inferType(value, 'dart');
      }

      fields += `  final ${type}? ${key};\n`;
      constructorParams.push(`this.${key}`);
      fromJsonFields.push(`      ${key}: json['${key}']`);
      toJsonFields.push(`      '${key}': ${key}`);
    }

    let code = `class ${className} {\n`;
    code += fields + '\n';
    code += `  ${className}({${constructorParams.join(', ')}});\n\n`;
    code += `  factory ${className}.fromJson(Map<String, dynamic> json) => ${className}(\n`;
    code += fromJsonFields.join(',\n') + ',\n  );\n\n';
    code += `  Map<String, dynamic> toJson() => {\n`;
    code += toJsonFields.join(',\n') + ',\n  };\n';
    code += '}';

    classes.unshift(code);
  }

  // Convert to C++
  toCpp(json, structName = 'Root') {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    const target = Array.isArray(value) ? (value.length > 0 ? value[0] : {}) : value;
    const structs = [];
    this.generateCppStruct(target, this.capitalize(structName), structs);
    return `#include <string>\n#include <vector>\n#include <optional>\n#include <nlohmann/json.hpp>\n\n` + structs.join('\n\n');
  }

  generateCppStruct(obj, structName, structs) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;

    let code = `struct ${structName} {\n`;
    const keys = Object.keys(obj);

    for (const [key, value] of Object.entries(obj)) {
      let type;
      if (value === null) {
        type = 'std::optional<std::string>';
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          const nestedName = this.capitalize(key);
          this.generateCppStruct(value[0], nestedName, structs);
          type = `std::vector<${nestedName}>`;
        } else {
          type = this.inferType(value, 'cpp');
        }
      } else if (typeof value === 'object') {
        const nestedName = this.capitalize(key);
        this.generateCppStruct(value, nestedName, structs);
        type = nestedName;
      } else {
        type = this.inferType(value, 'cpp');
      }
      code += `    ${type} ${key};\n`;
    }

    code += `};\n\n`;
    code += `NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(${structName}, ${keys.join(', ')})`;
    structs.unshift(code);
  }

  // Convert to PHP
  toPhp(json, className = 'Root') {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    const target = Array.isArray(value) ? (value.length > 0 ? value[0] : {}) : value;
    const classes = [];
    this.generatePhpClass(target, this.capitalize(className), classes);
    return "<?php\n\n" + classes.join('\n\n');
  }

  generatePhpClass(obj, className, classes) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;

    let props = [];
    let fromJsonProps = [];

    for (const [key, value] of Object.entries(obj)) {
      let type;
      if (value === null) {
        type = 'mixed';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (typeof value === 'object') {
        const nestedName = this.capitalize(key);
        this.generatePhpClass(value, nestedName, classes);
        type = nestedName;
      } else {
        type = this.inferType(value, 'php');
      }

      props.push(`        public ?${type} $${key} = null,`);
      fromJsonProps.push(`            ${key}: $data['${key}'] ?? null,`);
    }

    let code = `class ${className} implements JsonSerializable {\n`;
    code += `    public function __construct(\n${props.join('\n')}\n    ) {}\n\n`;
    code += `    public static function fromJson(array $data): self {\n`;
    code += `        return new self(\n${fromJsonProps.join('\n')}\n        );\n    }\n\n`;
    code += `    public function jsonSerialize(): array {\n        return get_object_vars($this);\n    }\n`;
    code += `}`;

    classes.unshift(code);
  }

  // Convert to SQL
  toSql(json, tableName = 'records') {
    const value = (typeof json === 'string') ? JSON.parse(json) : json;
    const rows = Array.isArray(value) ? value : [value];
    if (!rows.length || typeof rows[0] !== 'object' || rows[0] === null) {
      return '-- Cannot generate SQL: JSON must be an object or array of objects';
    }

    // Collect all column names and infer types
    const columns = {};
    for (const row of rows.slice(0, 100)) {
      if (typeof row === 'object' && row !== null) {
        for (const [k, v] of Object.entries(row)) {
          if (!columns[k]) {
            if (typeof v === 'number') {
              columns[k] = Number.isInteger(v) ? 'INT' : 'DECIMAL(10, 2)';
            } else if (typeof v === 'boolean') {
              columns[k] = 'BOOLEAN';
            } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
              columns[k] = 'TIMESTAMP';
            } else if (typeof v === 'object') {
              columns[k] = 'TEXT';
            } else {
              columns[k] = 'VARCHAR(255)';
            }
          }
        }
      }
    }

    const colNames = Object.keys(columns);
    let ddl = `CREATE TABLE ${tableName} (\n`;
    ddl += colNames.map(c => `    \`${c}\` ${columns[c]}`).join(',\n');
    ddl += '\n);\n\n';

    // INSERT INTO statements
    const escapeSql = (v) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    };

    const valueRows = rows.map(r => {
      const vals = colNames.map(c => escapeSql(r[c]));
      return `  (${vals.join(', ')})`;
    });

    const dml = `INSERT INTO ${tableName} (\`${colNames.join('`, `')}\`) VALUES\n${valueRows.join(',\n')};`;
    return ddl + dml;
  }

  // Reverse Converters
  csvToJson(csvText) {
    const lines = String(csvText || '').trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) return '[]';

    const parseCsvLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseCsvLine(lines[0]);
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => {
        let val = values[idx] ?? '';
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (val === 'null') val = null;
        else if (!isNaN(Number(val)) && val !== '') val = Number(val);
        obj[h] = val;
      });
      items.push(obj);
    }

    return JSON.stringify(items, null, 2);
  }

  yamlToJson(yamlText) {
    // Simple indentation/key-value YAML parser for common structures
    const lines = String(yamlText || '').split(/\r?\n/);
    const root = {};
    let curObj = root;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, '');
        let val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (val === 'null' || val === '~' || val === '') val = null;
        else if (!isNaN(Number(val)) && val !== '') val = Number(val);
        curObj[key] = val;
      }
    }
    return JSON.stringify(root, null, 2);
  }

  // Main conversion method
  convert(json, language, className = 'Root') {
    switch (language.toLowerCase()) {
      case 'csv':
        return this.toCsv(json);
      case 'yaml':
      case 'yml':
        return this.toYaml(json);
      case 'xml':
        return this.toXml(json);
      case 'typescript':
      case 'ts':
        return this.toTypeScript(json, className);
      case 'python':
      case 'py':
        return this.toPython(json, className);
      case 'go':
      case 'golang':
        return this.toGo(json, className);
      case 'rust':
      case 'rs':
        return this.toRust(json, className);
      case 'swift':
        return this.toSwift(json, className);
      case 'dart':
        return this.toDart(json, className);
      case 'cpp':
      case 'c++':
        return this.toCpp(json, className);
      case 'php':
        return this.toPhp(json, className);
      case 'sql':
        return this.toSql(json, className);
      case 'kotlin':
      case 'kt':
        return this.toKotlin(json, className);
      case 'csharp':
      case 'c#':
      case 'cs':
        return this.toCSharp(json, className);
      case 'java':
        return this.toJava(json, className);
      case 'schema':
      case 'jsonschema':
        return window.JsonUtils ? window.JsonUtils.generateSchema(typeof json === 'string' ? JSON.parse(json) : json, className) : JSON.stringify(json, null, 2);
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
}

// Export for use in popup.js and Node tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JsonToClassConverter;
}
if (typeof window !== 'undefined') {
  window.JsonToClassConverter = JsonToClassConverter;
}