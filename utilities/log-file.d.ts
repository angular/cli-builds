/**
 * Writes an Error to a temporary log file.
 * If this method is called multiple times from the same process the same log file will be used.
 * @returns The path of the generated log file.
 */
export declare function writeErrorToLogFile(error: Error): string;
