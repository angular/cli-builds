/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import { CommandDescription, Option } from '../models/interface';
export declare function parseJsonSchemaToCommandDescription(name: string, jsonPath: string, registry: json.schema.SchemaRegistry, schema: json.JsonObject): Promise<CommandDescription>;
export declare function parseJsonSchemaToOptions(registry: json.schema.SchemaRegistry, schema: json.JsonObject): Promise<Option[]>;
