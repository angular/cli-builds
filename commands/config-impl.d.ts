/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseCommandOptions, Command } from '../models/command';
export interface ConfigOptions extends BaseCommandOptions {
    jsonPath: string;
    value?: string;
    global?: boolean;
}
export declare class ConfigCommand<T extends ConfigOptions = ConfigOptions> extends Command<T> {
    run(options: T): Promise<1 | undefined>;
    private get;
    private set;
}
