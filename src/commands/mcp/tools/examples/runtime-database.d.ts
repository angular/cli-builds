/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { DatabaseSync } from 'node:sqlite';
export declare function setupRuntimeExamples(examplesPath: string): Promise<DatabaseSync>;
