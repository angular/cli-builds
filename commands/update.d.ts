import { CommandScope, Option } from '../models/command';
import { SchematicCommand, CoreSchematicOptions } from '../models/schematic-command';
export interface UpdateOptions extends CoreSchematicOptions {
    next: boolean;
    schematic?: boolean;
}
export default class UpdateCommand extends SchematicCommand {
    readonly name: string;
    readonly description: string;
    static aliases: string[];
    readonly scope: CommandScope;
    readonly arguments: string[];
    readonly options: Option[];
    run(options: UpdateOptions): Promise<{}>;
}
