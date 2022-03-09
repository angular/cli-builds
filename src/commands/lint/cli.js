"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LintCommandModule = void 0;
const core_1 = require("@angular-devkit/core");
const path_1 = require("path");
const architect_command_module_1 = require("../../command-builder/architect-command-module");
class LintCommandModule extends architect_command_module_1.ArchitectCommandModule {
    constructor() {
        super(...arguments);
        this.missingErrorTarget = core_1.tags.stripIndents `
  Cannot find "lint" target for the specified project.
  
  You should add a package that implements linting capabilities.
  
  For example:
    ng add @angular-eslint/schematics
  `;
        this.multiTarget = true;
        this.command = 'lint [project]';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
        this.describe = 'Runs linting tools on Angular application code in a given project folder.';
    }
}
exports.LintCommandModule = LintCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2xpbnQvY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtDQUE0QztBQUM1QywrQkFBNEI7QUFDNUIsNkZBQXdGO0FBR3hGLE1BQWEsaUJBQ1gsU0FBUSxpREFBc0I7SUFEaEM7O1FBSVcsdUJBQWtCLEdBQUcsV0FBSSxDQUFDLFlBQVksQ0FBQTs7Ozs7OztHQU85QyxDQUFDO1FBRUYsZ0JBQVcsR0FBRyxJQUFJLENBQUM7UUFDbkIsWUFBTyxHQUFHLGdCQUFnQixDQUFDO1FBQzNCLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdELGFBQVEsR0FBRywyRUFBMkUsQ0FBQztJQUN6RixDQUFDO0NBQUE7QUFqQkQsOENBaUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuXG5leHBvcnQgY2xhc3MgTGludENvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uXG57XG4gIG92ZXJyaWRlIG1pc3NpbmdFcnJvclRhcmdldCA9IHRhZ3Muc3RyaXBJbmRlbnRzYFxuICBDYW5ub3QgZmluZCBcImxpbnRcIiB0YXJnZXQgZm9yIHRoZSBzcGVjaWZpZWQgcHJvamVjdC5cbiAgXG4gIFlvdSBzaG91bGQgYWRkIGEgcGFja2FnZSB0aGF0IGltcGxlbWVudHMgbGludGluZyBjYXBhYmlsaXRpZXMuXG4gIFxuICBGb3IgZXhhbXBsZTpcbiAgICBuZyBhZGQgQGFuZ3VsYXItZXNsaW50L3NjaGVtYXRpY3NcbiAgYDtcblxuICBtdWx0aVRhcmdldCA9IHRydWU7XG4gIGNvbW1hbmQgPSAnbGludCBbcHJvamVjdF0nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG4gIGRlc2NyaWJlID0gJ1J1bnMgbGludGluZyB0b29scyBvbiBBbmd1bGFyIGFwcGxpY2F0aW9uIGNvZGUgaW4gYSBnaXZlbiBwcm9qZWN0IGZvbGRlci4nO1xufVxuIl19