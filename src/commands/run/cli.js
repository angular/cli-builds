"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommandModule = void 0;
const path_1 = require("path");
const architect_base_command_module_1 = require("../../command-builder/architect-base-command-module");
const command_module_1 = require("../../command-builder/command-module");
class RunCommandModule extends architect_base_command_module_1.ArchitectBaseCommandModule {
    constructor() {
        super(...arguments);
        this.scope = command_module_1.CommandScope.In;
        this.command = 'run <target>';
        this.describe = 'Runs an Architect target with an optional custom builder configuration defined in your project.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    async builder(argv) {
        const { jsonHelp, getYargsCompletions, help } = this.context.args.options;
        const localYargs = argv
            .positional('target', {
            describe: 'The Architect target to run.',
            type: 'string',
            demandOption: true,
            // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
            // Also, hide choices from JSON help so that we don't display them in AIO.
            choices: (getYargsCompletions || help) && !jsonHelp ? this.getTargetChoices() : undefined,
        })
            .strict();
        const target = this.makeTargetSpecifier();
        if (!target) {
            return localYargs;
        }
        const schemaOptions = await this.getArchitectTargetOptions(target);
        return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
    }
    async run(options) {
        const target = this.makeTargetSpecifier(options);
        const { target: _target, ...extraOptions } = options;
        if (!target) {
            throw new command_module_1.CommandModuleError('Cannot determine project or target.');
        }
        return this.runSingleTarget(target, extraOptions);
    }
    makeTargetSpecifier(options) {
        var _a;
        const architectTarget = (_a = options === null || options === void 0 ? void 0 : options.target) !== null && _a !== void 0 ? _a : this.context.args.positional[1];
        if (!architectTarget) {
            return undefined;
        }
        const [project = '', target = '', configuration] = architectTarget.split(':');
        return {
            project,
            target,
            configuration,
        };
    }
    /** @returns a sorted list of target specifiers to be used for auto completion. */
    getTargetChoices() {
        if (!this.context.workspace) {
            return;
        }
        const targets = [];
        for (const [projectName, project] of this.context.workspace.projects) {
            for (const [targetName, target] of project.targets) {
                const currentTarget = `${projectName}:${targetName}`;
                targets.push(currentTarget);
                if (!target.configurations) {
                    continue;
                }
                for (const configName of Object.keys(target.configurations)) {
                    targets.push(`${currentTarget}:${configName}`);
                }
            }
        }
        return targets.sort();
    }
}
exports.RunCommandModule = RunCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3J1bi9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBRTVCLHVHQUFpRztBQUNqRyx5RUFNOEM7QUFNOUMsTUFBYSxnQkFDWCxTQUFRLDBEQUEwQztJQURwRDs7UUFJVyxVQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7UUFFakMsWUFBTyxHQUFHLGNBQWMsQ0FBQztRQUN6QixhQUFRLEdBQ04saUdBQWlHLENBQUM7UUFDcEcsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUE0RS9ELENBQUM7SUExRUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQ3RCLE1BQU0sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBRTFFLE1BQU0sVUFBVSxHQUF5QixJQUFJO2FBQzFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDcEIsUUFBUSxFQUFFLDhCQUE4QjtZQUN4QyxJQUFJLEVBQUUsUUFBUTtZQUNkLFlBQVksRUFBRSxJQUFJO1lBQ2xCLDZIQUE2SDtZQUM3SCwwRUFBMEU7WUFDMUUsT0FBTyxFQUFFLENBQUMsbUJBQW1CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQzFGLENBQUM7YUFDRCxNQUFNLEVBQUUsQ0FBQztRQUVaLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxPQUFPLFVBQVUsQ0FBQztTQUNuQjtRQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRW5FLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUErQztRQUN2RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFFckQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE1BQU0sSUFBSSxtQ0FBa0IsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO1NBQ3JFO1FBRUQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRVMsbUJBQW1CLENBQUMsT0FBaUM7O1FBQzdELE1BQU0sZUFBZSxHQUFHLE1BQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLE1BQU0sbUNBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDcEIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLGFBQWEsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFOUUsT0FBTztZQUNMLE9BQU87WUFDUCxNQUFNO1lBQ04sYUFBYTtTQUNkLENBQUM7SUFDSixDQUFDO0lBRUQsa0ZBQWtGO0lBQzFFLGdCQUFnQjtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7WUFDM0IsT0FBTztTQUNSO1FBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ25CLEtBQUssTUFBTSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDcEUsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ2xELE1BQU0sYUFBYSxHQUFHLEdBQUcsV0FBVyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNyRCxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUU1QixJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtvQkFDMUIsU0FBUztpQkFDVjtnQkFFRCxLQUFLLE1BQU0sVUFBVSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFO29CQUMzRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsYUFBYSxJQUFJLFVBQVUsRUFBRSxDQUFDLENBQUM7aUJBQ2hEO2FBQ0Y7U0FDRjtRQUVELE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3hCLENBQUM7Q0FDRjtBQXJGRCw0Q0FxRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgVGFyZ2V0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJ1bkNvbW1hbmRBcmdzIHtcbiAgdGFyZ2V0OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBSdW5Db21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGU8UnVuQ29tbWFuZEFyZ3M+XG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPFJ1bkNvbW1hbmRBcmdzPlxue1xuICBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcblxuICBjb21tYW5kID0gJ3J1biA8dGFyZ2V0Pic7XG4gIGRlc2NyaWJlID1cbiAgICAnUnVucyBhbiBBcmNoaXRlY3QgdGFyZ2V0IHdpdGggYW4gb3B0aW9uYWwgY3VzdG9tIGJ1aWxkZXIgY29uZmlndXJhdGlvbiBkZWZpbmVkIGluIHlvdXIgcHJvamVjdC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFJ1bkNvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IHsganNvbkhlbHAsIGdldFlhcmdzQ29tcGxldGlvbnMsIGhlbHAgfSA9IHRoaXMuY29udGV4dC5hcmdzLm9wdGlvbnM7XG5cbiAgICBjb25zdCBsb2NhbFlhcmdzOiBBcmd2PFJ1bkNvbW1hbmRBcmdzPiA9IGFyZ3ZcbiAgICAgIC5wb3NpdGlvbmFsKCd0YXJnZXQnLCB7XG4gICAgICAgIGRlc2NyaWJlOiAnVGhlIEFyY2hpdGVjdCB0YXJnZXQgdG8gcnVuLicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBkZW1hbmRPcHRpb246IHRydWUsXG4gICAgICAgIC8vIFNob3cgb25seSBpbiB3aGVuIHVzaW5nIC0taGVscCBhbmQgYXV0byBjb21wbGV0aW9uIGJlY2F1c2Ugb3RoZXJ3aXNlIGNvbW1hIHNlcGVyYXRlZCBjb25maWd1cmF0aW9uIHZhbHVlcyB3aWxsIGJlIGludmFsaWQuXG4gICAgICAgIC8vIEFsc28sIGhpZGUgY2hvaWNlcyBmcm9tIEpTT04gaGVscCBzbyB0aGF0IHdlIGRvbid0IGRpc3BsYXkgdGhlbSBpbiBBSU8uXG4gICAgICAgIGNob2ljZXM6IChnZXRZYXJnc0NvbXBsZXRpb25zIHx8IGhlbHApICYmICFqc29uSGVscCA/IHRoaXMuZ2V0VGFyZ2V0Q2hvaWNlcygpIDogdW5kZWZpbmVkLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMubWFrZVRhcmdldFNwZWNpZmllcigpO1xuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWFPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXRPcHRpb25zKHRhcmdldCk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIHNjaGVtYU9wdGlvbnMpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8UnVuQ29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm1ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgY29uc3QgeyB0YXJnZXQ6IF90YXJnZXQsIC4uLmV4dHJhT3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0LicpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNpbmdsZVRhcmdldCh0YXJnZXQsIGV4dHJhT3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zPzogT3B0aW9uczxSdW5Db21tYW5kQXJncz4pOiBUYXJnZXQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGFyY2hpdGVjdFRhcmdldCA9IG9wdGlvbnM/LnRhcmdldCA/PyB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdO1xuICAgIGlmICghYXJjaGl0ZWN0VGFyZ2V0KSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IFtwcm9qZWN0ID0gJycsIHRhcmdldCA9ICcnLCBjb25maWd1cmF0aW9uXSA9IGFyY2hpdGVjdFRhcmdldC5zcGxpdCgnOicpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICB0YXJnZXQsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgIH07XG4gIH1cblxuICAvKiogQHJldHVybnMgYSBzb3J0ZWQgbGlzdCBvZiB0YXJnZXQgc3BlY2lmaWVycyB0byBiZSB1c2VkIGZvciBhdXRvIGNvbXBsZXRpb24uICovXG4gIHByaXZhdGUgZ2V0VGFyZ2V0Q2hvaWNlcygpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQud29ya3NwYWNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgW3Byb2plY3ROYW1lLCBwcm9qZWN0XSBvZiB0aGlzLmNvbnRleHQud29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBmb3IgKGNvbnN0IFt0YXJnZXROYW1lLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICBjb25zdCBjdXJyZW50VGFyZ2V0ID0gYCR7cHJvamVjdE5hbWV9OiR7dGFyZ2V0TmFtZX1gO1xuICAgICAgICB0YXJnZXRzLnB1c2goY3VycmVudFRhcmdldCk7XG5cbiAgICAgICAgaWYgKCF0YXJnZXQuY29uZmlndXJhdGlvbnMpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgY29uZmlnTmFtZSBvZiBPYmplY3Qua2V5cyh0YXJnZXQuY29uZmlndXJhdGlvbnMpKSB7XG4gICAgICAgICAgdGFyZ2V0cy5wdXNoKGAke2N1cnJlbnRUYXJnZXR9OiR7Y29uZmlnTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRzLnNvcnQoKTtcbiAgfVxufVxuIl19