/**
 * Get/set configuration values.
 */
export interface Schema {
    /**
     * Get/set the value in the global configuration (in your home directory).
     */
    global?: boolean;
    /**
     * Shows a help message. You can pass the format as a value.
     */
    help?: HelpUnion;
    /**
     * The path to the value to get/set.
     */
    jsonPath?: string;
    /**
     * The new value to be set.
     */
    value?: Value;
}
/**
 * Shows a help message. You can pass the format as a value.
 */
export declare type HelpUnion = boolean | HelpEnum;
export declare enum HelpEnum {
    HelpJSON = "JSON",
    JSON = "json"
}
/**
 * The new value to be set.
 */
export declare type Value = boolean | number | string;
