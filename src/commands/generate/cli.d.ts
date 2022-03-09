/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Argv } from 'yargs';
import { CommandModuleImplementation, Options, OtherOptions } from '../../command-builder/command-module';
import { SchematicsCommandArgs, SchematicsCommandModule } from '../../command-builder/schematics-command-module';
export interface GenerateCommandArgs extends SchematicsCommandArgs {
    schematic?: string;
}
export declare class GenerateCommandModule extends SchematicsCommandModule implements CommandModuleImplementation<GenerateCommandArgs> {
    command: string;
    aliases: string;
    describe: string;
    longDescriptionPath?: string | undefined;
    builder(argv: Argv): Promise<Argv<GenerateCommandArgs>>;
    run(options: Options<GenerateCommandArgs> & OtherOptions): number | void | Promise<number | void>;
    /**
     * Generate a command string to be passed to the command builder.
     *
     * @example `component [name]` or `@schematics/angular:component [name]`.
     */
    private generateCommandString;
}
