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
exports.registerFindExampleTool = registerFindExampleTool;
exports.escapeSearchQuery = escapeSearchQuery;
const zod_1 = require("zod");
/**
 * Registers the `find_examples` tool with the MCP server.
 *
 * This tool allows users to search for best-practice Angular code examples
 * from a local SQLite database.
 *
 * @param server The MCP server instance.
 * @param exampleDatabasePath The path to the SQLite database file containing the examples.
 */
function registerFindExampleTool(server, exampleDatabasePath) {
    let db;
    let queryStatement;
    server.registerTool('find_examples', {
        title: 'Find Angular Code Examples',
        description: 'Before writing or modifying any Angular code including templates, ' +
            '**ALWAYS** use this tool to find current best-practice examples. ' +
            'This is critical for ensuring code quality and adherence to modern Angular standards. ' +
            'This tool searches a curated database of approved Angular code examples and returns the most relevant results for your query. ' +
            'Example Use Cases: ' +
            "1) Creating new components, directives, or services (e.g., query: 'standalone component' or 'signal input'). " +
            "2) Implementing core features (e.g., query: 'lazy load route', 'httpinterceptor', or 'route guard'). " +
            "3) Refactoring existing code to use modern patterns (e.g., query: 'ngfor trackby' or 'form validation').",
        inputSchema: {
            query: zod_1.z.string().describe(`Performs a full-text search using FTS5 syntax. The query should target relevant Angular concepts.

Key Syntax Features (see https://www.sqlite.org/fts5.html for full documentation):
  - AND (default): Space-separated terms are combined with AND.
    - Example: 'standalone component' (finds results with both "standalone" and "component")
  - OR: Use the OR operator to find results with either term.
    - Example: 'validation OR validator'
  - NOT: Use the NOT operator to exclude terms.
    - Example: 'forms NOT reactive'
  - Grouping: Use parentheses () to group expressions.
    - Example: '(validation OR validator) AND forms'
  - Phrase Search: Use double quotes "" for exact phrases.
    - Example: '"template-driven forms"'
  - Prefix Search: Use an asterisk * for prefix matching.
    - Example: 'rout*' (matches "route", "router", "routing")

Examples of queries:
  - Find standalone components: 'standalone component'
  - Find ngFor with trackBy: 'ngFor trackBy'
  - Find signal inputs: 'signal input'
  - Find lazy loading a route: 'lazy load route'
  - Find forms with validation: 'form AND (validation OR validator)'`),
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false,
        },
    }, async ({ query }) => {
        if (!db || !queryStatement) {
            suppressSqliteWarning();
            const { DatabaseSync } = await Promise.resolve().then(() => __importStar(require('node:sqlite')));
            db = new DatabaseSync(exampleDatabasePath, { readOnly: true });
            queryStatement = db.prepare('SELECT * from examples WHERE examples MATCH ? ORDER BY rank;');
        }
        const sanitizedQuery = escapeSearchQuery(query);
        // Query database and return results as text content
        const content = [];
        for (const exampleRecord of queryStatement.all(sanitizedQuery)) {
            content.push({ type: 'text', text: exampleRecord['content'] });
        }
        return {
            content,
        };
    });
}
/**
 * Escapes a search query for FTS5 by tokenizing and quoting terms.
 *
 * This function processes a raw search string and prepares it for an FTS5 full-text search.
 * It correctly handles quoted phrases, logical operators (AND, OR, NOT), parentheses,
 * and prefix searches (ending with an asterisk), ensuring that individual search
 * terms are properly quoted to be treated as literals by the search engine.
 * This is primarily intended to avoid unintentional usage of FTS5 query syntax by consumers.
 *
 * @param query The raw search query string.
 * @returns A sanitized query string suitable for FTS5.
 */
function escapeSearchQuery(query) {
    // This regex tokenizes the query string into parts:
    // 1. Quoted phrases (e.g., "foo bar")
    // 2. Parentheses ( and )
    // 3. FTS5 operators (AND, OR, NOT, NEAR)
    // 4. Words, which can include a trailing asterisk for prefix search (e.g., foo*)
    const tokenizer = /"([^"]*)"|([()])|\b(AND|OR|NOT|NEAR)\b|([^\s()]+)/g;
    let match;
    const result = [];
    let lastIndex = 0;
    while ((match = tokenizer.exec(query)) !== null) {
        // Add any whitespace or other characters between tokens
        if (match.index > lastIndex) {
            result.push(query.substring(lastIndex, match.index));
        }
        const [, quoted, parenthesis, operator, term] = match;
        if (quoted !== undefined) {
            // It's a quoted phrase, keep it as is.
            result.push(`"${quoted}"`);
        }
        else if (parenthesis) {
            // It's a parenthesis, keep it as is.
            result.push(parenthesis);
        }
        else if (operator) {
            // It's an operator, keep it as is.
            result.push(operator);
        }
        else if (term) {
            // It's a term that needs to be quoted.
            if (term.endsWith('*')) {
                result.push(`"${term.slice(0, -1)}"*`);
            }
            else {
                result.push(`"${term}"`);
            }
        }
        lastIndex = tokenizer.lastIndex;
    }
    // Add any remaining part of the string
    if (lastIndex < query.length) {
        result.push(query.substring(lastIndex));
    }
    return result.join('');
}
/**
 * Suppresses the experimental warning emitted by Node.js for the `node:sqlite` module.
 *
 * This is a workaround to prevent the console from being cluttered with warnings
 * about the experimental status of the SQLite module, which is used by this tool.
 */
function suppressSqliteWarning() {
    const originalProcessEmit = process.emit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.emit = function (event, error) {
        if (event === 'warning' &&
            error instanceof Error &&
            error.name === 'ExperimentalWarning' &&
            error.message.includes('SQLite')) {
            return false;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-rest-params
        return originalProcessEmit.apply(process, arguments);
    };
}
