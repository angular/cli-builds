/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { z } from 'zod';
export declare const DOC_SEARCH_TOOL: import("./tool-registry").McpToolDeclaration<{
    query: z.ZodString;
    includeTopContent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.ZodRawShape>;
