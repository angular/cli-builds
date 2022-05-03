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
const command_1 = require("../../command-builder/utilities/command");
const color_1 = require("../../utilities/color");
const completion_1 = require("../../utilities/completion");
class CompletionCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'completion';
        this.describe = 'Set up Angular CLI autocompletion for your terminal.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return (0, command_1.addCommandModuleToYargs)(localYargs, CompletionScriptCommandModule, this.context);
    }
    async run() {
        let rcFile;
        try {
            rcFile = await (0, completion_1.initializeAutocomplete)();
        }
        catch (err) {
            this.context.logger.error(err.message);
            return 1;
        }
        this.context.logger.info(`
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${color_1.colors.yellow('source <(ng completion script)')}
      `.trim());
        return 0;
    }
}
exports.CompletionCommandModule = CompletionCommandModule;
class CompletionScriptCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'script';
        this.describe = 'Generate a bash and zsh real-time type-ahead autocompletion script.';
        this.longDescriptionPath = undefined;
    }
    builder(localYargs) {
        return localYargs;
    }
    run() {
        yargs_1.default.showCompletionScript();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbXBsZXRpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILCtCQUE0QjtBQUM1QixrREFBb0M7QUFDcEMseUVBSThDO0FBQzlDLHFFQUFrRjtBQUNsRixpREFBK0M7QUFDL0MsMkRBQW9FO0FBRXBFLE1BQWEsdUJBQXdCLFNBQVEsOEJBQWE7SUFBMUQ7O1FBQ0UsWUFBTyxHQUFHLFlBQVksQ0FBQztRQUN2QixhQUFRLEdBQUcsc0RBQXNELENBQUM7UUFDbEUsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUEwQi9ELENBQUM7SUF4QkMsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sSUFBQSxpQ0FBdUIsRUFBQyxVQUFVLEVBQUUsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRztRQUNQLElBQUksTUFBYyxDQUFDO1FBQ25CLElBQUk7WUFDRixNQUFNLEdBQUcsTUFBTSxJQUFBLG1DQUFzQixHQUFFLENBQUM7U0FDekM7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdkMsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDdEI7bURBQzZDLE1BQU07O01BRW5ELGNBQU0sQ0FBQyxNQUFNLENBQUMsZ0NBQWdDLENBQUM7T0FDOUMsQ0FBQyxJQUFJLEVBQUUsQ0FDVCxDQUFDO1FBRUYsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUE3QkQsMERBNkJDO0FBRUQsTUFBTSw2QkFBOEIsU0FBUSw4QkFBYTtJQUF6RDs7UUFDRSxZQUFPLEdBQUcsUUFBUSxDQUFDO1FBQ25CLGFBQVEsR0FBRyxxRUFBcUUsQ0FBQztRQUNqRix3QkFBbUIsR0FBRyxTQUFTLENBQUM7SUFTbEMsQ0FBQztJQVBDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQsR0FBRztRQUNELGVBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeWFyZ3MsIHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGUsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGluaXRpYWxpemVBdXRvY29tcGxldGUgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29tcGxldGlvbic7XG5cbmV4cG9ydCBjbGFzcyBDb21wbGV0aW9uQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ2NvbXBsZXRpb24nO1xuICBkZXNjcmliZSA9ICdTZXQgdXAgQW5ndWxhciBDTEkgYXV0b2NvbXBsZXRpb24gZm9yIHlvdXIgdGVybWluYWwuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aCA9IGpvaW4oX19kaXJuYW1lLCAnbG9uZy1kZXNjcmlwdGlvbi5tZCcpO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Yge1xuICAgIHJldHVybiBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyhsb2NhbFlhcmdzLCBDb21wbGV0aW9uU2NyaXB0Q29tbWFuZE1vZHVsZSwgdGhpcy5jb250ZXh0KTtcbiAgfVxuXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGxldCByY0ZpbGU6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgcmNGaWxlID0gYXdhaXQgaW5pdGlhbGl6ZUF1dG9jb21wbGV0ZSgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcihlcnIubWVzc2FnZSk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dC5sb2dnZXIuaW5mbyhcbiAgICAgIGBcbkFwcGVuZGVkIFxcYHNvdXJjZSA8KG5nIGNvbXBsZXRpb24gc2NyaXB0KVxcYCB0byBcXGAke3JjRmlsZX1cXGAuIFJlc3RhcnQgeW91ciB0ZXJtaW5hbCBvciBydW4gdGhlIGZvbGxvd2luZyB0byBhdXRvY29tcGxldGUgXFxgbmdcXGAgY29tbWFuZHM6XG5cbiAgICAke2NvbG9ycy55ZWxsb3coJ3NvdXJjZSA8KG5nIGNvbXBsZXRpb24gc2NyaXB0KScpfVxuICAgICAgYC50cmltKCksXG4gICAgKTtcblxuICAgIHJldHVybiAwO1xuICB9XG59XG5cbmNsYXNzIENvbXBsZXRpb25TY3JpcHRDb21tYW5kTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZSBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB7XG4gIGNvbW1hbmQgPSAnc2NyaXB0JztcbiAgZGVzY3JpYmUgPSAnR2VuZXJhdGUgYSBiYXNoIGFuZCB6c2ggcmVhbC10aW1lIHR5cGUtYWhlYWQgYXV0b2NvbXBsZXRpb24gc2NyaXB0Lic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSB1bmRlZmluZWQ7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gIH1cblxuICBydW4oKTogdm9pZCB7XG4gICAgeWFyZ3Muc2hvd0NvbXBsZXRpb25TY3JpcHQoKTtcbiAgfVxufVxuIl19