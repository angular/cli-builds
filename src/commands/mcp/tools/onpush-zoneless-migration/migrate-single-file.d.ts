/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { ServerContext } from '@modelcontextprotocol/server';
import type { SourceFile } from 'typescript';
import type { Host } from '../../host';
import type { MigrationResponse } from './types';
export declare function migrateSingleFile(sourceFile: SourceFile, host: Host, extras: ServerContext): Promise<MigrationResponse | null>;
