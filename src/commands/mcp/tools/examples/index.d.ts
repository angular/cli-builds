/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
export declare const FIND_EXAMPLE_TOOL: import("../tool-registry").McpToolDeclaration<{
    workspacePath: import("zod").ZodOptional<import("zod").ZodString>;
    query: import("zod").ZodString;
    keywords: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    required_packages: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    related_concepts: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
    includeExperimental: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodBoolean>>;
}, {
    examples: import("zod").ZodArray<import("zod").ZodObject<{
        title: import("zod").ZodString;
        summary: import("zod").ZodString;
        keywords: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        required_packages: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        related_concepts: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        related_tools: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
        content: import("zod").ZodString;
        snippet: import("zod").ZodOptional<import("zod").ZodString>;
    }, "strip", import("zod").ZodTypeAny, {
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
}>;
