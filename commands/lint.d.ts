import { Command, CommandScope } from '../models/command';
export interface LintCommandOptions {
    fix?: boolean;
    typeCheck?: boolean;
    format?: string;
    force?: boolean;
}
export default class LintCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: ({
        name: string;
        type: BooleanConstructor;
        default: boolean;
        description: string;
    } | {
        name: string;
        aliases: string[];
        type: StringConstructor;
        default: string;
        description: string;
    })[];
    run(options: LintCommandOptions): Promise<number>;
}
