import { Command, CommandScope } from '../models/command';
export interface UpdateOptions {
    schematic?: boolean;
}
export default class UpdateCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: ({
        name: string;
        type: BooleanConstructor;
        default: boolean;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: BooleanConstructor;
        default: boolean;
        description: string;
    })[];
    run(options: any): Promise<any>;
}
