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
const command_1 = require("../models/command");
class LintCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.name = 'lint';
        this.target = 'lint';
        this.description = 'Lints code in existing project.';
        this.scope = command_1.CommandScope.inProject;
        this.multiTarget = true;
        this.options = [
            this.configurationOption,
        ];
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.runArchitectTarget(options);
        });
    }
}
LintCommand.aliases = ['l'];
exports.default = LintCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGludC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvbGludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsbUVBQXdGO0FBQ3hGLCtDQUF5RDtBQUd6RCxpQkFBaUMsU0FBUSxvQ0FBZ0I7SUFBekQ7O1FBQ2tCLFNBQUksR0FBRyxNQUFNLENBQUM7UUFDZCxXQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ2hCLGdCQUFXLEdBQUcsaUNBQWlDLENBQUM7UUFFaEQsVUFBSyxHQUFHLHNCQUFZLENBQUMsU0FBUyxDQUFDO1FBQy9CLGdCQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ25CLFlBQU8sR0FBYTtZQUNsQyxJQUFJLENBQUMsbUJBQW1CO1NBQ3pCLENBQUM7SUFLSixDQUFDO0lBSGMsR0FBRyxDQUFDLE9BQWdDOztZQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUM7S0FBQTs7QUFUYSxtQkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFKaEMsOEJBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmQsIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zIH0gZnJvbSAnLi4vbW9kZWxzL2FyY2hpdGVjdC1jb21tYW5kJztcbmltcG9ydCB7IENvbW1hbmRTY29wZSwgT3B0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExpbnRDb21tYW5kIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ2xpbnQnO1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0ID0gJ2xpbnQnO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSAnTGludHMgY29kZSBpbiBleGlzdGluZyBwcm9qZWN0Lic7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsnbCddO1xuICBwdWJsaWMgcmVhZG9ubHkgc2NvcGUgPSBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0O1xuICBwdWJsaWMgcmVhZG9ubHkgbXVsdGlUYXJnZXQgPSB0cnVlO1xuICBwdWJsaWMgcmVhZG9ubHkgb3B0aW9uczogT3B0aW9uW10gPSBbXG4gICAgdGhpcy5jb25maWd1cmF0aW9uT3B0aW9uLFxuICBdO1xuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5ydW5BcmNoaXRlY3RUYXJnZXQob3B0aW9ucyk7XG4gIH1cbn1cbiJdfQ==