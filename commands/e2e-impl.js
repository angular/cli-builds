"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2eCommand = void 0;
const architect_command_1 = require("../models/architect-command");
class E2eCommand extends architect_command_1.ArchitectCommand {
    constructor() {
        super(...arguments);
        this.target = 'e2e';
        this.multiTarget = true;
        this.missingTargetError = `
Cannot find "e2e" target for the specified project.

You should add a package that implements end-to-end testing capabilities.

For example:
  Cypress: ng add @cypress/schematic
  Nightwatch: ng add @nightwatch/schematics
  WebdriverIO: ng add @wdio/schematics

More options will be added to the list as they become available.
`;
    }
    async initialize(options) {
        if (!options.help) {
            return super.initialize(options);
        }
    }
}
exports.E2eCommand = E2eCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZTJlLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9lMmUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxtRUFBK0Q7QUFJL0QsTUFBYSxVQUFXLFNBQVEsb0NBQWtDO0lBQWxFOztRQUMyQixXQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ2YsZ0JBQVcsR0FBRyxJQUFJLENBQUM7UUFDbkIsdUJBQWtCLEdBQUc7Ozs7Ozs7Ozs7O0NBVy9DLENBQUM7SUFPRixDQUFDO0lBTFUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFxQztRQUM3RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtZQUNqQixPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDbEM7SUFDSCxDQUFDO0NBQ0Y7QUFyQkQsZ0NBcUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvYXJjaGl0ZWN0LWNvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlQ29tbWFuZFNjaGVtYSB9IGZyb20gJy4vZTJlJztcblxuZXhwb3J0IGNsYXNzIEUyZUNvbW1hbmQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kPEUyZUNvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIG92ZXJyaWRlIHJlYWRvbmx5IHRhcmdldCA9ICdlMmUnO1xuICBwdWJsaWMgb3ZlcnJpZGUgcmVhZG9ubHkgbXVsdGlUYXJnZXQgPSB0cnVlO1xuICBwdWJsaWMgb3ZlcnJpZGUgcmVhZG9ubHkgbWlzc2luZ1RhcmdldEVycm9yID0gYFxuQ2Fubm90IGZpbmQgXCJlMmVcIiB0YXJnZXQgZm9yIHRoZSBzcGVjaWZpZWQgcHJvamVjdC5cblxuWW91IHNob3VsZCBhZGQgYSBwYWNrYWdlIHRoYXQgaW1wbGVtZW50cyBlbmQtdG8tZW5kIHRlc3RpbmcgY2FwYWJpbGl0aWVzLlxuXG5Gb3IgZXhhbXBsZTpcbiAgQ3lwcmVzczogbmcgYWRkIEBjeXByZXNzL3NjaGVtYXRpY1xuICBOaWdodHdhdGNoOiBuZyBhZGQgQG5pZ2h0d2F0Y2gvc2NoZW1hdGljc1xuICBXZWJkcml2ZXJJTzogbmcgYWRkIEB3ZGlvL3NjaGVtYXRpY3NcblxuTW9yZSBvcHRpb25zIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGxpc3QgYXMgdGhleSBiZWNvbWUgYXZhaWxhYmxlLlxuYDtcblxuICBvdmVycmlkZSBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEUyZUNvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMpIHtcbiAgICBpZiAoIW9wdGlvbnMuaGVscCkge1xuICAgICAgcmV0dXJuIHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgfVxuICB9XG59XG4iXX0=