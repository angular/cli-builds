/**
 * Opens the official Angular API documentation for a given keyword.
 */
export interface Schema {
    /**
     * Shows a help message.
     */
    help?: boolean;
    /**
     * Shows the metadata associated with each flags, in JSON format.
     */
    helpJson?: boolean;
    /**
     * The query to search upon.
     */
    keyword?: string;
    /**
     * Search whole angular.io instead of just api.
     */
    search?: boolean;
}
