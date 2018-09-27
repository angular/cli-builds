/**
 * Add support for a library to your project.
 */
export interface Schema {
    /**
     * The package to be added.
     */
    collection?: string;
    /**
     * Disables interactive inputs (i.e., prompts) for options with a default.
     */
    defaults?: boolean;
    /**
     * Run through without making any changes.
     */
    dryRun?: boolean;
    /**
     * Forces overwriting of files.
     */
    force?: boolean;
    /**
     * Shows a help message. You can pass the format as a value.
     */
    help?: HelpUnion;
    /**
     * Disables interactive inputs (i.e., prompts).
     */
    interactive?: boolean;
}
/**
 * Shows a help message. You can pass the format as a value.
 */
export declare type HelpUnion = boolean | HelpEnum;
export declare enum HelpEnum {
    HelpJSON = "JSON",
    JSON = "json"
}
