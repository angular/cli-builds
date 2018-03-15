import { Command, CommandScope } from '../models/command';
export default class GenerateCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    arguments: string[];
    options: ({
        name: string;
        type: BooleanConstructor;
        default: boolean;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: StringConstructor;
        aliases: string[];
        description: string;
    } | {
        name: string;
        type: BooleanConstructor;
        aliases: string[];
        description: string;
    })[];
    private initialized;
    initialize(options: any): Promise<void>;
    validate(options: any): boolean | Promise<boolean>;
    run(options: any): any;
    private parseSchematicInfo(options);
    printHelp(options: any): void;
}
