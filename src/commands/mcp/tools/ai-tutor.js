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
exports.AI_TUTOR_TOOL = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const tool_registry_1 = require("./tool-registry");
exports.AI_TUTOR_TOOL = (0, tool_registry_1.declareTool)({
    name: 'ai_tutor',
    title: 'Start Angular AI Tutor',
    description: `
<Purpose>
Activates the Angular AI Tutor, an interactive guide to building a complete, modern Angular application from the ground up.
The tutor follows a structured curriculum and fosters critical thinking by explaining concepts and providing project-specific exercises.
</Purpose>
<Use Cases>
* Start a guided, step-by-step tutorial for learning Angular.
* Resume a previous tutoring session. The tutor will analyze your project files to determine your progress.
* Learn modern Angular patterns and best practices for version 20.
</Use Cases>
<Operational Notes>
* The tutor will guide you through building a "Smart Recipe Box" application.
* You can control the learning experience with commands like "skip this section" or "set my experience level to beginner."
* The tutor has access to your project files and will use them to verify your solutions.
</Operational Notes>
`,
    isReadOnly: true,
    isLocalOnly: true,
    factory: () => {
        let aiTutorText;
        return async () => {
            aiTutorText ??= await (0, promises_1.readFile)(node_path_1.default.join(__dirname, '..', 'resources', 'ai-tutor.md'), 'utf-8');
            return {
                content: [
                    {
                        type: 'text',
                        text: aiTutorText,
                        annotations: {
                            audience: ['system'],
                            priority: 1.0,
                        },
                    },
                ],
            };
        };
    },
});
