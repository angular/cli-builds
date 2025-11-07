/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { type McpToolContext, type McpToolDeclaration } from '../tool-registry';
/**
 * How long to wait to give "ng serve" time to identify whether the watched workspace has changed.
 */
export declare const WATCH_DELAY = 1000;
declare const waitForDevserverBuildToolInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    project?: string | undefined;
}, {
    project?: string | undefined;
    timeout?: number | undefined;
}>;
export type WaitForDevserverBuildToolInput = z.infer<typeof waitForDevserverBuildToolInputSchema>;
declare const waitForDevserverBuildToolOutputSchema: z.ZodObject<{
    status: z.ZodEnum<["success", "failure", "unknown", "timeout", "no_devserver_found"]>;
    logs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "timeout" | "failure" | "unknown" | "no_devserver_found";
    logs?: string[] | undefined;
}, {
    status: "success" | "timeout" | "failure" | "unknown" | "no_devserver_found";
    logs?: string[] | undefined;
}>;
export type WaitForDevserverBuildToolOutput = z.infer<typeof waitForDevserverBuildToolOutputSchema>;
export declare function waitForDevserverBuild(input: WaitForDevserverBuildToolInput, context: McpToolContext): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        status: "success" | "timeout" | "failure" | "unknown" | "no_devserver_found";
        logs?: string[] | undefined;
    };
}>;
export declare const WAIT_FOR_DEVSERVER_BUILD_TOOL: McpToolDeclaration<typeof waitForDevserverBuildToolInputSchema.shape, typeof waitForDevserverBuildToolOutputSchema.shape>;
export {};
