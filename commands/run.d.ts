import { Command, Option } from '../models/command';
export default class RunCommand extends Command {
    readonly name: string;
    readonly description: string;
    readonly arguments: string[];
    readonly options: Option[];
    run(options: any): Promise<void>;
}
