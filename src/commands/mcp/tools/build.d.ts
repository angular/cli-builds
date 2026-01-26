/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { type McpToolContext, type McpToolDeclaration } from './tool-registry';
declare const buildToolInputSchema: z.ZodObject<{
    configuration: z.ZodOptional<z.ZodString>;
    workspace: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BuildToolInput = z.infer<typeof buildToolInputSchema>;
declare const buildToolOutputSchema: z.ZodObject<{
    status: z.ZodEnum<{
        success: "success";
        failure: "failure";
    }>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BuildToolOutput = z.infer<typeof buildToolOutputSchema>;
export declare function runBuild(input: BuildToolInput, context: McpToolContext): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        status: "success" | "failure";
        logs?: string[] | undefined;
        path?: string | undefined;
    };
}>;
export declare const BUILD_TOOL: McpToolDeclaration<typeof buildToolInputSchema.shape, typeof buildToolOutputSchema.shape>;
export {};
