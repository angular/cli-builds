import { Command, CommandScope, Option } from '../models/command';
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
    readonly options: Option[];
    run(options: any): Promise<any>;
}
