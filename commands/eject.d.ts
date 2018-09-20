/**
 * Temporarily disabled. Ejects your app and output the proper webpack configuration and
 * scripts.
 */
export interface Schema {
    /**
     * Shows a help message. You can pass the format as a value.
     */
    help?: HelpUnion;
}
/**
 * Shows a help message. You can pass the format as a value.
 */
export declare type HelpUnion = boolean | HelpEnum;
export declare enum HelpEnum {
    HelpJSON = "JSON",
    JSON = "json"
}
