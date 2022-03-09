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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL3V0aWxpdGllcy9qc29uLWZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsMkJBQWlEO0FBQ2pELCtDQVVzQjtBQUt0QixnQkFBZ0I7QUFDaEIsTUFBYSxRQUFRO0lBR25CLFlBQTZCLElBQVk7UUFBWixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUEsaUJBQVksRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsSUFBSSxNQUFNLEVBQUU7WUFDVixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUNsQzthQUFNO1lBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsQ0FBQztTQUM5QztJQUNILENBQUM7SUFHRCxJQUFZLE9BQU87UUFDakIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztTQUN0QjtRQUVELE1BQU0sTUFBTSxHQUFpQixFQUFFLENBQUM7UUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFBLHdCQUFTLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNqQixXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNoQztRQUVELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN2QixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQWtCO1FBQ3BCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7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QWlCLE1BQU0sR0FBRyxDQUM1QixDQUFDO0FBQ0osQ0FBQztBQUVELDhEQUE4RDtBQUM5RCxTQUFnQixTQUFTLENBQUMsT0FBZTtJQUN2QyxPQUFPLElBQUEsb0JBQUssRUFBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUNqRSxDQUFDO0FBRkQsOEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvblZhbHVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHtcbiAgTm9kZSxcbiAgUGFyc2VFcnJvcixcbiAgYXBwbHlFZGl0cyxcbiAgZmluZE5vZGVBdExvY2F0aW9uLFxuICBnZXROb2RlVmFsdWUsXG4gIG1vZGlmeSxcbiAgcGFyc2UsXG4gIHBhcnNlVHJlZSxcbiAgcHJpbnRQYXJzZUVycm9yQ29kZSxcbn0gZnJvbSAnanNvbmMtcGFyc2VyJztcblxuZXhwb3J0IHR5cGUgSW5zZXJ0aW9uSW5kZXggPSAocHJvcGVydGllczogc3RyaW5nW10pID0+IG51bWJlcjtcbmV4cG9ydCB0eXBlIEpTT05QYXRoID0gKHN0cmluZyB8IG51bWJlcilbXTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNsYXNzIEpTT05GaWxlIHtcbiAgY29udGVudDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGF0aDogc3RyaW5nKSB7XG4gICAgY29uc3QgYnVmZmVyID0gcmVhZEZpbGVTeW5jKHRoaXMucGF0aCk7XG4gICAgaWYgKGJ1ZmZlcikge1xuICAgICAgdGhpcy5jb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlYWQgJyR7cGF0aH0nLmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2pzb25Bc3Q6IE5vZGUgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgZ2V0IEpzb25Bc3QoKTogTm9kZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuX2pzb25Bc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLl9qc29uQXN0O1xuICAgIH1cblxuICAgIGNvbnN0IGVycm9yczogUGFyc2VFcnJvcltdID0gW107XG4gICAgdGhpcy5fanNvbkFzdCA9IHBhcnNlVHJlZSh0aGlzLmNvbnRlbnQsIGVycm9ycywgeyBhbGxvd1RyYWlsaW5nQ29tbWE6IHRydWUgfSk7XG4gICAgaWYgKGVycm9ycy5sZW5ndGgpIHtcbiAgICAgIGZvcm1hdEVycm9yKHRoaXMucGF0aCwgZXJyb3JzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fanNvbkFzdDtcbiAgfVxuXG4gIGdldChqc29uUGF0aDogSlNPTlBhdGgpOiB1bmtub3duIHtcbiAgICBjb25zdCBqc29uQXN0Tm9kZSA9IHRoaXMuSnNvbkFzdDtcbiAgICBpZiAoIWpzb25Bc3ROb2RlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmIChqc29uUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBnZXROb2RlVmFsdWUoanNvbkFzdE5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUF0TG9jYXRpb24oanNvbkFzdE5vZGUsIGpzb25QYXRoKTtcblxuICAgIHJldHVybiBub2RlID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBnZXROb2RlVmFsdWUobm9kZSk7XG4gIH1cblxuICBtb2RpZnkoXG4gICAganNvblBhdGg6IEpTT05QYXRoLFxuICAgIHZhbHVlOiBKc29uVmFsdWUgfCB1bmRlZmluZWQsXG4gICAgaW5zZXJ0SW5PcmRlcj86IEluc2VydGlvbkluZGV4IHwgZmFsc2UsXG4gICk6IGJvb2xlYW4ge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkICYmIHRoaXMuZ2V0KGpzb25QYXRoKSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBDYW5ub3QgcmVtb3ZlIGEgdmFsdWUgd2hpY2ggZG9lc24ndCBleGlzdC5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgZ2V0SW5zZXJ0aW9uSW5kZXg6IEluc2VydGlvbkluZGV4IHwgdW5kZWZpbmVkO1xuICAgIGlmIChpbnNlcnRJbk9yZGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0ganNvblBhdGguc2xpY2UoLTEpWzBdO1xuICAgICAgZ2V0SW5zZXJ0aW9uSW5kZXggPSAocHJvcGVydGllcykgPT5cbiAgICAgICAgWy4uLnByb3BlcnRpZXMsIHByb3BlcnR5XS5zb3J0KCkuZmluZEluZGV4KChwKSA9PiBwID09PSBwcm9wZXJ0eSk7XG4gICAgfSBlbHNlIGlmIChpbnNlcnRJbk9yZGVyICE9PSBmYWxzZSkge1xuICAgICAgZ2V0SW5zZXJ0aW9uSW5kZXggPSBpbnNlcnRJbk9yZGVyO1xuICAgIH1cblxuICAgIGNvbnN0IGVkaXRzID0gbW9kaWZ5KHRoaXMuY29udGVudCwganNvblBhdGgsIHZhbHVlLCB7XG4gICAgICBnZXRJbnNlcnRpb25JbmRleCxcbiAgICAgIGZvcm1hdHRpbmdPcHRpb25zOiB7XG4gICAgICAgIGluc2VydFNwYWNlczogdHJ1ZSxcbiAgICAgICAgdGFiU2l6ZTogMixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoZWRpdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZW50ID0gYXBwbHlFZGl0cyh0aGlzLmNvbnRlbnQsIGVkaXRzKTtcbiAgICB0aGlzLl9qc29uQXN0ID0gdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzYXZlKCk6IHZvaWQge1xuICAgIHdyaXRlRmlsZVN5bmModGhpcy5wYXRoLCB0aGlzLmNvbnRlbnQpO1xuICB9XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5leHBvcnQgZnVuY3Rpb24gcmVhZEFuZFBhcnNlSnNvbihwYXRoOiBzdHJpbmcpOiBhbnkge1xuICBjb25zdCBlcnJvcnM6IFBhcnNlRXJyb3JbXSA9IFtdO1xuICBjb25zdCBjb250ZW50ID0gcGFyc2UocmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpLCBlcnJvcnMsIHsgYWxsb3dUcmFpbGluZ0NvbW1hOiB0cnVlIH0pO1xuICBpZiAoZXJyb3JzLmxlbmd0aCkge1xuICAgIGZvcm1hdEVycm9yKHBhdGgsIGVycm9ycyk7XG4gIH1cblxuICByZXR1cm4gY29udGVudDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IocGF0aDogc3RyaW5nLCBlcnJvcnM6IFBhcnNlRXJyb3JbXSk6IG5ldmVyIHtcbiAgY29uc3QgeyBlcnJvciwgb2Zmc2V0IH0gPSBlcnJvcnNbMF07XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICBgRmFpbGVkIHRvIHBhcnNlIFwiJHtwYXRofVwiIGFzIEpTT04gQVNUIE9iamVjdC4gJHtwcmludFBhcnNlRXJyb3JDb2RlKFxuICAgICAgZXJyb3IsXG4gICAgKX0gYXQgbG9jYXRpb246ICR7b2Zmc2V0fS5gLFxuICApO1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnNvbihjb250ZW50OiBzdHJpbmcpOiBhbnkge1xuICByZXR1cm4gcGFyc2UoY29udGVudCwgdW5kZWZpbmVkLCB7IGFsbG93VHJhaWxpbmdDb21tYTogdHJ1ZSB9KTtcbn1cbiJdfQ==