import { ArchitectCommand } from '../models/architect-command';
import { Option, CommandScope } from '../models/command';
export interface Options {
    app?: string;
    configuration?: string;
    prod: boolean;
}
export default class BuildCommand extends ArchitectCommand {
    readonly name: string;
    readonly target: string;
    readonly description: string;
    static aliases: string[];
    scope: CommandScope;
    arguments: string[];
    options: Option[];
    validate(_options: Options): boolean;
    run(options: Options): Promise<number>;
}
