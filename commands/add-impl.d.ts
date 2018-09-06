/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Arguments } from '../models/interface';
import { BaseSchematicOptions, SchematicCommand } from '../models/schematic-command';
export interface AddCommandOptions extends BaseSchematicOptions {
    collection: string;
}
export declare class AddCommand<T extends AddCommandOptions = AddCommandOptions> extends SchematicCommand<T> {
    readonly allowPrivateSchematics: boolean;
    run(options: AddCommandOptions & Arguments): Promise<number | void>;
}
