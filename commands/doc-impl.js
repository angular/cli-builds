"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const opn = require('opn');
class DocCommand extends command_1.Command {
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchUrl = `https://angular.io/api?query=${options.keyword}`;
            if (options.search) {
                searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
            }
            return opn(searchUrl, {
                wait: false,
            });
        });
    }
}
exports.DocCommand = DocCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2RvYy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCwrQ0FBZ0U7QUFDaEUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBTzNCLGdCQUF5RSxTQUFRLGlCQUFVO0lBQzVFLEdBQUcsQ0FBQyxPQUFVOztZQUN6QixJQUFJLFNBQVMsR0FBRyxnQ0FBZ0MsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xFLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDbEIsU0FBUyxHQUFHLHFEQUFxRCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDcEY7WUFFRCxPQUFPLEdBQUcsQ0FBQyxTQUFTLEVBQUU7Z0JBQ3BCLElBQUksRUFBRSxLQUFLO2FBQ1osQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0NBQ0Y7QUFYRCxnQ0FXQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQmFzZUNvbW1hbmRPcHRpb25zLCBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuY29uc3Qgb3BuID0gcmVxdWlyZSgnb3BuJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9jQ29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBCYXNlQ29tbWFuZE9wdGlvbnMge1xuICBrZXl3b3JkOiBzdHJpbmc7XG4gIHNlYXJjaD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBEb2NDb21tYW5kPFQgZXh0ZW5kcyBEb2NDb21tYW5kT3B0aW9ucyA9IERvY0NvbW1hbmRPcHRpb25zPiBleHRlbmRzIENvbW1hbmQ8VD4ge1xuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IFQpIHtcbiAgICBsZXQgc2VhcmNoVXJsID0gYGh0dHBzOi8vYW5ndWxhci5pby9hcGk/cXVlcnk9JHtvcHRpb25zLmtleXdvcmR9YDtcbiAgICBpZiAob3B0aW9ucy5zZWFyY2gpIHtcbiAgICAgIHNlYXJjaFVybCA9IGBodHRwczovL3d3dy5nb29nbGUuY29tL3NlYXJjaD9xPXNpdGUlM0Fhbmd1bGFyLmlvKyR7b3B0aW9ucy5rZXl3b3JkfWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wbihzZWFyY2hVcmwsIHtcbiAgICAgIHdhaXQ6IGZhbHNlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=