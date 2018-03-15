import { Command, Option } from './command';
export declare abstract class ArchitectCommand extends Command {
    readonly Options: Option[];
    readonly arguments: string[];
    abstract target: string;
    initialize(options: any): Promise<void>;
    protected mapArchitectOptions(schema: any): void;
    protected prodOption: Option;
    protected configurationOption: Option;
    protected runArchitect(options: RunArchitectOptions): Promise<number>;
}
export interface RunArchitectOptions {
    app: string;
    configuration?: string;
    overrides?: object;
}
