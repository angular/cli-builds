/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { Arguments, CommandContext, CommandDescription, CommandDescriptionMap, CommandWorkspace, Option } from './interface';
export interface BaseCommandOptions extends Arguments {
    help?: boolean;
    helpJson?: boolean;
}
export declare abstract class Command<T extends BaseCommandOptions = BaseCommandOptions> {
    readonly description: CommandDescription;
    protected readonly logger: logging.Logger;
    allowMissingWorkspace: boolean;
    workspace: CommandWorkspace;
    protected static commandMap: CommandDescriptionMap;
    static setCommandMap(map: CommandDescriptionMap): void;
    constructor(context: CommandContext, description: CommandDescription, logger: logging.Logger);
    initialize(options: T): Promise<void>;
    printHelp(options: T): Promise<number>;
    printJsonHelp(_options: T): Promise<number>;
    protected printHelpUsage(): Promise<void>;
    protected printHelpOptions(options?: Option[]): Promise<void>;
    validateScope(): Promise<void>;
    abstract run(options: T & Arguments): Promise<number | void>;
    validateAndRun(options: T & Arguments): Promise<number | void>;
}
