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
exports.registerBestPracticesTool = registerBestPracticesTool;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
function registerBestPracticesTool(server) {
    let bestPracticesText;
    server.registerTool('get_best_practices', {
        title: 'Get Angular Coding Best Practices Guide',
        description: 'You **MUST** use this tool to retrieve the Angular Best Practices Guide ' +
            'before any interaction with Angular code (creating, analyzing, modifying). ' +
            'It is mandatory to follow this guide to ensure all code adheres to ' +
            'modern standards, including standalone components, typed forms, and ' +
            'modern control flow. This is the first step for any Angular task.',
        annotations: {
            readOnlyHint: true,
            openWorldHint: false,
        },
    }, async () => {
        bestPracticesText ??= await (0, promises_1.readFile)(node_path_1.default.join(__dirname, '..', 'instructions', 'best-practices.md'), 'utf-8');
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
    });
}
