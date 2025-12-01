/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
export declare const findExampleInputSchema: z.ZodObject<{
    workspacePath: z.ZodOptional<z.ZodString>;
    query: z.ZodString;
    keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
    required_packages: z.ZodOptional<z.ZodArray<z.ZodString>>;
    related_concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    includeExperimental: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type FindExampleInput = z.infer<typeof findExampleInputSchema>;
export declare const findExampleOutputSchema: z.ZodObject<{
    examples: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        keywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
        required_packages: z.ZodOptional<z.ZodArray<z.ZodString>>;
        related_concepts: z.ZodOptional<z.ZodArray<z.ZodString>>;
        related_tools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        content: z.ZodString;
        snippet: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
