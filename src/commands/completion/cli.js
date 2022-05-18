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
        if ((await (0, completion_1.hasGlobalCliInstall)()) === false) {
            this.context.logger.warn('Setup completed successfully, but there does not seem to be a global install of the' +
                ' Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which' +
                ' is typically done with the `-g` flag in `npm install -g @angular/cli`.' +
                '\n\n' +
                'For more information, see https://angular.io/cli/completion#global-install');
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbXBsZXRpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILCtCQUE0QjtBQUM1QixrREFBb0M7QUFDcEMseUVBQWtHO0FBQ2xHLHFFQUFrRjtBQUNsRixpREFBK0M7QUFDL0MsMkRBQXlGO0FBRXpGLE1BQWEsdUJBQXdCLFNBQVEsOEJBQWE7SUFBMUQ7O1FBQ0UsWUFBTyxHQUFHLFlBQVksQ0FBQztRQUN2QixhQUFRLEdBQUcsc0RBQXNELENBQUM7UUFDbEUsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFvQy9ELENBQUM7SUFsQ0MsT0FBTyxDQUFDLFVBQWdCO1FBQ3RCLE9BQU8sSUFBQSxpQ0FBdUIsRUFBQyxVQUFVLEVBQUUsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRztRQUNQLElBQUksTUFBYyxDQUFDO1FBQ25CLElBQUk7WUFDRixNQUFNLEdBQUcsTUFBTSxJQUFBLG1DQUFzQixHQUFFLENBQUM7U0FDekM7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdkMsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDdEI7bURBQzZDLE1BQU07O01BRW5ELGNBQU0sQ0FBQyxNQUFNLENBQUMsZ0NBQWdDLENBQUM7T0FDOUMsQ0FBQyxJQUFJLEVBQUUsQ0FDVCxDQUFDO1FBRUYsSUFBSSxDQUFDLE1BQU0sSUFBQSxnQ0FBbUIsR0FBRSxDQUFDLEtBQUssS0FBSyxFQUFFO1lBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDdEIscUZBQXFGO2dCQUNuRiwwRkFBMEY7Z0JBQzFGLHlFQUF5RTtnQkFDekUsTUFBTTtnQkFDTiw0RUFBNEUsQ0FDL0UsQ0FBQztTQUNIO1FBRUQsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUF2Q0QsMERBdUNDO0FBRUQsTUFBTSw2QkFBOEIsU0FBUSw4QkFBYTtJQUF6RDs7UUFDRSxZQUFPLEdBQUcsUUFBUSxDQUFDO1FBQ25CLGFBQVEsR0FBRyxxRUFBcUUsQ0FBQztRQUNqRix3QkFBbUIsR0FBRyxTQUFTLENBQUM7SUFTbEMsQ0FBQztJQVBDLE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQsR0FBRztRQUNELGVBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeWFyZ3MsIHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGUsIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBhZGRDb21tYW5kTW9kdWxlVG9ZYXJncyB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29sb3InO1xuaW1wb3J0IHsgaGFzR2xvYmFsQ2xpSW5zdGFsbCwgaW5pdGlhbGl6ZUF1dG9jb21wbGV0ZSB9IGZyb20gJy4uLy4uL3V0aWxpdGllcy9jb21wbGV0aW9uJztcblxuZXhwb3J0IGNsYXNzIENvbXBsZXRpb25Db21tYW5kTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZSBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbiB7XG4gIGNvbW1hbmQgPSAnY29tcGxldGlvbic7XG4gIGRlc2NyaWJlID0gJ1NldCB1cCBBbmd1bGFyIENMSSBhdXRvY29tcGxldGlvbiBmb3IgeW91ciB0ZXJtaW5hbC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzKGxvY2FsWWFyZ3MsIENvbXBsZXRpb25TY3JpcHRDb21tYW5kTW9kdWxlLCB0aGlzLmNvbnRleHQpO1xuICB9XG5cbiAgYXN5bmMgcnVuKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgbGV0IHJjRmlsZTogc3RyaW5nO1xuICAgIHRyeSB7XG4gICAgICByY0ZpbGUgPSBhd2FpdCBpbml0aWFsaXplQXV0b2NvbXBsZXRlKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgYFxuQXBwZW5kZWQgXFxgc291cmNlIDwobmcgY29tcGxldGlvbiBzY3JpcHQpXFxgIHRvIFxcYCR7cmNGaWxlfVxcYC4gUmVzdGFydCB5b3VyIHRlcm1pbmFsIG9yIHJ1biB0aGUgZm9sbG93aW5nIHRvIGF1dG9jb21wbGV0ZSBcXGBuZ1xcYCBjb21tYW5kczpcblxuICAgICR7Y29sb3JzLnllbGxvdygnc291cmNlIDwobmcgY29tcGxldGlvbiBzY3JpcHQpJyl9XG4gICAgICBgLnRyaW0oKSxcbiAgICApO1xuXG4gICAgaWYgKChhd2FpdCBoYXNHbG9iYWxDbGlJbnN0YWxsKCkpID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAnU2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSwgYnV0IHRoZXJlIGRvZXMgbm90IHNlZW0gdG8gYmUgYSBnbG9iYWwgaW5zdGFsbCBvZiB0aGUnICtcbiAgICAgICAgICAnIEFuZ3VsYXIgQ0xJLiBGb3IgYXV0b2NvbXBsZXRpb24gdG8gd29yaywgdGhlIENMSSB3aWxsIG5lZWQgdG8gYmUgb24geW91ciBgJFBBVEhgLCB3aGljaCcgK1xuICAgICAgICAgICcgaXMgdHlwaWNhbGx5IGRvbmUgd2l0aCB0aGUgYC1nYCBmbGFnIGluIGBucG0gaW5zdGFsbCAtZyBAYW5ndWxhci9jbGlgLicgK1xuICAgICAgICAgICdcXG5cXG4nICtcbiAgICAgICAgICAnRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vY2xpL2NvbXBsZXRpb24jZ2xvYmFsLWluc3RhbGwnLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuXG5jbGFzcyBDb21wbGV0aW9uU2NyaXB0Q29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ3NjcmlwdCc7XG4gIGRlc2NyaWJlID0gJ0dlbmVyYXRlIGEgYmFzaCBhbmQgenNoIHJlYWwtdGltZSB0eXBlLWFoZWFkIGF1dG9jb21wbGV0aW9uIHNjcmlwdC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gdW5kZWZpbmVkO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Yge1xuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcnVuKCk6IHZvaWQge1xuICAgIHlhcmdzLnNob3dDb21wbGV0aW9uU2NyaXB0KCk7XG4gIH1cbn1cbiJdfQ==