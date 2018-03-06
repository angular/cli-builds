import { Command } from '../models/command';
export interface SetOptions {
    jsonPath: string;
    value: string;
    global?: boolean;
}
export default class SetCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly arguments: string[];
    readonly options: {
        name: string;
        type: BooleanConstructor;
        'default': boolean;
        aliases: string[];
        description: string;
    }[];
    run(options: SetOptions): Promise<void>;
    private asBoolean(raw);
    private asNumber(raw);
    private parseValue(rawValue, path);
    private updateLintForPrefix(filePath, prefix);
}
