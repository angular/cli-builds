/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { type Host } from '../../host';
import { type McpToolContext, type McpToolDeclaration } from '../tool-registry';
declare const startDevServerToolInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    project?: string | undefined;
}, {
    project?: string | undefined;
}>;
export type StartDevserverToolInput = z.infer<typeof startDevServerToolInputSchema>;
declare const startDevServerToolOutputSchema: z.ZodObject<{
    message: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    address?: string | undefined;
}, {
    message: string;
    address?: string | undefined;
}>;
export type StartDevserverToolOutput = z.infer<typeof startDevServerToolOutputSchema>;
export declare function startDevServer(input: StartDevserverToolInput, context: McpToolContext, host: Host): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        message: string;
        address: string;
    };
}>;
export declare const START_DEVSERVER_TOOL: McpToolDeclaration<typeof startDevServerToolInputSchema.shape, typeof startDevServerToolOutputSchema.shape>;
export {};
