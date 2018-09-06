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
const architect_command_1 = require("../models/architect-command");
const version_1 = require("../upgrade/version");
class BuildCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'build';
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check Angular and TypeScript versions.
            version_1.Version.assertCompatibleAngularVersion(this.workspace.root);
            version_1.Version.assertTypescriptVersion(this.workspace.root);
            return this.runArchitectTarget(options);
        });
    }
}
exports.BuildCommand = BuildCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvYnVpbGQtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsbUVBQXdGO0FBQ3hGLGdEQUE2QztBQUU3QyxNQUFhLFlBQWEsU0FBUSxvQ0FBZ0I7SUFBbEQ7O1FBQ2tCLFdBQU0sR0FBRyxPQUFPLENBQUM7SUFTbkMsQ0FBQztJQVBjLEdBQUcsQ0FBQyxPQUFnQzs7WUFDL0MseUNBQXlDO1lBQ3pDLGlCQUFPLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxpQkFBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFckQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQztLQUFBO0NBQ0Y7QUFWRCxvQ0FVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJjaGl0ZWN0Q29tbWFuZCwgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgVmVyc2lvbiB9IGZyb20gJy4uL3VwZ3JhZGUvdmVyc2lvbic7XG5cbmV4cG9ydCBjbGFzcyBCdWlsZENvbW1hbmQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IHRhcmdldCA9ICdidWlsZCc7XG5cbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucykge1xuICAgIC8vIENoZWNrIEFuZ3VsYXIgYW5kIFR5cGVTY3JpcHQgdmVyc2lvbnMuXG4gICAgVmVyc2lvbi5hc3NlcnRDb21wYXRpYmxlQW5ndWxhclZlcnNpb24odGhpcy53b3Jrc3BhY2Uucm9vdCk7XG4gICAgVmVyc2lvbi5hc3NlcnRUeXBlc2NyaXB0VmVyc2lvbih0aGlzLndvcmtzcGFjZS5yb290KTtcblxuICAgIHJldHVybiB0aGlzLnJ1bkFyY2hpdGVjdFRhcmdldChvcHRpb25zKTtcbiAgfVxufVxuIl19