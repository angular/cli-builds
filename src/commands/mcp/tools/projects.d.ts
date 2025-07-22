/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { AngularWorkspace } from '../../../utilities/config';
export declare function registerListProjectsTool(server: McpServer, context: {
    workspace?: AngularWorkspace;
}): void;
