/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Argv } from 'yargs';
import { CommandContext, CommandModule, CommandModuleImplementation } from '../command-module';
export declare const demandCommandFailureMessage = "You need to specify a command before moving on. Use '--help' to view the available commands.";
export type CommandModuleConstructor = Partial<CommandModuleImplementation> & {
    new (context: CommandContext): Partial<CommandModuleImplementation> & CommandModule;
};
export declare function addCommandModuleToYargs<T extends object, U extends CommandModuleConstructor>(localYargs: Argv<T>, commandModule: U, context: CommandContext): Argv<T>;
