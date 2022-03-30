"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2eCommandModule = void 0;
const core_1 = require("@angular-devkit/core");
const architect_command_module_1 = require("../../command-builder/architect-command-module");
class E2eCommandModule extends architect_command_module_1.ArchitectCommandModule {
    constructor() {
        super(...arguments);
        this.multiTarget = true;
        this.missingErrorTarget = core_1.tags.stripIndents `
  Cannot find "e2e" target for the specified project.

  You should add a package that implements end-to-end testing capabilities.

  For example:
    Cypress: ng add @cypress/schematic
    Nightwatch: ng add @nightwatch/schematics
    WebdriverIO: ng add @wdio/schematics

  More options will be added to the list as they become available.
  `;
        this.command = 'e2e [project]';
        this.aliases = ['e'];
        this.describe = 'Builds and serves an Angular application, then runs end-to-end tests.';
    }
}
exports.E2eCommandModule = E2eCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2UyZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsK0NBQTRDO0FBQzVDLDZGQUF3RjtBQUd4RixNQUFhLGdCQUNYLFNBQVEsaURBQXNCO0lBRGhDOztRQUlFLGdCQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ1YsdUJBQWtCLEdBQUcsV0FBSSxDQUFDLFlBQVksQ0FBQTs7Ozs7Ozs7Ozs7R0FXOUMsQ0FBQztRQUVGLFlBQU8sR0FBRyxlQUFlLENBQUM7UUFDMUIsWUFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEIsYUFBUSxHQUFHLHVFQUF1RSxDQUFDO0lBRXJGLENBQUM7Q0FBQTtBQXRCRCw0Q0FzQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyY2hpdGVjdENvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvYXJjaGl0ZWN0LWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5cbmV4cG9ydCBjbGFzcyBFMmVDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQXJjaGl0ZWN0Q29tbWFuZE1vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvblxue1xuICBtdWx0aVRhcmdldCA9IHRydWU7XG4gIG92ZXJyaWRlIG1pc3NpbmdFcnJvclRhcmdldCA9IHRhZ3Muc3RyaXBJbmRlbnRzYFxuICBDYW5ub3QgZmluZCBcImUyZVwiIHRhcmdldCBmb3IgdGhlIHNwZWNpZmllZCBwcm9qZWN0LlxuXG4gIFlvdSBzaG91bGQgYWRkIGEgcGFja2FnZSB0aGF0IGltcGxlbWVudHMgZW5kLXRvLWVuZCB0ZXN0aW5nIGNhcGFiaWxpdGllcy5cblxuICBGb3IgZXhhbXBsZTpcbiAgICBDeXByZXNzOiBuZyBhZGQgQGN5cHJlc3Mvc2NoZW1hdGljXG4gICAgTmlnaHR3YXRjaDogbmcgYWRkIEBuaWdodHdhdGNoL3NjaGVtYXRpY3NcbiAgICBXZWJkcml2ZXJJTzogbmcgYWRkIEB3ZGlvL3NjaGVtYXRpY3NcblxuICBNb3JlIG9wdGlvbnMgd2lsbCBiZSBhZGRlZCB0byB0aGUgbGlzdCBhcyB0aGV5IGJlY29tZSBhdmFpbGFibGUuXG4gIGA7XG5cbiAgY29tbWFuZCA9ICdlMmUgW3Byb2plY3RdJztcbiAgYWxpYXNlcyA9IFsnZSddO1xuICBkZXNjcmliZSA9ICdCdWlsZHMgYW5kIHNlcnZlcyBhbiBBbmd1bGFyIGFwcGxpY2F0aW9uLCB0aGVuIHJ1bnMgZW5kLXRvLWVuZCB0ZXN0cy4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nO1xufVxuIl19