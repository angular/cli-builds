import { Arguments, Option } from '../models/interface';
import { BaseSchematicOptions, SchematicCommand } from '../models/schematic-command';
export interface UpdateOptions extends BaseSchematicOptions {
    next: boolean;
    schematic?: boolean;
    dryRun: boolean;
    force: boolean;
}
export declare class UpdateCommand<T extends UpdateOptions = UpdateOptions> extends SchematicCommand<T> {
    readonly allowMissingWorkspace: boolean;
    private collectionName;
    private schematicName;
    initialize(input: T): Promise<void>;
    parseArguments(schematicOptions: string[], schema: Option[]): Promise<Arguments>;
    run(options: UpdateOptions): Promise<number | void>;
}
