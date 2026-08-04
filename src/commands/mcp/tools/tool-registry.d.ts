/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { McpServer, ServerContext, ToolAnnotations, ToolCallback } from '@modelcontextprotocol/server';
import { type ZodRawShape, z } from 'zod';
import type { AngularWorkspace } from '../../../utilities/config';
import type { Devserver } from '../devserver';
import type { Host } from '../host';
export interface McpToolContext {
    server: McpServer;
    workspace?: AngularWorkspace;
    logger: {
        warn(text: string): void;
    };
    exampleDatabasePath?: string;
    devservers: Map<string, Devserver>;
    host: Host;
}
export type McpToolCallback<TInput extends ZodRawShape = ZodRawShape> = (args: z.infer<z.ZodObject<TInput>>, ctx: ServerContext) => ReturnType<ToolCallback>;
export type McpToolFactory<TInput extends ZodRawShape> = (context: McpToolContext) => McpToolCallback<TInput> | Promise<McpToolCallback<TInput>>;
export interface McpToolDeclaration<TInput extends ZodRawShape, TOutput extends ZodRawShape> {
    name: string;
    title?: string;
    description: string;
    annotations?: ToolAnnotations;
    inputSchema?: TInput;
    outputSchema?: TOutput;
    factory: McpToolFactory<TInput>;
    shouldRegister?: (context: McpToolContext) => boolean | Promise<boolean>;
    isReadOnly?: boolean;
    isLocalOnly?: boolean;
}
export type AnyMcpToolDeclaration = McpToolDeclaration<any, any>;
export declare function declareTool<TInput extends ZodRawShape, TOutput extends ZodRawShape>(declaration: McpToolDeclaration<TInput, TOutput>): McpToolDeclaration<TInput, TOutput>;
export declare function registerTools(server: McpServer, context: Omit<McpToolContext, 'server'>, declarations: AnyMcpToolDeclaration[]): Promise<void>;
