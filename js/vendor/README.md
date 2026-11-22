`schema-validator.js` bundles `@cfworker/json-schema` 4.1.1 (MIT) and the
official JSON Schema Draft-07 meta-schema from
https://json-schema.org/draft-07/schema.

Upstream: https://github.com/cfworker/cfworker/tree/main/packages/json-schema
License: `schema-validator.LICENSE`.

Rebuild from the repository root:

    npm ci
    npm run build:validator

The checked-in bundle runs locally without `eval`, code generation, runtime
downloads, or a build step when loading the unpacked extension. Remote schema
references are not fetched. Unresolved references and other schema drafts are
reported as unavailable rather than successful validation.
