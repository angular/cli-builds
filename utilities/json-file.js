"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJson = exports.readAndParseJson = exports.JSONFile = void 0;
const fs_1 = require("fs");
const jsonc_parser_1 = require("jsonc-parser");
/** @internal */
class JSONFile {
    constructor(path) {
        this.path = path;
        const buffer = (0, fs_1.readFileSync)(this.path);
        if (buffer) {
            this.content = buffer.toString();
        }
        else {
            throw new Error(`Could not read '${path}'.`);
        }
    }
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
            formattingOptions: {
                insertSpaces: true,
                tabSize: 2,
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
        (0, fs_1.writeFileSync)(this.path, this.content);
    }
}
exports.JSONFile = JSONFile;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readAndParseJson(path) {
    const errors = [];
    const content = (0, jsonc_parser_1.parse)((0, fs_1.readFileSync)(path, 'utf-8'), errors, { allowTrailingComma: true });
    if (errors.length) {
        formatError(path, errors);
    }
    return content;
}
exports.readAndParseJson = readAndParseJson;
function formatError(path, errors) {
    const { error, offset } = errors[0];
    throw new Error(`Failed to parse "${path}" as JSON AST Object. ${(0, jsonc_parser_1.printParseErrorCode)(error)} at location: ${offset}.`);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJson(content) {
    return (0, jsonc_parser_1.parse)(content, undefined, { allowTrailingComma: true });
}
exports.parseJson = parseJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL2pzb24tZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCwyQkFBaUQ7QUFDakQsK0NBVXNCO0FBS3RCLGdCQUFnQjtBQUNoQixNQUFhLFFBQVE7SUFHbkIsWUFBNkIsSUFBWTtRQUFaLFNBQUksR0FBSixJQUFJLENBQVE7UUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBQSxpQkFBWSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLE1BQU0sRUFBRTtZQUNWLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ2xDO2FBQU07WUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQyxDQUFDO1NBQzlDO0lBQ0gsQ0FBQztJQUdELElBQVksT0FBTztRQUNqQixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO1NBQ3RCO1FBRUQsTUFBTSxNQUFNLEdBQWlCLEVBQUUsQ0FBQztRQUNoQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUEsd0JBQVMsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDOUUsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ2pCLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ2hDO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBa0I7UUFDcEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUNqQyxJ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TSxHQUFHLENBQzVCLENBQUM7QUFDSixDQUFDO0FBRUQsOERBQThEO0FBQzlELFNBQWdCLFNBQVMsQ0FBQyxPQUFlO0lBQ3ZDLE9BQU8sSUFBQSxvQkFBSyxFQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFLENBQUM7QUFGRCw4QkFFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQge1xuICBOb2RlLFxuICBQYXJzZUVycm9yLFxuICBhcHBseUVkaXRzLFxuICBmaW5kTm9kZUF0TG9jYXRpb24sXG4gIGdldE5vZGVWYWx1ZSxcbiAgbW9kaWZ5LFxuICBwYXJzZSxcbiAgcGFyc2VUcmVlLFxuICBwcmludFBhcnNlRXJyb3JDb2RlLFxufSBmcm9tICdqc29uYy1wYXJzZXInO1xuXG5leHBvcnQgdHlwZSBJbnNlcnRpb25JbmRleCA9IChwcm9wZXJ0aWVzOiBzdHJpbmdbXSkgPT4gbnVtYmVyO1xuZXhwb3J0IHR5cGUgSlNPTlBhdGggPSAoc3RyaW5nIHwgbnVtYmVyKVtdO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY2xhc3MgSlNPTkZpbGUge1xuICBjb250ZW50OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zdCBidWZmZXIgPSByZWFkRmlsZVN5bmModGhpcy5wYXRoKTtcbiAgICBpZiAoYnVmZmVyKSB7XG4gICAgICB0aGlzLmNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVhZCAnJHtwYXRofScuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfanNvbkFzdDogTm9kZSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBnZXQgSnNvbkFzdCgpOiBOb2RlIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5fanNvbkFzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2pzb25Bc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgZXJyb3JzOiBQYXJzZUVycm9yW10gPSBbXTtcbiAgICB0aGlzLl9qc29uQXN0ID0gcGFyc2VUcmVlKHRoaXMuY29udGVudCwgZXJyb3JzLCB7IGFsbG93VHJhaWxpbmdDb21tYTogdHJ1ZSB9KTtcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCkge1xuICAgICAgZm9ybWF0RXJyb3IodGhpcy5wYXRoLCBlcnJvcnMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9qc29uQXN0O1xuICB9XG5cbiAgZ2V0KGpzb25QYXRoOiBKU09OUGF0aCk6IHVua25vd24ge1xuICAgIGNvbnN0IGpzb25Bc3ROb2RlID0gdGhpcy5Kc29uQXN0O1xuICAgIGlmICghanNvbkFzdE5vZGUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKGpzb25QYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGdldE5vZGVWYWx1ZShqc29uQXN0Tm9kZSk7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlQXRMb2NhdGlvbihqc29uQXN0Tm9kZSwganNvblBhdGgpO1xuXG4gICAgcmV0dXJuIG5vZGUgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IGdldE5vZGVWYWx1ZShub2RlKTtcbiAgfVxuXG4gIG1vZGlmeShcbiAgICBqc29uUGF0aDogSlNPTlBhdGgsXG4gICAgdmFsdWU6IEpzb25WYWx1ZSB8IHVuZGVmaW5lZCxcbiAgICBpbnNlcnRJbk9yZGVyPzogSW5zZXJ0aW9uSW5kZXggfCBmYWxzZSxcbiAgKTogYm9vbGVhbiB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgJiYgdGhpcy5nZXQoanNvblBhdGgpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIENhbm5vdCByZW1vdmUgYSB2YWx1ZSB3aGljaCBkb2Vzbid0IGV4aXN0LlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBnZXRJbnNlcnRpb25JbmRleDogSW5zZXJ0aW9uSW5kZXggfCB1bmRlZmluZWQ7XG4gICAgaWYgKGluc2VydEluT3JkZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSBqc29uUGF0aC5zbGljZSgtMSlbMF07XG4gICAgICBnZXRJbnNlcnRpb25JbmRleCA9IChwcm9wZXJ0aWVzKSA9PlxuICAgICAgICBbLi4ucHJvcGVydGllcywgcHJvcGVydHldLnNvcnQoKS5maW5kSW5kZXgoKHApID0+IHAgPT09IHByb3BlcnR5KTtcbiAgICB9IGVsc2UgaWYgKGluc2VydEluT3JkZXIgIT09IGZhbHNlKSB7XG4gICAgICBnZXRJbnNlcnRpb25JbmRleCA9IGluc2VydEluT3JkZXI7XG4gICAgfVxuXG4gICAgY29uc3QgZWRpdHMgPSBtb2RpZnkodGhpcy5jb250ZW50LCBqc29uUGF0aCwgdmFsdWUsIHtcbiAgICAgIGdldEluc2VydGlvbkluZGV4LFxuICAgICAgZm9ybWF0dGluZ09wdGlvbnM6IHtcbiAgICAgICAgaW5zZXJ0U3BhY2VzOiB0cnVlLFxuICAgICAgICB0YWJTaXplOiAyLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGlmIChlZGl0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRlbnQgPSBhcHBseUVkaXRzKHRoaXMuY29udGVudCwgZWRpdHMpO1xuICAgIHRoaXMuX2pzb25Bc3QgPSB1bmRlZmluZWQ7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHNhdmUoKTogdm9pZCB7XG4gICAgd3JpdGVGaWxlU3luYyh0aGlzLnBhdGgsIHRoaXMuY29udGVudCk7XG4gIH1cbn1cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmV4cG9ydCBmdW5jdGlvbiByZWFkQW5kUGFyc2VKc29uKHBhdGg6IHN0cmluZyk6IGFueSB7XG4gIGNvbnN0IGVycm9yczogUGFyc2VFcnJvcltdID0gW107XG4gIGNvbnN0IGNvbnRlbnQgPSBwYXJzZShyZWFkRmlsZVN5bmMocGF0aCwgJ3V0Zi04JyksIGVycm9ycywgeyBhbGxvd1RyYWlsaW5nQ29tbWE6IHRydWUgfSk7XG4gIGlmIChlcnJvcnMubGVuZ3RoKSB7XG4gICAgZm9ybWF0RXJyb3IocGF0aCwgZXJyb3JzKTtcbiAgfVxuXG4gIHJldHVybiBjb250ZW50O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcihwYXRoOiBzdHJpbmcsIGVycm9yczogUGFyc2VFcnJvcltdKTogbmV2ZXIge1xuICBjb25zdCB7IGVycm9yLCBvZmZzZXQgfSA9IGVycm9yc1swXTtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIGBGYWlsZWQgdG8gcGFyc2UgXCIke3BhdGh9XCIgYXMgSlNPTiBBU1QgT2JqZWN0LiAke3ByaW50UGFyc2VFcnJvckNvZGUoXG4gICAgICBlcnJvcixcbiAgICApfSBhdCBsb2NhdGlvbjogJHtvZmZzZXR9LmAsXG4gICk7XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKc29uKGNvbnRlbnQ6IHN0cmluZyk6IGFueSB7XG4gIHJldHVybiBwYXJzZShjb250ZW50LCB1bmRlZmluZWQsIHsgYWxsb3dUcmFpbGluZ0NvbW1hOiB0cnVlIH0pO1xufVxuIl19