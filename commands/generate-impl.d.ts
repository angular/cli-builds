/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseSchematicOptions, SchematicCommand } from '../models/schematic-command';
export interface GenerateCommandOptions extends BaseSchematicOptions {
    schematic?: string;
}
export declare class GenerateCommand<T extends GenerateCommandOptions = GenerateCommandOptions> extends SchematicCommand<T> {
    initialize(options: T): Promise<void>;
    run(options: T): Promise<number | void>;
    private parseSchematicInfo;
    printHelp(options: T): Promise<number>;
}
