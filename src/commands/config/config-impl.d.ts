/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Command } from '../../../models/command';
import { Options } from '../../command-builder/command-module';
import { ConfigCommandArgs } from './cli';
declare type ConfigCommandOptions = Options<ConfigCommandArgs>;
export declare class ConfigCommand extends Command<ConfigCommandOptions> {
    run(options: ConfigCommandOptions): Promise<1 | 0>;
    private get;
    private set;
}
export {};
