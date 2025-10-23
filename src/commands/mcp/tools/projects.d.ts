/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import z from 'zod';
export declare const LIST_PROJECTS_TOOL: import("./tool-registry").McpToolDeclaration<z.ZodRawShape, {
    workspaces: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        frameworkVersion: z.ZodOptional<z.ZodString>;
        projects: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodOptional<z.ZodEnum<["application", "library"]>>;
            builder: z.ZodOptional<z.ZodString>;
            root: z.ZodString;
            sourceRoot: z.ZodString;
            selectorPrefix: z.ZodOptional<z.ZodString>;
            unitTestFramework: z.ZodOptional<z.ZodEnum<["jasmine", "jest", "vitest", "unknown"]>>;
            styleLanguage: z.ZodOptional<z.ZodEnum<["css", "scss", "sass", "less"]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            builder?: string | undefined;
            selectorPrefix?: string | undefined;
            unitTestFramework?: "vitest" | "unknown" | "jasmine" | "jest" | undefined;
            styleLanguage?: "css" | "less" | "sass" | "scss" | undefined;
        }, {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            builder?: string | undefined;
            selectorPrefix?: string | undefined;
            unitTestFramework?: "vitest" | "unknown" | "jasmine" | "jest" | undefined;
            styleLanguage?: "css" | "less" | "sass" | "scss" | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        path: string;
        projects: {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            builder?: string | undefined;
            selectorPrefix?: string | undefined;
            unitTestFramework?: "vitest" | "unknown" | "jasmine" | "jest" | undefined;
            styleLanguage?: "css" | "less" | "sass" | "scss" | undefined;
        }[];
        frameworkVersion?: string | undefined;
    }, {
        path: string;
        projects: {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            builder?: string | undefined;
            selectorPrefix?: string | undefined;
            unitTestFramework?: "vitest" | "unknown" | "jasmine" | "jest" | undefined;
            styleLanguage?: "css" | "less" | "sass" | "scss" | undefined;
        }[];
        frameworkVersion?: string | undefined;
    }>, "many">;
    parsingErrors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        filePath: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        filePath: string;
    }, {
        message: string;
        filePath: string;
    }>, "many">>;
    versioningErrors: z.ZodDefault<z.ZodArray<z.ZodObject<{
        filePath: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        filePath: string;
    }, {
        message: string;
        filePath: string;
    }>, "many">>;
}>;
