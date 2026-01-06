/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { type Host } from '../host';
import { type McpToolContext, type McpToolDeclaration } from './tool-registry';
declare const e2eToolInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type E2eToolInput = z.infer<typeof e2eToolInputSchema>;
declare const e2eToolOutputSchema: z.ZodObject<{
    status: z.ZodEnum<{
        success: "success";
        failure: "failure";
    }>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type E2eToolOutput = z.infer<typeof e2eToolOutputSchema>;
export declare function runE2e(input: E2eToolInput, host: Host, context: McpToolContext): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        status: string;
        logs: string[];
    };
} | {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        status: "success" | "failure";
        logs?: string[] | undefined;
    };
}>;
export declare const E2E_TOOL: McpToolDeclaration<typeof e2eToolInputSchema.shape, typeof e2eToolOutputSchema.shape>;
export {};
