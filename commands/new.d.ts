/**
 * Creates a new directory and a new Angular app.
 */
export interface Schema {
    /**
     * Schematics collection to use.
     */
    collection?: string;
    /**
     * Run through without making any changes.
     */
    dryRun?: boolean;
    /**
     * Forces overwriting of files.
     */
    force?: boolean;
    /**
     * Shows a help message.
     */
    help?: boolean;
    /**
     * Shows the metadata associated with each flags, in JSON format.
     */
    helpJson?: boolean;
    /**
     * Disables interactive inputs (i.e., prompts).
     */
    interactive?: boolean;
    /**
     * Adds more details to output logging.
     */
    verbose?: boolean;
}
