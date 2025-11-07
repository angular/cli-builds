/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
import { type McpToolContext, type McpToolDeclaration } from '../tool-registry';
declare const stopDevserverToolInputSchema: z.ZodObject<{
    project: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    project?: string | undefined;
}, {
    project?: string | undefined;
}>;
export type StopDevserverToolInput = z.infer<typeof stopDevserverToolInputSchema>;
declare const stopDevserverToolOutputSchema: z.ZodObject<{
    message: z.ZodString;
    logs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    logs?: string[] | undefined;
}, {
    message: string;
    logs?: string[] | undefined;
}>;
export type StopDevserverToolOutput = z.infer<typeof stopDevserverToolOutputSchema>;
export declare function stopDevserver(input: StopDevserverToolInput, context: McpToolContext): {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        message: string;
        logs: undefined;
    };
} | {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        message: string;
        logs: string[];
    };
};
export declare const STOP_DEVSERVER_TOOL: McpToolDeclaration<typeof stopDevserverToolInputSchema.shape, typeof stopDevserverToolOutputSchema.shape>;
export {};
