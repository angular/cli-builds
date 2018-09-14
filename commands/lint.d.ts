/**
 * Lints code in existing project.
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
     * The name of the project to lint.
     */
    project?: string;
}
