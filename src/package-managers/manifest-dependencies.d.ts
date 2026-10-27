/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { Host } from './host';
import type { InstalledPackage } from './package-tree';
/**
 * Resolves installed versions of dependencies declared in the given directory's `package.json`
 * by searching ancestor `node_modules` directories starting from `cwd`.
 *
 * The returned map preserves the declaration order of the manifest.
 */
export declare function resolveManifestDependencies(host: Host, cwd: string, lockfiles: readonly string[]): Promise<Map<string, InstalledPackage>>;
