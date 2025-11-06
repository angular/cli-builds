/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * @fileoverview
 * Utility functions shared across MCP tools.
 */
/**
 * Returns simple structured content output from an MCP tool.
 *
 * @returns A structure with both `content` and `structuredContent` for maximum compatibility.
 */
export declare function createStructuredContentOutput<OutputType>(structuredContent: OutputType): {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: OutputType;
};
