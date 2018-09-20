/**
 * Updates your application and its dependencies.
 */
export interface Schema {
    /**
     * Run through without making any changes.
     */
    dryRun?: boolean;
    /**
     * Shows a help message. You can pass the format as a value.
     */
    help?: HelpUnion;
    /**
     * The names of package(s) to update
     */
    packages?: string[];
}
/**
 * Shows a help message. You can pass the format as a value.
 */
export declare type HelpUnion = boolean | HelpEnum;
export declare enum HelpEnum {
    HelpJSON = "JSON",
    JSON = "json"
}
