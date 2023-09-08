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
const path_1 = require("path");
const yargs_1 = __importDefault(require("yargs"));
const command_module_1 = require("../../command-builder/command-module");
const command_1 = require("../../command-builder/utilities/command");
const color_1 = require("../../utilities/color");
const completion_1 = require("../../utilities/completion");
const error_1 = require("../../utilities/error");
class CompletionCommandModule extends command_module_1.CommandModule {
    command = 'completion';
    describe = 'Set up Angular CLI autocompletion for your terminal.';
    longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    builder(localYargs) {
        return (0, command_1.addCommandModuleToYargs)(localYargs, CompletionScriptCommandModule, this.context);
    }
    async run() {
        let rcFile;
        try {
            rcFile = await (0, completion_1.initializeAutocomplete)();
        }
        catch (err) {
            (0, error_1.assertIsError)(err);
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
exports.default = CompletionCommandModule;
class CompletionScriptCommandModule extends command_module_1.CommandModule {
    command = 'script';
    describe = 'Generate a bash and zsh real-time type-ahead autocompletion script.';
    longDescriptionPath = undefined;
    builder(localYargs) {
        return localYargs;
    }
    run() {
        yargs_1.default.showCompletionScript();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2NvbXBsZXRpb24vY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7O0FBRUgsK0JBQTRCO0FBQzVCLGtEQUFvQztBQUNwQyx5RUFBa0c7QUFDbEcscUVBQWtGO0FBQ2xGLGlEQUErQztBQUMvQywyREFBeUY7QUFDekYsaURBQXNEO0FBRXRELE1BQXFCLHVCQUNuQixTQUFRLDhCQUFhO0lBR3JCLE9BQU8sR0FBRyxZQUFZLENBQUM7SUFDdkIsUUFBUSxHQUFHLHNEQUFzRCxDQUFDO0lBQ2xFLG1CQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBRTdELE9BQU8sQ0FBQyxVQUFnQjtRQUN0QixPQUFPLElBQUEsaUNBQXVCLEVBQUMsVUFBVSxFQUFFLDZCQUE2QixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUc7UUFDUCxJQUFJLE1BQWMsQ0FBQztRQUNuQixJQUFJO1lBQ0YsTUFBTSxHQUFHLE1BQU0sSUFBQSxtQ0FBc0IsR0FBRSxDQUFDO1NBQ3pDO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixJQUFBLHFCQUFhLEVBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV2QyxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUN0QjttREFDNkMsTUFBTTs7TUFFbkQsY0FBTSxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsQ0FBQztPQUM5QyxDQUFDLElBQUksRUFBRSxDQUNULENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxJQUFBLGdDQUFtQixHQUFFLENBQUMsS0FBSyxLQUFLLEVBQUU7WUFDM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUN0QixxRkFBcUY7Z0JBQ25GLDBGQUEwRjtnQkFDMUYseUVBQXlFO2dCQUN6RSxNQUFNO2dCQUNOLDRFQUE0RSxDQUMvRSxDQUFDO1NBQ0g7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FDRjtBQTNDRCwwQ0EyQ0M7QUFFRCxNQUFNLDZCQUE4QixTQUFRLDhCQUFhO0lBQ3ZELE9BQU8sR0FBRyxRQUFRLENBQUM7SUFDbkIsUUFBUSxHQUFHLHFFQUFxRSxDQUFDO0lBQ2pGLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztJQUVoQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQUVELEdBQUc7UUFDRCxlQUFLLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUMvQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHlhcmdzLCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBDb21tYW5kTW9kdWxlLCBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkQ29tbWFuZE1vZHVsZVRvWWFyZ3MgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsgY29sb3JzIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2NvbG9yJztcbmltcG9ydCB7IGhhc0dsb2JhbENsaUluc3RhbGwsIGluaXRpYWxpemVBdXRvY29tcGxldGUgfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvY29tcGxldGlvbic7XG5pbXBvcnQgeyBhc3NlcnRJc0Vycm9yIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL2Vycm9yJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGxldGlvbkNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uXG57XG4gIGNvbW1hbmQgPSAnY29tcGxldGlvbic7XG4gIGRlc2NyaWJlID0gJ1NldCB1cCBBbmd1bGFyIENMSSBhdXRvY29tcGxldGlvbiBmb3IgeW91ciB0ZXJtaW5hbC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndiB7XG4gICAgcmV0dXJuIGFkZENvbW1hbmRNb2R1bGVUb1lhcmdzKGxvY2FsWWFyZ3MsIENvbXBsZXRpb25TY3JpcHRDb21tYW5kTW9kdWxlLCB0aGlzLmNvbnRleHQpO1xuICB9XG5cbiAgYXN5bmMgcnVuKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgbGV0IHJjRmlsZTogc3RyaW5nO1xuICAgIHRyeSB7XG4gICAgICByY0ZpbGUgPSBhd2FpdCBpbml0aWFsaXplQXV0b2NvbXBsZXRlKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBhc3NlcnRJc0Vycm9yKGVycik7XG4gICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmVycm9yKGVyci5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKFxuICAgICAgYFxuQXBwZW5kZWQgXFxgc291cmNlIDwobmcgY29tcGxldGlvbiBzY3JpcHQpXFxgIHRvIFxcYCR7cmNGaWxlfVxcYC4gUmVzdGFydCB5b3VyIHRlcm1pbmFsIG9yIHJ1biB0aGUgZm9sbG93aW5nIHRvIGF1dG9jb21wbGV0ZSBcXGBuZ1xcYCBjb21tYW5kczpcblxuICAgICR7Y29sb3JzLnllbGxvdygnc291cmNlIDwobmcgY29tcGxldGlvbiBzY3JpcHQpJyl9XG4gICAgICBgLnRyaW0oKSxcbiAgICApO1xuXG4gICAgaWYgKChhd2FpdCBoYXNHbG9iYWxDbGlJbnN0YWxsKCkpID09PSBmYWxzZSkge1xuICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAnU2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSwgYnV0IHRoZXJlIGRvZXMgbm90IHNlZW0gdG8gYmUgYSBnbG9iYWwgaW5zdGFsbCBvZiB0aGUnICtcbiAgICAgICAgICAnIEFuZ3VsYXIgQ0xJLiBGb3IgYXV0b2NvbXBsZXRpb24gdG8gd29yaywgdGhlIENMSSB3aWxsIG5lZWQgdG8gYmUgb24geW91ciBgJFBBVEhgLCB3aGljaCcgK1xuICAgICAgICAgICcgaXMgdHlwaWNhbGx5IGRvbmUgd2l0aCB0aGUgYC1nYCBmbGFnIGluIGBucG0gaW5zdGFsbCAtZyBAYW5ndWxhci9jbGlgLicgK1xuICAgICAgICAgICdcXG5cXG4nICtcbiAgICAgICAgICAnRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBodHRwczovL2FuZ3VsYXIuaW8vY2xpL2NvbXBsZXRpb24jZ2xvYmFsLWluc3RhbGwnLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuXG5jbGFzcyBDb21wbGV0aW9uU2NyaXB0Q29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGUgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24ge1xuICBjb21tYW5kID0gJ3NjcmlwdCc7XG4gIGRlc2NyaWJlID0gJ0dlbmVyYXRlIGEgYmFzaCBhbmQgenNoIHJlYWwtdGltZSB0eXBlLWFoZWFkIGF1dG9jb21wbGV0aW9uIHNjcmlwdC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gdW5kZWZpbmVkO1xuXG4gIGJ1aWxkZXIobG9jYWxZYXJnczogQXJndik6IEFyZ3Yge1xuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcnVuKCk6IHZvaWQge1xuICAgIHlhcmdzLnNob3dDb21wbGV0aW9uU2NyaXB0KCk7XG4gIH1cbn1cbiJdfQ==