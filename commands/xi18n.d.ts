import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';
export default class Xi18nCommand extends ArchitectCommand {
    readonly name: string;
    readonly target: string;
    readonly description: string;
    readonly scope: CommandScope;
    readonly multiTarget: true;
    readonly options: Option[];
    run(options: ArchitectCommandOptions): Promise<number>;
}
