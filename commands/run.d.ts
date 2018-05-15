import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';
export default class RunCommand extends ArchitectCommand {
    readonly name: string;
    readonly description: string;
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: Option[];
    run(options: ArchitectCommandOptions): Promise<number>;
}
