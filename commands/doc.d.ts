import { Command } from '../models/command';
export interface DocOptions {
    search?: boolean;
}
export default class DocCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly arguments: string[];
    readonly options: {
        name: string;
        aliases: string[];
        type: BooleanConstructor;
        default: boolean;
        description: string;
    }[];
    run(options: any): Promise<any>;
}
