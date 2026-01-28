/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
/**
 * Formats files using Prettier.
 * @param cwd The current working directory.
 * @param files The files to format.
 */
export declare function formatFiles(cwd: string, files: Set<string>): Promise<void>;
