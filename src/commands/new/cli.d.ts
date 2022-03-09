/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Argv } from 'yargs';
import { CommandModuleImplementation, CommandScope, Options, OtherOptions } from '../../command-builder/command-module';
import { SchematicsCommandArgs, SchematicsCommandModule } from '../../command-builder/schematics-command-module';
export interface NewCommandArgs extends SchematicsCommandArgs {
    collection?: string;
}
export declare class NewCommandModule extends SchematicsCommandModule implements CommandModuleImplementation<NewCommandArgs> {
    protected schematicName: string;
    static scope: CommandScope;
    command: string;
    aliases: string;
    describe: string;
    longDescriptionPath?: string | undefined;
    builder(argv: Argv): Promise<Argv<NewCommandArgs>>;
    run(options: Options<NewCommandArgs> & OtherOptions): number | void | Promise<number | void>;
}
