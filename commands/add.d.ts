import { Command, CommandScope, Option } from '../models/command';
export default class AddCommand extends Command {
    readonly name: string;
    readonly description: string;
    scope: CommandScope;
    arguments: string[];
    options: Option[];
    private _parseSchematicOptions(collectionName);
    validate(options: any): boolean;
    run(commandOptions: any): Promise<void>;
}
