/**
 * Opens the official Angular API documentation for a given keyword.
 */
export interface Schema {
    /**
     * Shows a help message. You can pass the format as a value.
     */
    help?: HelpUnion;
    /**
     * The query to search upon.
     */
    keyword?: string;
    /**
     * Search whole angular.io instead of just api.
     */
    search?: boolean;
}
/**
 * Shows a help message. You can pass the format as a value.
 */
export declare type HelpUnion = boolean | HelpEnum;
export declare enum HelpEnum {
    HelpJSON = "JSON",
    JSON = "json"
}
