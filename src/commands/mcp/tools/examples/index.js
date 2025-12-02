"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIND_EXAMPLE_TOOL = void 0;
const tool_registry_1 = require("../tool-registry");
const database_1 = require("./database");
const database_discovery_1 = require("./database-discovery");
const runtime_database_1 = require("./runtime-database");
const schemas_1 = require("./schemas");
const utils_1 = require("./utils");
exports.FIND_EXAMPLE_TOOL = (0, tool_registry_1.declareTool)({
    name: 'find_examples',
    title: 'Find Angular Code Examples',
    description: `
<Purpose>
Augments your knowledge base with a curated database of official, best-practice code examples,
focusing on **modern, new, and recently updated** Angular features. This tool acts as a RAG
(Retrieval-Augmented Generation) source, providing ground-truth information on the latest Angular
APIs and patterns. You **MUST** use it to understand and apply current standards when working with
new or evolving features.
</Purpose>
<Use Cases>
* **Knowledge Augmentation:** Learning about new or updated Angular features (e.g., query: 'signal input' or 'deferrable views').
* **Modern Implementation:** Finding the correct modern syntax for features
  (e.g., query: 'functional route guard' or 'http client with fetch').
* **Refactoring to Modern Patterns:** Upgrading older code by finding examples of new syntax
  (e.g., query: 'built-in control flow' to replace "*ngIf").
* **Advanced Filtering:** Combining a full-text search with filters to narrow results.
  (e.g., query: 'forms', required_packages: ['@angular/forms'], keywords: ['validation'])
</Use Cases>
<Operational Notes>
* **Project-Specific Use (Recommended):** For tasks inside a user's project, you **MUST** provide the
  \`workspacePath\` argument to get examples that match the project's Angular version. Get this
  path from \`list_projects\`.
* **General Use:** If no project context is available (e.g., for general questions or learning),
  you can call the tool without the \`workspacePath\` argument. It will return the latest
  generic examples.
* **Tool Selection:** This database primarily contains examples for new and recently updated Angular
  features. For established, core features, the main documentation (via the
  \`search_documentation\` tool) may be a better source of information.
* The examples in this database are the single source of truth for modern Angular coding patterns.
* The search query uses a powerful full-text search syntax (FTS5). Refer to the 'query'
  parameter description for detailed syntax rules and examples.
* You can combine the main 'query' with optional filters like 'keywords', 'required_packages',
  and 'related_concepts' to create highly specific searches.
</Operational Notes>`,
    inputSchema: schemas_1.findExampleInputSchema.shape,
    outputSchema: schemas_1.findExampleOutputSchema.shape,
    isReadOnly: true,
    isLocalOnly: true,
    shouldRegister: ({ logger }) => {
        // sqlite database support requires Node.js 22.16+
        const [nodeMajor, nodeMinor] = process.versions.node.split('.', 2).map(Number);
        if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 16)) {
            logger.warn(`MCP tool 'find_examples' requires Node.js 22.16 (or higher). ` +
                ' Registration of this tool has been skipped.');
            return false;
        }
        return true;
    },
    factory: createFindExampleHandler,
});
async function createFindExampleHandler({ logger, exampleDatabasePath, host }) {
    const runtimeDb = process.env['NG_MCP_EXAMPLES_DIR']
        ? await (0, runtime_database_1.setupRuntimeExamples)(process.env['NG_MCP_EXAMPLES_DIR'], host)
        : undefined;
    (0, utils_1.suppressSqliteWarning)();
    return async (input) => {
        // If the dev-time override is present, use it and bypass all other logic.
        if (runtimeDb) {
            return (0, database_1.queryDatabase)([runtimeDb], input);
        }
        const resolvedDbs = [];
        // First, try to get all available version-specific guides.
        if (input.workspacePath) {
            const versionSpecificDbs = await (0, database_discovery_1.getVersionSpecificExampleDatabases)(input.workspacePath, logger, host);
            for (const db of versionSpecificDbs) {
                resolvedDbs.push({ path: db.dbPath, source: db.source });
            }
        }
        // If no version-specific guides were found for any reason, fall back to the bundled version.
        if (resolvedDbs.length === 0 && exampleDatabasePath) {
            resolvedDbs.push({ path: exampleDatabasePath, source: 'bundled' });
        }
        if (resolvedDbs.length === 0) {
            // This should be prevented by the registration logic in mcp-server.ts
            throw new Error('No example databases are available.');
        }
        const { DatabaseSync } = await Promise.resolve().then(() => __importStar(require('node:sqlite')));
        const dbConnections = [];
        for (const { path, source } of resolvedDbs) {
            const db = new DatabaseSync(path, { readOnly: true });
            try {
                (0, database_1.validateDatabaseSchema)(db, source);
                dbConnections.push(db);
            }
            catch (e) {
                logger.warn(e.message);
                // If a database is invalid, we should not query it, but we should not fail the whole tool.
                // We will just skip this database and try to use the others.
                continue;
            }
        }
        if (dbConnections.length === 0) {
            throw new Error('All available example databases were invalid. Cannot perform query.');
        }
        return (0, database_1.queryDatabase)(dbConnections, input);
    };
}
//# sourceMappingURL=index.js.map