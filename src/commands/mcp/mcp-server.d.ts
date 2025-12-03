/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AngularWorkspace } from '../../utilities/config';
import { AnyMcpToolDeclaration } from './tools/tool-registry';
/**
 * The set of tools that are available but not enabled by default.
 * These tools are considered experimental and may have limitations.
 */
export declare const EXPERIMENTAL_TOOLS: readonly [import("./tools/tool-registry").McpToolDeclaration<{
    query: import("zod").ZodString;
}, {
    examples: import("zod").ZodArray<import("zod").ZodObject<{
        content: import("zod").ZodString;
    }, import("zod/v4/core").$strip>>;
}>, import("./tools/tool-registry").McpToolDeclaration<{
    transformations: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodEnum<{
        [x: string]: string;
    }>>>;
}, {
    instructions: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
}>, import("./tools/tool-registry").McpToolDeclaration<{
    fileOrDirPath: import("zod").ZodString;
}, Readonly<{
    [k: string]: import("zod/v4/core").$ZodType<unknown, unknown, import("zod/v4/core").$ZodTypeInternals<unknown, unknown>>;
}>>];
export declare function createMcpServer(options: {
    workspace?: AngularWorkspace;
    readOnly?: boolean;
    localOnly?: boolean;
    experimentalTools?: string[];
}, logger: {
    warn(text: string): void;
}): Promise<McpServer>;
export declare function assembleToolDeclarations(stableDeclarations: readonly AnyMcpToolDeclaration[], experimentalDeclarations: readonly AnyMcpToolDeclaration[], options: {
    readOnly?: boolean;
    localOnly?: boolean;
    experimentalTools?: string[];
    logger: {
        warn(text: string): void;
    };
}): AnyMcpToolDeclaration[];
