import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';
export default class BuildCommand extends ArchitectCommand {
    readonly name: string;
    readonly target: string;
    readonly description: string;
    static aliases: string[];
    scope: CommandScope;
    options: Option[];
    validate(options: ArchitectCommandOptions): boolean;
    run(options: ArchitectCommandOptions): Promise<number>;
}
