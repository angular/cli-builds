import { Option, CommandContext, CommandConstructor } from '../models/command';
import { logging } from '@angular-devkit/core';
export interface CommandMap {
    [key: string]: CommandConstructor;
}
/**
 * Run a command.
 * @param commandMap Map of available commands.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param context Execution context.
 */
export declare function runCommand(commandMap: CommandMap, args: string[], logger: logging.Logger, context: CommandContext): Promise<any>;
export declare function parseOptions<T = any>(args: string[], cmdOpts: Option[], commandArguments: string[]): T;
