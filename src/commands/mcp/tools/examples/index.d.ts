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
    keywords: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    required_packages: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    related_concepts: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
    includeExperimental: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodBoolean>>;
}, {
    examples: import("zod").ZodArray<import("zod").ZodObject<{
        title: import("zod").ZodString;
        summary: import("zod").ZodString;
        keywords: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        required_packages: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        related_concepts: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        related_tools: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
        content: import("zod").ZodString;
        snippet: import("zod").ZodOptional<import("zod").ZodString>;
    }, import("zod/v4/core").$strip>>;
}>;
