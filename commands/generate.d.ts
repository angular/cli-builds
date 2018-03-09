import { Command, CommandScope, Option } from '../models/command';
export default class GenerateCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    arguments: string[];
    options: Option[];
    private initialized;
    initialize(options: any): Promise<void>;
    validate(options: any): boolean | Promise<boolean>;
    run(options: any): any;
    private parseSchematicInfo(options);
    printHelp(options: any): void;
    private stripLocalOptions(options);
}
