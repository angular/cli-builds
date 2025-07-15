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
exports.registerDocSearchTool = registerDocSearchTool;
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const constants_1 = require("../constants");
const ALGOLIA_APP_ID = 'L1XWT2UJ7F';
// https://www.algolia.com/doc/guides/security/api-keys/#search-only-api-key
// This is a search only, rate limited key. It is sent within the URL of the query request.
// This is not the actual key.
const ALGOLIA_API_E = '322d89dab5f2080fe09b795c93413c6a89222b13a447cdf3e6486d692717bc0c';
/**
 * Registers a tool with the MCP server to search the Angular documentation.
 *
 * This tool uses Algolia to search the official Angular documentation.
 *
 * @param server The MCP server instance with which to register the tool.
 */
async function registerDocSearchTool(server) {
    let client;
    server.registerTool('search_documentation', {
        title: 'Search Angular Documentation (angular.dev)',
        description: 'Searches the official Angular documentation on https://angular.dev.' +
            ' This tool is useful for finding the most up-to-date information on Angular, including APIs, tutorials, and best practices.' +
            ' Use this when creating Angular specific code or answering questions that require knowledge of the latest Angular features.',
        annotations: {
            readOnlyHint: true,
        },
        inputSchema: {
            query: zod_1.z
                .string()
                .describe('The search query to use when searching the Angular documentation.' +
                ' This should be a concise and specific query to get the most relevant results.'),
        },
    }, async ({ query }) => {
        if (!client) {
            const dcip = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', (constants_1.k1 + ALGOLIA_APP_ID).padEnd(32, '^'), constants_1.iv).setAuthTag(Buffer.from(constants_1.at, 'base64'));
            const { searchClient } = await Promise.resolve().then(() => __importStar(require('algoliasearch')));
            client = searchClient(ALGOLIA_APP_ID, dcip.update(ALGOLIA_API_E, 'hex', 'utf-8') + dcip.final('utf-8'));
        }
        const { results } = await client.search(createSearchArguments(query));
        // Convert results into text content entries instead of stringifying the entire object
        const content = results.flatMap((result) => result.hits.map((hit) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hierarchy = Object.values(hit.hierarchy).filter((x) => typeof x === 'string');
            const title = hierarchy.pop();
            const description = hierarchy.join(' > ');
            return {
                type: 'text',
                text: `## ${title}\n${description}\nURL: ${hit.url}`,
            };
        }));
        return { content };
    });
}
/**
 * Creates the search arguments for an Algolia search.
 *
 * The arguments are based on the search implementation in `adev`.
 *
 * @param query The search query string.
 * @returns The search arguments for the Algolia client.
 */
function createSearchArguments(query) {
    // Search arguments are based on adev's search service:
    // https://github.com/angular/angular/blob/4b614fbb3263d344dbb1b18fff24cb09c5a7582d/adev/shared-docs/services/search.service.ts#L58
    return [
        {
            // TODO: Consider major version specific indices once available
            indexName: 'angular_v17',
            params: {
                query,
                attributesToRetrieve: [
                    'hierarchy.lvl0',
                    'hierarchy.lvl1',
                    'hierarchy.lvl2',
                    'hierarchy.lvl3',
                    'hierarchy.lvl4',
                    'hierarchy.lvl5',
                    'hierarchy.lvl6',
                    'content',
                    'type',
                    'url',
                ],
                hitsPerPage: 10,
            },
            type: 'default',
        },
    ];
}
