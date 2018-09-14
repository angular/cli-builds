/**
 * Updates your application and its dependencies.
 */
export interface Schema {
    /**
     * Run through without making any changes.
     */
    dryRun?: boolean;
    /**
     * Shows a help message.
     */
    help?: boolean;
    /**
     * Shows the metadata associated with each flags, in JSON format.
     */
    helpJson?: boolean;
    /**
     * The names of package(s) to update
     */
    packages?: string[];
}
