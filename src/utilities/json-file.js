"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONFile = void 0;
exports.readAndParseJson = readAndParseJson;
exports.parseJson = parseJson;
const jsonc_parser_1 = require("jsonc-parser");
const node_fs_1 = require("node:fs");
const eol_1 = require("./eol");
/** @internal */
class JSONFile {
    path;
    content;
    eol;
    constructor(path) {
        this.path = path;
        const buffer = (0, node_fs_1.readFileSync)(this.path);
        if (buffer) {
            this.content = buffer.toString();
        }
        else {
            throw new Error(`Could not read '${path}'.`);
        }
        this.eol = (0, eol_1.getEOL)(this.content);
    }
    _jsonAst;
    get JsonAst() {
        if (this._jsonAst) {
            return this._jsonAst;
        }
        const errors = [];
        this._jsonAst = (0, jsonc_parser_1.parseTree)(this.content, errors, { allowTrailingComma: true });
        if (errors.length) {
            formatError(this.path, errors);
        }
        return this._jsonAst;
    }
    get(jsonPath) {
        const jsonAstNode = this.JsonAst;
        if (!jsonAstNode) {
            return undefined;
        }
        if (jsonPath.length === 0) {
            return (0, jsonc_parser_1.getNodeValue)(jsonAstNode);
        }
        const node = (0, jsonc_parser_1.findNodeAtLocation)(jsonAstNode, jsonPath);
        return node === undefined ? undefined : (0, jsonc_parser_1.getNodeValue)(node);
    }
    modify(jsonPath, value, insertInOrder) {
        if (value === undefined && this.get(jsonPath) === undefined) {
            // Cannot remove a value which doesn't exist.
            return false;
        }
        let getInsertionIndex;
        if (insertInOrder === undefined) {
            const property = jsonPath.slice(-1)[0];
            getInsertionIndex = (properties) => [...properties, property].sort().findIndex((p) => p === property);
        }
        else if (insertInOrder !== false) {
            getInsertionIndex = insertInOrder;
        }
        const edits = (0, jsonc_parser_1.modify)(this.content, jsonPath, value, {
            getInsertionIndex,
            // TODO: use indentation from original file.
            formattingOptions: {
                insertSpaces: true,
                tabSize: 2,
                eol: this.eol,
            },
        });
        if (edits.length === 0) {
            return false;
        }
        this.content = (0, jsonc_parser_1.applyEdits)(this.content, edits);
        this._jsonAst = undefined;
        return true;
    }
    save() {
        (0, node_fs_1.writeFileSync)(this.path, this.content);
    }
}
exports.JSONFile = JSONFile;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readAndParseJson(path) {
    const errors = [];
    const content = (0, jsonc_parser_1.parse)((0, node_fs_1.readFileSync)(path, 'utf-8'), errors, { allowTrailingComma: true });
    if (errors.length) {
        formatError(path, errors);
    }
    return content;
}
function formatError(path, errors) {
    const { error, offset } = errors[0];
    throw new Error(`Failed to parse "${path}" as JSON AST Object. ${(0, jsonc_parser_1.printParseErrorCode)(error)} at location: ${offset}.`);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJson(content) {
    return (0, jsonc_parser_1.parse)(content, undefined, { allowTrailingComma: true });
}
