import { CommandContext, CommandConstructor } from '../models/command';
import { Logger } from '@angular-devkit/core/src/logger';
export interface CommandMap {
    [key: string]: CommandConstructor;
}
/**
 * Run a command.
 * @param commandMap Map of available commands.
 * @param args Raw unparsed arguments.
 * @param context Execution context.
 */
export declare function runCommand(commandMap: CommandMap, args: string[], logger: Logger, context: CommandContext): Promise<any>;
