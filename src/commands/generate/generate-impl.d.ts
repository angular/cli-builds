/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicCommand } from '../../../models/schematic-command';
import { Options, OtherOptions } from '../../command-builder/command-module';
import { GenerateCommandArgs } from './cli';
declare type GenerateCommandOptions = Options<GenerateCommandArgs>;
export declare class GenerateCommand extends SchematicCommand<GenerateCommandOptions> {
    longSchematicName: string | undefined;
    initialize(options: GenerateCommandOptions): Promise<void>;
    run(options: GenerateCommandOptions & OtherOptions): Promise<number | void>;
    reportAnalytics(paths: string[], options: GenerateCommandOptions): Promise<void>;
    private parseSchematicInfo;
}
export {};
