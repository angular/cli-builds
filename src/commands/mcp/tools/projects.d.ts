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
            root: z.ZodString;
            sourceRoot: z.ZodString;
            selectorPrefix: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            selectorPrefix?: string | undefined;
        }, {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            selectorPrefix?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        path: string;
        projects: {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            selectorPrefix?: string | undefined;
        }[];
        frameworkVersion?: string | undefined;
    }, {
        path: string;
        projects: {
            name: string;
            root: string;
            sourceRoot: string;
            type?: "application" | "library" | undefined;
            selectorPrefix?: string | undefined;
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
