/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { type Host } from '../host';
import { type McpToolDeclaration } from './tool-registry';
declare const testToolInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type TestToolInput = z.infer<typeof testToolInputSchema>;
declare const testToolOutputSchema: z.ZodObject<{
    status: z.ZodEnum<{
        success: "success";
        failure: "failure";
    }>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type TestToolOutput = z.infer<typeof testToolOutputSchema>;
export declare function runTest(input: TestToolInput, host: Host): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        status: "success" | "failure";
        logs?: string[] | undefined;
    };
}>;
export declare const TEST_TOOL: McpToolDeclaration<typeof testToolInputSchema.shape, typeof testToolOutputSchema.shape>;
export {};
