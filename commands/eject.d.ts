import { Command, CommandScope } from '../models/command';
import { BuildOptions } from '../models/build-options';
export declare const baseEjectCommandOptions: any;
export interface EjectTaskOptions extends BuildOptions {
    force?: boolean;
    app?: string;
}
export default class EjectCommand extends Command {
    readonly name: string;
    readonly description: string;
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: any;
    run(options: EjectTaskOptions): Promise<any>;
}
