/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseSchematicOptions, SchematicCommand } from '../models/schematic-command';
export interface NewCommandOptions extends BaseSchematicOptions {
    skipGit?: boolean;
    collection?: string;
}
export declare class NewCommand extends SchematicCommand {
    readonly allowMissingWorkspace: boolean;
    private schematicName;
    run(options: NewCommandOptions): Promise<number | void>;
    private parseCollectionName;
}
