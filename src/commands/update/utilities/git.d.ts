/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Checks if the git repository is clean.
 * @param root The root directory of the project.
 * @returns True if the repository is clean, false otherwise.
 */
export declare function checkCleanGit(root: string): boolean;
/**
 * Checks if the working directory has pending changes to commit.
 * @returns Whether or not the working directory has Git changes to commit.
 */
export declare function hasChangesToCommit(): boolean;
/**
 * Stages all changes in the Git working tree and creates a new commit.
 * @param message The commit message to use.
 */
export declare function createCommit(message: string): void;
/**
 * Finds the Git SHA hash of the HEAD commit.
 * @returns The Git SHA hash of the HEAD commit. Returns null if unable to retrieve the hash.
 */
export declare function findCurrentGitSha(): string | null;
/**
 * Gets the short hash of a commit.
 * @param commitHash The full commit hash.
 * @returns The short hash (first 9 characters).
 */
export declare function getShortHash(commitHash: string): string;
