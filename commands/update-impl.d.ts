import { Arguments, Option } from '../models/interface';
import { SchematicCommand } from '../models/schematic-command';
import { Schema as UpdateCommandSchema } from './update';
export declare class UpdateCommand extends SchematicCommand<UpdateCommandSchema> {
    readonly allowMissingWorkspace: boolean;
    private collectionName;
    private schematicName;
    initialize(input: UpdateCommandSchema & Arguments): Promise<void>;
    parseArguments(schematicOptions: string[], schema: Option[]): Promise<Arguments>;
    run(options: UpdateCommandSchema & Arguments): Promise<number | void>;
}
