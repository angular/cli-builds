/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Argv } from 'yargs';
import { CommandModule, CommandScope, Options, OtherOptions } from '../../command-builder/command-module';
export interface UpdateCommandArgs {
    packages?: string | string[];
    force: boolean;
    next: boolean;
    'migrate-only'?: boolean;
    name?: string;
    from?: string;
    to?: string;
    'allow-dirty': boolean;
    verbose: boolean;
    'create-commits': boolean;
}
export declare class UpdateCommandModule extends CommandModule<UpdateCommandArgs> {
    static scope: CommandScope;
    command: string;
    describe: string;
    longDescriptionPath: string;
    builder(localYargs: Argv): Argv<UpdateCommandArgs>;
    run(options: Options<UpdateCommandArgs> & OtherOptions): Promise<number | void>;
}
