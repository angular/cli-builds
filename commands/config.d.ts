/**
 * Get/set configuration values.
 */
export interface Schema {
    /**
     * Get/set the value in the global configuration (in your home directory).
     */
    global?: boolean;
    /**
     * Shows a help message.
     */
    help?: boolean;
    /**
     * Shows the metadata associated with each flags, in JSON format.
     */
    helpJson?: boolean;
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
 * The new value to be set.
 */
export declare type Value = boolean | number | string;
