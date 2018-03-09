export interface SchematicRunOptions {
    dryRun: boolean;
    force: boolean;
    taskOptions: SchematicOptions;
    workingDir: string;
    emptyHost: boolean;
    collectionName: string;
    schematicName: string;
    allowPrivate?: boolean;
}
export interface SchematicOptions {
    [key: string]: any;
}
export interface SchematicOutput {
    modifiedFiles: string[];
}
declare const _default: any;
export default _default;
