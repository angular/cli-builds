/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
declare const modernizeInputSchema: z.ZodObject<{
    transformations: z.ZodOptional<z.ZodArray<z.ZodEnum<[string, ...string[]]>, "many">>;
}, "strip", z.ZodTypeAny, {
    transformations?: string[] | undefined;
}, {
    transformations?: string[] | undefined;
}>;
export type ModernizeInput = z.infer<typeof modernizeInputSchema>;
export declare function runModernization(input: ModernizeInput): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        instructions: string[];
    };
}>;
export declare function registerModernizeTool(server: McpServer): void;
export {};
