import { Command, Option, CommandScope } from '../models/command';
import { BuildOptions } from '../models/build-options';
export declare const baseBuildCommandOptions: Option[];
export interface BuildTaskOptions extends BuildOptions {
    statsJson?: boolean;
}
export default class BuildCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    scope: CommandScope;
    arguments: string[];
    options: Option[];
    validate(_options: BuildTaskOptions): boolean;
    run(options: BuildTaskOptions): Promise<any>;
}
