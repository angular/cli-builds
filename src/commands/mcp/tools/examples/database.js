"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDatabaseSchema = validateDatabaseSchema;
exports.queryDatabase = queryDatabase;
const query_escaper_1 = require("./query-escaper");
const EXPECTED_SCHEMA_VERSION = 1;
/**
 * Validates the schema version of the example database.
 *
 * @param db The database connection to validate.
 * @param dbSource A string identifying the source of the database (e.g., 'bundled' or a version number).
 * @throws An error if the schema version is missing or incompatible.
 */
function validateDatabaseSchema(db, dbSource) {
    const schemaVersionResult = db
        .prepare('SELECT value FROM metadata WHERE key = ?')
        .get('schema_version');
    const actualSchemaVersion = schemaVersionResult ? Number(schemaVersionResult.value) : undefined;
    if (actualSchemaVersion !== EXPECTED_SCHEMA_VERSION) {
        db.close();
        let errorMessage;
        if (actualSchemaVersion === undefined) {
            errorMessage = 'The example database is missing a schema version and cannot be used.';
        }
        else if (actualSchemaVersion > EXPECTED_SCHEMA_VERSION) {
            errorMessage =
                `This project's example database (version ${actualSchemaVersion})` +
                    ` is newer than what this version of the Angular CLI supports (version ${EXPECTED_SCHEMA_VERSION}).` +
                    ' Please update your `@angular/cli` package to a newer version.';
        }
        else {
            errorMessage =
                `This version of the Angular CLI (expects schema version ${EXPECTED_SCHEMA_VERSION})` +
                    ` requires a newer example database than the one found in this project (version ${actualSchemaVersion}).`;
        }
        throw new Error(`Incompatible example database schema from source '${dbSource}':\n${errorMessage}`);
    }
}
function queryDatabase(dbs, input) {
    const { query, keywords, required_packages, related_concepts, includeExperimental } = input;
    // Build the query dynamically
    const params = [];
    let sql = `SELECT e.title, e.summary, e.keywords, e.required_packages, e.related_concepts, e.related_tools, e.content, ` +
        // The `snippet` function generates a contextual snippet of the matched text.
        // Column 6 is the `content` column. We highlight matches with asterisks and limit the snippet size.
        "snippet(examples_fts, 6, '**', '**', '...', 15) AS snippet, " +
        // The `bm25` function returns the relevance score of the match. The weights
        // assigned to each column boost the ranking of documents where the search
        // term appears in a more important field.
        // Column order: title, summary, keywords, required_packages, related_concepts, related_tools, content
        'bm25(examples_fts, 10.0, 5.0, 5.0, 1.0, 2.0, 1.0, 1.0) AS rank ' +
        'FROM examples e JOIN examples_fts ON e.id = examples_fts.rowid';
    const whereClauses = [];
    // FTS query
    if (query) {
        whereClauses.push('examples_fts MATCH ?');
        params.push((0, query_escaper_1.escapeSearchQuery)(query));
    }
    // JSON array filters
    const addJsonFilter = (column, values) => {
        if (values?.length) {
            for (const value of values) {
                whereClauses.push(`e.${column} LIKE ?`);
                params.push(`%"${value}"%`);
            }
        }
    };
    addJsonFilter('keywords', keywords);
    addJsonFilter('required_packages', required_packages);
    addJsonFilter('related_concepts', related_concepts);
    if (!includeExperimental) {
        whereClauses.push('e.experimental = 0');
    }
    if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    // Query database and return results
    const examples = [];
    const textContent = [];
    for (const db of dbs) {
        const queryStatement = db.prepare(sql);
        for (const exampleRecord of queryStatement.all(...params)) {
            const record = exampleRecord;
            const example = {
                title: record['title'],
                summary: record['summary'],
                keywords: JSON.parse(record['keywords'] || '[]'),
                required_packages: JSON.parse(record['required_packages'] || '[]'),
                related_concepts: JSON.parse(record['related_concepts'] || '[]'),
                related_tools: JSON.parse(record['related_tools'] || '[]'),
                content: record['content'],
                snippet: record['snippet'],
                rank: record['rank'],
            };
            examples.push(example);
        }
    }
    // Order the combined results by relevance.
    // The `bm25` algorithm returns a smaller number for a more relevant match.
    examples.sort((a, b) => a.rank - b.rank);
    // The `rank` field is an internal implementation detail for sorting and should not be
    // returned to the user. We create a new array of examples without the `rank`.
    const finalExamples = examples.map(({ rank, ...rest }) => rest);
    for (const example of finalExamples) {
        // Also create a more structured text output
        let text = `## Example: ${example.title}\n**Summary:** ${example.summary}`;
        if (example.snippet) {
            text += `\n**Snippet:** ${example.snippet}`;
        }
        text += `\n\n---\n\n${example.content}`;
        textContent.push({ type: 'text', text });
    }
    return {
        content: textContent,
        structuredContent: { examples: finalExamples },
    };
}
//# sourceMappingURL=database.js.map