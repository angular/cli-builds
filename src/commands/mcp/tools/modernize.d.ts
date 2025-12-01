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
declare const modernizeInputSchema: z.ZodObject<{
    directories: z.ZodOptional<z.ZodArray<z.ZodString>>;
    transformations: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        [x: string]: string;
    }>>>;
}, z.core.$strip>;
declare const modernizeOutputSchema: z.ZodObject<{
    instructions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type ModernizeInput = z.infer<typeof modernizeInputSchema>;
export type ModernizeOutput = z.infer<typeof modernizeOutputSchema>;
export declare function runModernization(input: ModernizeInput, host: Host): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        instructions: string[];
    };
} | {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        instructions: string[] | undefined;
        logs: string[];
    };
}>;
export declare const MODERNIZE_TOOL: McpToolDeclaration<typeof modernizeInputSchema.shape, typeof modernizeOutputSchema.shape>;
export {};
