/**
 * Lists available commands and their short descriptions in the console.
 * &nbsp &nbsp For help with individual commands, use the "--help" or "-h" option with the
 * command.
 */
export interface Schema {
    /**
     * Shows a help message for this command in the console.
     */
    help?: HelpUnion;
}
/**
 * Shows a help message for this command in the console.
 */
export declare type HelpUnion = boolean | HelpEnum;
export declare enum HelpEnum {
    HelpJSON = "JSON",
    JSON = "json"
}
