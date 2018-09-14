/**
 * Runs Architect targets.
 */
export interface Schema {
    /**
     * Specify the configuration to use.
     */
    configuration?: string;
    /**
     * Shows a help message.
     */
    help?: boolean;
    /**
     * Shows the metadata associated with each flags, in JSON format.
     */
    helpJson?: boolean;
    /**
     * The target to run.
     */
    target?: string;
}
