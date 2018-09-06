/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseCommandOptions, Command } from '../models/command';
export interface DocCommandOptions extends BaseCommandOptions {
    keyword: string;
    search?: boolean;
}
export declare class DocCommand<T extends DocCommandOptions = DocCommandOptions> extends Command<T> {
    run(options: T): Promise<any>;
}
