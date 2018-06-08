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
    constructor() {
        super(...arguments);
        this.name = 'doc';
        this.description = 'Opens the official Angular API documentation for a given keyword.';
        this.arguments = ['keyword'];
        this.options = [
            {
                name: 'search',
                aliases: ['s'],
                type: Boolean,
                default: false,
                description: 'Search whole angular.io instead of just api.',
            },
        ];
    }
    validate(options) {
        if (!options.keyword) {
            this.logger.error(`keyword argument is required.`);
            return false;
        }
        return true;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchUrl = `https://angular.io/api?query=${options.keyword}`;
            if (options.search) {
                searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
            }
            return opn(searchUrl);
        });
    }
}
DocCommand.aliases = ['d'];
exports.default = DocCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9kb2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILCtDQUE0QztBQUM1QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFPM0IsZ0JBQWdDLFNBQVEsaUJBQU87SUFBL0M7O1FBQ2tCLFNBQUksR0FBRyxLQUFLLENBQUM7UUFDYixnQkFBVyxHQUFHLG1FQUFtRSxDQUFDO1FBRWxGLGNBQVMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hCLFlBQU8sR0FBRztZQUN4QjtnQkFDRSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsV0FBVyxFQUFFLDhDQUE4QzthQUM1RDtTQUNGLENBQUM7SUFvQkosQ0FBQztJQWxCUSxRQUFRLENBQUMsT0FBZ0I7UUFDOUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFWSxHQUFHLENBQUMsT0FBZ0I7O1lBQy9CLElBQUksU0FBUyxHQUFHLGdDQUFnQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLFNBQVMsR0FBRyxxREFBcUQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JGLENBQUM7WUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7S0FBQTs7QUE3QmEsa0JBQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSGhDLDZCQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmNvbnN0IG9wbiA9IHJlcXVpcmUoJ29wbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICBrZXl3b3JkOiBzdHJpbmc7XG4gIHNlYXJjaD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERvY0NvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IG5hbWUgPSAnZG9jJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ09wZW5zIHRoZSBvZmZpY2lhbCBBbmd1bGFyIEFQSSBkb2N1bWVudGF0aW9uIGZvciBhIGdpdmVuIGtleXdvcmQuJztcbiAgcHVibGljIHN0YXRpYyBhbGlhc2VzID0gWydkJ107XG4gIHB1YmxpYyByZWFkb25seSBhcmd1bWVudHMgPSBbJ2tleXdvcmQnXTtcbiAgcHVibGljIHJlYWRvbmx5IG9wdGlvbnMgPSBbXG4gICAge1xuICAgICAgbmFtZTogJ3NlYXJjaCcsXG4gICAgICBhbGlhc2VzOiBbJ3MnXSxcbiAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VhcmNoIHdob2xlIGFuZ3VsYXIuaW8gaW5zdGVhZCBvZiBqdXN0IGFwaS4nLFxuICAgIH0sXG4gIF07XG5cbiAgcHVibGljIHZhbGlkYXRlKG9wdGlvbnM6IE9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMua2V5d29yZCkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoYGtleXdvcmQgYXJndW1lbnQgaXMgcmVxdWlyZWQuYCk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogT3B0aW9ucykge1xuICAgIGxldCBzZWFyY2hVcmwgPSBgaHR0cHM6Ly9hbmd1bGFyLmlvL2FwaT9xdWVyeT0ke29wdGlvbnMua2V5d29yZH1gO1xuICAgIGlmIChvcHRpb25zLnNlYXJjaCkge1xuICAgICAgc2VhcmNoVXJsID0gYGh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vc2VhcmNoP3E9c2l0ZSUzQWFuZ3VsYXIuaW8rJHtvcHRpb25zLmtleXdvcmR9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gb3BuKHNlYXJjaFVybCk7XG4gIH1cbn1cbiJdfQ==