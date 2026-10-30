/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Cache } from '../../../lib/config/workspace-schema';
import { AngularWorkspace } from '../../utilities/config';
export declare function updateCacheConfig<K extends keyof Cache>(workspace: AngularWorkspace, key: K, value: Cache[K]): Promise<void>;
export interface CacheConfig extends Required<Cache> {
    /**
     * The cache path resolved against the workspace itself. In a Git worktree, `path` is shared
     * with the main checkout, while the development server keeps its Vite cache in this path.
     */
    localPath: string;
}
export declare function getCacheConfig(workspace: AngularWorkspace | undefined): CacheConfig;
