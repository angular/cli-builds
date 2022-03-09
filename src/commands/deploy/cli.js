"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployCommandModule = void 0;
const core_1 = require("@angular-devkit/core");
const path_1 = require("path");
const architect_command_module_1 = require("../../command-builder/architect-command-module");
class DeployCommandModule extends architect_command_module_1.ArchitectCommandModule {
    constructor() {
        super(...arguments);
        this.missingErrorTarget = core_1.tags.stripIndents `
  Cannot find "deploy" target for the specified project.

  You should add a package that implements deployment capabilities for your
  favorite platform.
  
  For example:
    ng add @angular/fire
    ng add @azure/ng-deploy
  
  Find more packages on npm https://www.npmjs.com/search?q=ng%20deploy
  `;
        this.multiTarget = false;
        this.command = 'deploy [project]';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
        this.describe = 'Invokes the deploy builder for a specified project or for the default project in the workspace.';
    }
}
exports.DeployCommandModule = DeployCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2RlcGxveS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsK0NBQTRDO0FBQzVDLCtCQUE0QjtBQUM1Qiw2RkFBd0Y7QUFHeEYsTUFBYSxtQkFDWCxTQUFRLGlEQUFzQjtJQURoQzs7UUFJVyx1QkFBa0IsR0FBRyxXQUFJLENBQUMsWUFBWSxDQUFBOzs7Ozs7Ozs7OztHQVc5QyxDQUFDO1FBRUYsZ0JBQVcsR0FBRyxLQUFLLENBQUM7UUFDcEIsWUFBTyxHQUFHLGtCQUFrQixDQUFDO1FBQzdCLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdELGFBQVEsR0FDTixpR0FBaUcsQ0FBQztJQUN0RyxDQUFDO0NBQUE7QUF0QkQsa0RBc0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmNoaXRlY3RDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuXG5leHBvcnQgY2xhc3MgRGVwbG95Q29tbWFuZE1vZHVsZVxuICBleHRlbmRzIEFyY2hpdGVjdENvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb25cbntcbiAgb3ZlcnJpZGUgbWlzc2luZ0Vycm9yVGFyZ2V0ID0gdGFncy5zdHJpcEluZGVudHNgXG4gIENhbm5vdCBmaW5kIFwiZGVwbG95XCIgdGFyZ2V0IGZvciB0aGUgc3BlY2lmaWVkIHByb2plY3QuXG5cbiAgWW91IHNob3VsZCBhZGQgYSBwYWNrYWdlIHRoYXQgaW1wbGVtZW50cyBkZXBsb3ltZW50IGNhcGFiaWxpdGllcyBmb3IgeW91clxuICBmYXZvcml0ZSBwbGF0Zm9ybS5cbiAgXG4gIEZvciBleGFtcGxlOlxuICAgIG5nIGFkZCBAYW5ndWxhci9maXJlXG4gICAgbmcgYWRkIEBhenVyZS9uZy1kZXBsb3lcbiAgXG4gIEZpbmQgbW9yZSBwYWNrYWdlcyBvbiBucG0gaHR0cHM6Ly93d3cubnBtanMuY29tL3NlYXJjaD9xPW5nJTIwZGVwbG95XG4gIGA7XG5cbiAgbXVsdGlUYXJnZXQgPSBmYWxzZTtcbiAgY29tbWFuZCA9ICdkZXBsb3kgW3Byb2plY3RdJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuICBkZXNjcmliZSA9XG4gICAgJ0ludm9rZXMgdGhlIGRlcGxveSBidWlsZGVyIGZvciBhIHNwZWNpZmllZCBwcm9qZWN0IG9yIGZvciB0aGUgZGVmYXVsdCBwcm9qZWN0IGluIHRoZSB3b3Jrc3BhY2UuJztcbn1cbiJdfQ==