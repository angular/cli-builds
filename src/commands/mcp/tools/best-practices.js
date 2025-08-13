"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BEST_PRACTICES_TOOL = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const tool_registry_1 = require("./tool-registry");
exports.BEST_PRACTICES_TOOL = (0, tool_registry_1.declareTool)({
    name: 'get_best_practices',
    title: 'Get Angular Coding Best Practices Guide',
    description: 'You **MUST** use this tool to retrieve the Angular Best Practices Guide ' +
        'before any interaction with Angular code (creating, analyzing, modifying). ' +
        'It is mandatory to follow this guide to ensure all code adheres to ' +
        'modern standards, including standalone components, typed forms, and ' +
        'modern control flow. This is the first step for any Angular task.',
    isReadOnly: true,
    isLocalOnly: true,
    factory: () => {
        let bestPracticesText;
        return async () => {
            bestPracticesText ??= await (0, promises_1.readFile)(node_path_1.default.join(__dirname, '..', 'resources', 'best-practices.md'), 'utf-8');
            return {
                content: [
                    {
                        type: 'text',
                        text: bestPracticesText,
                        annotations: {
                            audience: ['assistant'],
                            priority: 0.9,
                        },
                    },
                ],
            };
        };
    },
});
