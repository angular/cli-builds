import { Command, CommandScope } from '../models/command';
export default class NewCommand extends Command {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    scope: CommandScope;
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
    })[];
    private initialized;
    initialize(options: any): any;
    run(options: any): Promise<any>;
    private isProject(projectPath);
    private parseCollectionName(options);
}
