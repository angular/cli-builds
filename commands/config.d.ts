import { Command } from '../models/command';
export interface ConfigOptions {
    jsonPath: string;
    value?: string;
    global?: boolean;
}
export default class ConfigCommand extends Command {
    readonly name: string;
    readonly description: string;
    readonly arguments: string[];
    readonly options: {
        name: string;
        type: BooleanConstructor;
        'default': boolean;
        aliases: string[];
        description: string;
    }[];
    run(options: ConfigOptions): void;
    private get(config, options);
    private set(config, options);
    private asBoolean(raw);
    private asNumber(raw);
    private parseValue(rawValue, path);
    private updateLintForPrefix(filePath, prefix);
}
