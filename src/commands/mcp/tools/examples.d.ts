/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
export declare const FIND_EXAMPLE_TOOL: import("./tool-registry").McpToolDeclaration<{
    workspacePath: z.ZodOptional<z.ZodString>;
    query: z.ZodString;
    keywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    required_packages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    related_concepts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includeExperimental: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, {
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
}>;
/**
 * Escapes a search query for FTS5 by tokenizing and quoting terms.
 *
 * This function processes a raw search string and prepares it for an FTS5 full-text search.
 * It correctly handles quoted phrases, logical operators (AND, OR, NOT), parentheses,
 * and prefix searches (ending with an asterisk), ensuring that individual search
 * terms are properly quoted to be treated as literals by the search engine.
 * This is primarily intended to avoid unintentional usage of FTS5 query syntax by consumers.
 *
 * @param query The raw search query string.
 * @returns A sanitized query string suitable for FTS5.
 */
export declare function escapeSearchQuery(query: string): string;
