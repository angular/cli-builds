export interface DynamicPathOptions {
    project: any;
    entityName: string;
    appConfig: any;
    dryRun: boolean;
}
export declare function dynamicPathParser(options: DynamicPathOptions): {
    appRoot: any;
    sourceDir: any;
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
};
