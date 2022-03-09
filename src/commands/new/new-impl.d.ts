/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicCommand } from '../../../models/schematic-command';
import { Options, OtherOptions } from '../../command-builder/command-module';
import { NewCommandArgs } from './cli';
declare type NewCommandOptions = Options<NewCommandArgs>;
export declare class NewCommand extends SchematicCommand<NewCommandOptions> {
    readonly allowMissingWorkspace = true;
    schematicName: string;
    initialize(options: NewCommandOptions): Promise<void>;
    run(options: NewCommandOptions & OtherOptions): Promise<number | void>;
}
export {};
