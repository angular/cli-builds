import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';
export interface RunOptions {
    app?: string;
    configuration?: string;
    prod: boolean;
}
export default class E2eCommand extends ArchitectCommand {
    readonly name: string;
    readonly target: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: Option[];
    run(options: RunOptions): Promise<number>;
}
