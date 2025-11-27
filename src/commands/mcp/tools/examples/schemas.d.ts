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
    keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    required_packages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    related_concepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includeExperimental: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    includeExperimental: boolean;
    keywords?: string[] | undefined;
    workspacePath?: string | undefined;
    required_packages?: string[] | undefined;
    related_concepts?: string[] | undefined;
}, {
    query: string;
    keywords?: string[] | undefined;
    workspacePath?: string | undefined;
    required_packages?: string[] | undefined;
    related_concepts?: string[] | undefined;
    includeExperimental?: boolean | undefined;
}>;
export type FindExampleInput = z.infer<typeof findExampleInputSchema>;
export declare const findExampleOutputSchema: z.ZodObject<{
    examples: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        required_packages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        related_concepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        related_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        content: z.ZodString;
        snippet: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        content: string;
        summary: string;
        keywords?: string[] | undefined;
        required_packages?: string[] | undefined;
        related_concepts?: string[] | undefined;
        related_tools?: string[] | undefined;
        snippet?: string | undefined;
    }, {
        title: string;
        content: string;
        summary: string;
        keywords?: string[] | undefined;
        required_packages?: string[] | undefined;
        related_concepts?: string[] | undefined;
        related_tools?: string[] | undefined;
        snippet?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    examples: {
        title: string;
        content: string;
        summary: string;
        keywords?: string[] | undefined;
        required_packages?: string[] | undefined;
        related_concepts?: string[] | undefined;
        related_tools?: string[] | undefined;
        snippet?: string | undefined;
    }[];
}, {
    examples: {
        title: string;
        content: string;
        summary: string;
        keywords?: string[] | undefined;
        required_packages?: string[] | undefined;
        related_concepts?: string[] | undefined;
        related_tools?: string[] | undefined;
        snippet?: string | undefined;
    }[];
}>;
