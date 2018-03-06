import { Command } from '../models/command';
export interface GetOptions {
    jsonPath: string;
    global?: boolean;
}
export default class GetCommand extends Command {
    readonly name: string;
    readonly description: string;
    readonly arguments: string[];
    readonly options: {
        name: string;
        type: BooleanConstructor;
        'default': boolean;
        aliases: string[];
        description: string;
    }[];
    run(options: GetOptions): Promise<void>;
}
