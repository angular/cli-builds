import { Command, CommandScope } from '../models/command';
export interface Xi18nOptions {
    outputPath?: string;
    verbose?: boolean;
    i18nFormat?: string;
    locale?: string;
    outFile?: string;
}
export default class Xi18nCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: ({
        name: string;
        type: StringConstructor;
        default: string;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: string;
        default: string;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: BooleanConstructor;
        default: boolean;
        description: string;
    } | {
        name: string;
        type: StringConstructor;
        aliases: string[];
        description: string;
    })[];
    run(options: any): Promise<any>;
}
