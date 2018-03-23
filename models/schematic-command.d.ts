import { ArgumentStrategy, Command, Option } from './command';
export interface CoreSchematicOptions {
    dryRun: boolean;
    force: boolean;
}
export interface RunSchematicOptions {
    collectionName: string;
    schematicName: string;
    schematicOptions: any;
    debug?: boolean;
    dryRun: boolean;
    force: boolean;
}
export interface GetOptionsOptions {
    collectionName: string;
    schematicName: string;
}
export interface GetHelpOutputOptions {
    collectionName: string;
    schematicName: string;
    nonSchematicOptions: any[];
}
export declare abstract class SchematicCommand extends Command {
    readonly options: Option[];
    private _host;
    private _workspace;
    argStrategy: ArgumentStrategy;
    protected readonly coreOptions: Option[];
    readonly arguments: string[];
    initialize(_options: any): Promise<void>;
    protected setPathOptions(options: any, workingDir: string): any;
    protected runSchematic(options: RunSchematicOptions): Promise<{}>;
    protected removeCoreOptions(options: any): any;
    protected getOptions(options: GetOptionsOptions): Promise<Option[] | null>;
    protected getHelpOutput({schematicName, collectionName, nonSchematicOptions}: GetHelpOutputOptions): Promise<string[]>;
    private _loadWorkspace();
    private readDefaults(collectionName, schematicName, options);
}
