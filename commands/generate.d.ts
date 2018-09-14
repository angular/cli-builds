/**
 * Generates and/or modifies files based on a schematic.
 */
export interface Schema {
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
     * The schematic or collection:schematic to generate.
     */
    schematic?: string;
}
