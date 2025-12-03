/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import z from 'zod';
export declare const LIST_PROJECTS_TOOL: import("./tool-registry").McpToolDeclaration<Readonly<{
    [k: string]: z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
}>, {
    projects: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodOptional<z.ZodEnum<{
            application: "application";
            library: "library";
        }>>;
        root: z.ZodString;
        sourceRoot: z.ZodString;
        selectorPrefix: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}>;
