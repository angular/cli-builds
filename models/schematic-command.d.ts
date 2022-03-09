/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FileSystemCollection, FileSystemEngine, FileSystemSchematic, NodeWorkflow } from '@angular-devkit/schematics/tools';
import { BaseCommandOptions, Command } from './command';
import { CommandContext } from './interface';
export interface BaseSchematicSchema {
    debug?: boolean;
    dryRun?: boolean;
    force?: boolean;
    interactive?: boolean;
    defaults?: boolean;
    registry?: string;
}
export interface RunSchematicOptions extends BaseSchematicSchema {
    collectionName: string;
    schematicName: string;
    schematicOptions?: Record<string, unknown>;
    showNothingDone?: boolean;
}
export declare class UnknownCollectionError extends Error {
    constructor(collectionName: string);
}
export declare abstract class SchematicCommand<T extends BaseSchematicSchema & BaseCommandOptions> extends Command<T> {
    protected readonly allowPrivateSchematics: boolean;
    protected readonly useReportAnalytics = false;
    protected _workflow: NodeWorkflow;
    protected defaultCollectionName: string;
    protected collectionName: string;
    protected schematicName?: string;
    constructor(context: CommandContext, commandName: string);
    initialize(options: T): Promise<void>;
    protected getEngine(): FileSystemEngine;
    protected getCollection(collectionName: string): FileSystemCollection;
    protected getSchematic(collection: FileSystemCollection, schematicName: string, allowPrivate?: boolean): FileSystemSchematic;
    protected createWorkflow(options: BaseSchematicSchema): Promise<NodeWorkflow>;
    protected getDefaultSchematicCollection(): Promise<string>;
    protected runSchematic(options: RunSchematicOptions): Promise<number | void>;
}
