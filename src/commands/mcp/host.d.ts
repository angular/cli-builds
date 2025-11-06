/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { ChildProcess } from 'node:child_process';
import { Stats } from 'node:fs';
/**
 * An error thrown when a command fails to execute.
 */
export declare class CommandError extends Error {
    readonly logs: string[];
    readonly code: number | null;
    constructor(message: string, logs: string[], code: number | null);
}
/**
 * An abstraction layer for operating-system or file-system operations.
 */
export interface Host {
    /**
     * Gets the stats of a file or directory.
     * @param path The path to the file or directory.
     * @returns A promise that resolves to the stats.
     */
    stat(path: string): Promise<Stats>;
    /**
     * Checks if a path exists on the file system.
     * @param path The path to check.
     * @returns A boolean indicating whether the path exists.
     */
    existsSync(path: string): boolean;
    /**
     * Spawns a child process and returns a promise that resolves with the process's
     * output or rejects with a structured error.
     * @param command The command to run.
     * @param args The arguments to pass to the command.
     * @param options Options for the child process.
     * @returns A promise that resolves with the standard output and standard error of the command.
     */
    runCommand(command: string, args: readonly string[], options?: {
        timeout?: number;
        stdio?: 'pipe' | 'ignore';
        cwd?: string;
        env?: Record<string, string>;
    }): Promise<{
        logs: string[];
    }>;
    /**
     * Spawns a long-running child process and returns the `ChildProcess` object.
     * @param command The command to run.
     * @param args The arguments to pass to the command.
     * @param options Options for the child process.
     * @returns The spawned `ChildProcess` instance.
     */
    spawn(command: string, args: readonly string[], options?: {
        stdio?: 'pipe' | 'ignore';
        cwd?: string;
        env?: Record<string, string>;
    }): ChildProcess;
    /**
     * Finds an available TCP port on the system.
     */
    getAvailablePort(): Promise<number>;
}
/**
 * A concrete implementation of the `Host` interface that runs on a local workspace.
 */
export declare const LocalWorkspaceHost: Host;
