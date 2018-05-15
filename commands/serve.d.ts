import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';
export default class ServeCommand extends ArchitectCommand {
    readonly name: string;
    readonly target: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly options: Option[];
    validate(_options: ArchitectCommandOptions): boolean;
    run(options: ArchitectCommandOptions): Promise<number>;
}
