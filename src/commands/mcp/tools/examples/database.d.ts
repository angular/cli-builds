/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { DatabaseSync } from 'node:sqlite';
import type { FindExampleInput } from './schemas';
/**
 * Validates the schema version of the example database.
 *
 * @param db The database connection to validate.
 * @param dbSource A string identifying the source of the database (e.g., 'bundled' or a version number).
 * @throws An error if the schema version is missing or incompatible.
 */
export declare function validateDatabaseSchema(db: DatabaseSync, dbSource: string): void;
export declare function queryDatabase(dbs: DatabaseSync[], input: FindExampleInput): {
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: {
        examples: {
            title: string;
            summary: string;
            keywords: string[];
            required_packages: string[];
            related_concepts: string[];
            related_tools: string[];
            content: string;
            snippet: string;
        }[];
    };
};
