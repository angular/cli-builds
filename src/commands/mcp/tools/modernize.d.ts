/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { Host } from '../host';
import { McpToolDeclaration } from './tool-registry';
declare const modernizeInputSchema: z.ZodObject<{
    directories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    transformations: z.ZodOptional<z.ZodArray<z.ZodEnum<[string, ...string[]]>, "many">>;
}, "strip", z.ZodTypeAny, {
    directories?: string[] | undefined;
    transformations?: string[] | undefined;
}, {
    directories?: string[] | undefined;
    transformations?: string[] | undefined;
}>;
declare const modernizeOutputSchema: z.ZodObject<{
    instructions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    stdout: z.ZodOptional<z.ZodString>;
    stderr: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    stdout?: string | undefined;
    stderr?: string | undefined;
    instructions?: string[] | undefined;
}, {
    stdout?: string | undefined;
    stderr?: string | undefined;
    instructions?: string[] | undefined;
}>;
export type ModernizeInput = z.infer<typeof modernizeInputSchema>;
export type ModernizeOutput = z.infer<typeof modernizeOutputSchema>;
export declare function runModernization(input: ModernizeInput, host: Host): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        stdout?: string | undefined;
        stderr?: string | undefined;
        instructions?: string[] | undefined;
    };
}>;
export declare const MODERNIZE_TOOL: McpToolDeclaration<typeof modernizeInputSchema.shape, typeof modernizeOutputSchema.shape>;
export {};
