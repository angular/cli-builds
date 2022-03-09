/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Collection } from '@angular-devkit/schematics';
import { FileSystemCollectionDescription, FileSystemSchematicDescription, NodeWorkflow } from '@angular-devkit/schematics/tools';
import { Argv } from 'yargs';
import { CommandModule, CommandModuleImplementation, CommandScope } from './command-module';
import { Option } from './utilities/json-schema';
export interface SchematicsCommandArgs {
    interactive: boolean;
    force: boolean;
    'dry-run': boolean;
    defaults: boolean;
}
export declare abstract class SchematicsCommandModule extends CommandModule<SchematicsCommandArgs> implements CommandModuleImplementation<SchematicsCommandArgs> {
    static scope: CommandScope;
    protected readonly schematicName: string | undefined;
    builder(argv: Argv): Promise<Argv<SchematicsCommandArgs>>;
    /** Get schematic schema options.*/
    protected getSchematicOptions(collection: Collection<FileSystemCollectionDescription, FileSystemSchematicDescription>, schematicName: string, workflow: NodeWorkflow): Promise<Option[]>;
    protected getCollectionName(): Promise<string>;
    private _workflow;
    protected getOrCreateWorkflow(collectionName: string): NodeWorkflow;
    private _defaultSchematicCollection;
    protected getDefaultSchematicCollection(): Promise<string>;
    protected parseSchematicInfo(schematic: string | undefined): [collectionName: string | undefined, schematicName: string | undefined];
}
