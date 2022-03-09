/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics, logging } from '@angular-devkit/core';
import { Option } from '../src/command-builder/utilities/json-schema';
import { AngularWorkspace } from '../src/utilities/config';
import { CommandContext } from './interface';
export interface BaseCommandOptions {
    jsonHelp?: boolean;
}
export declare abstract class Command<T = {}> {
    protected readonly context: CommandContext;
    protected readonly commandName: string;
    protected allowMissingWorkspace: boolean;
    protected useReportAnalytics: boolean;
    readonly workspace?: AngularWorkspace;
    protected readonly analytics: analytics.Analytics;
    protected readonly commandOptions: Option[];
    protected readonly logger: logging.Logger;
    constructor(context: CommandContext, commandName: string);
    initialize(options: T): Promise<number | void>;
    reportAnalytics(paths: string[], options: T, dimensions?: (boolean | number | string)[], metrics?: (boolean | number | string)[]): Promise<void>;
    abstract run(options: T): Promise<number | void>;
    validateAndRun(options: T): Promise<number | void>;
}
