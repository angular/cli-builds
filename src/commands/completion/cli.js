"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionCommandModule = void 0;
const path_1 = require("path");
const yargs_1 = __importDefault(require("yargs"));
const command_module_1 = require("../../command-builder/command-module");
class CompletionCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'completion';
        this.describe = 'Generate a bash and zsh real-time type-ahead autocompletion script.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return localYargs;
    }
    run() {
        yargs_1.default.showCompletionScript();
    }
}
exports.CompletionCommandModule = CompletionCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbXBsZXRpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILCtCQUE0QjtBQUM1QixrREFBb0M7QUFDcEMseUVBQWtHO0FBRWxHLE1BQWEsdUJBQXdCLFNBQVEsOEJBQWE7SUFBMUQ7O1FBQ0UsWUFBTyxHQUFHLFlBQVksQ0FBQztRQUN2QixhQUFRLEdBQUcscUVBQXFFLENBQUM7UUFDakYsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFTL0QsQ0FBQztJQVBDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQsR0FBRztRQUNELGVBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRjtBQVpELDBEQVlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB5YXJncywgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSwgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcblxuZXhwb3J0IGNsYXNzIENvbXBsZXRpb25Db21tYW5kTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZSBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB7XG4gIGNvbW1hbmQgPSAnY29tcGxldGlvbic7XG4gIGRlc2NyaWJlID0gJ0dlbmVyYXRlIGEgYmFzaCBhbmQgenNoIHJlYWwtdGltZSB0eXBlLWFoZWFkIGF1dG9jb21wbGV0aW9uIHNjcmlwdC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBydW4oKTogdm9pZCB7XG4gICAgeWFyZ3Muc2hvd0NvbXBsZXRpb25TY3JpcHQoKTtcbiAgfVxufVxuIl19