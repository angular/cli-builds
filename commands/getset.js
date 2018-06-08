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
class GetSetCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'getset';
        this.description = 'Deprecated in favor of config command.';
        this.arguments = [];
        this.options = [];
        this.hidden = true;
    }
    run(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.warn('get/set have been deprecated in favor of the config command.');
        });
    }
}
exports.default = GetSetCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0c2V0LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9nZXRzZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILCtDQUFvRDtBQU9wRCxtQkFBbUMsU0FBUSxpQkFBTztJQUFsRDs7UUFDa0IsU0FBSSxHQUFHLFFBQVEsQ0FBQztRQUNoQixnQkFBVyxHQUFHLHdDQUF3QyxDQUFDO1FBQ3ZELGNBQVMsR0FBYSxFQUFFLENBQUM7UUFDekIsWUFBTyxHQUFhLEVBQUUsQ0FBQztRQUN2QixXQUFNLEdBQUcsSUFBSSxDQUFDO0lBS2hDLENBQUM7SUFIYyxHQUFHLENBQUMsUUFBaUI7O1lBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDhEQUE4RCxDQUFDLENBQUM7UUFDbkYsQ0FBQztLQUFBO0NBQ0Y7QUFWRCxnQ0FVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQ29tbWFuZCwgT3B0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICBrZXl3b3JkOiBzdHJpbmc7XG4gIHNlYXJjaD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdldFNldENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IG5hbWUgPSAnZ2V0c2V0JztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ0RlcHJlY2F0ZWQgaW4gZmF2b3Igb2YgY29uZmlnIGNvbW1hbmQuJztcbiAgcHVibGljIHJlYWRvbmx5IGFyZ3VtZW50czogc3RyaW5nW10gPSBbXTtcbiAgcHVibGljIHJlYWRvbmx5IG9wdGlvbnM6IE9wdGlvbltdID0gW107XG4gIHB1YmxpYyByZWFkb25seSBoaWRkZW4gPSB0cnVlO1xuXG4gIHB1YmxpYyBhc3luYyBydW4oX29wdGlvbnM6IE9wdGlvbnMpIHtcbiAgICB0aGlzLmxvZ2dlci53YXJuKCdnZXQvc2V0IGhhdmUgYmVlbiBkZXByZWNhdGVkIGluIGZhdm9yIG9mIHRoZSBjb25maWcgY29tbWFuZC4nKTtcbiAgfVxufVxuIl19