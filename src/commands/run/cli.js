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
RunCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3J1bi9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBRTVCLHVHQUFpRztBQUNqRyx5RUFNOEM7QUFNOUMsTUFBYSxnQkFDWCxTQUFRLDBEQUEwQztJQURwRDs7UUFNRSxZQUFPLEdBQUcsY0FBYyxDQUFDO1FBQ3pCLGFBQVEsR0FDTixpR0FBaUcsQ0FBQztRQUNwRyx3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQTRFL0QsQ0FBQztJQTFFQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDdEIsTUFBTSxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFMUUsTUFBTSxVQUFVLEdBQXlCLElBQUk7YUFDMUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtZQUNwQixRQUFRLEVBQUUsOEJBQThCO1lBQ3hDLElBQUksRUFBRSxRQUFRO1lBQ2QsWUFBWSxFQUFFLElBQUk7WUFDbEIsNkhBQTZIO1lBQzdILDBFQUEwRTtZQUMxRSxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDMUYsQ0FBQzthQUNELE1BQU0sRUFBRSxDQUFDO1FBRVosTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE9BQU8sVUFBVSxDQUFDO1NBQ25CO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkUsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQStDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUVyRCxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsTUFBTSxJQUFJLG1DQUFrQixDQUFDLHFDQUFxQyxDQUFDLENBQUM7U0FDckU7UUFFRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFUyxtQkFBbUIsQ0FBQyxPQUFpQzs7UUFDN0QsTUFBTSxlQUFlLEdBQUcsTUFBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsTUFBTSxtQ0FBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNwQixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsYUFBYSxDQUFDLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU5RSxPQUFPO1lBQ0wsT0FBTztZQUNQLE1BQU07WUFDTixhQUFhO1NBQ2QsQ0FBQztJQUNKLENBQUM7SUFFRCxrRkFBa0Y7SUFDMUUsZ0JBQWdCO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRTtZQUMzQixPQUFPO1NBQ1I7UUFFRCxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDbkIsS0FBSyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRTtZQUNwRSxLQUFLLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtnQkFDbEQsTUFBTSxhQUFhLEdBQUcsR0FBRyxXQUFXLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ3JELE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBRTVCLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO29CQUMxQixTQUFTO2lCQUNWO2dCQUVELEtBQUssTUFBTSxVQUFVLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQzNELE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLElBQUksVUFBVSxFQUFFLENBQUMsQ0FBQztpQkFDaEQ7YUFDRjtTQUNGO1FBRUQsT0FBTyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDeEIsQ0FBQzs7QUFwRkgsNENBcUZDO0FBakZpQixzQkFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFRhcmdldCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IEFyY2hpdGVjdEJhc2VDb21tYW5kTW9kdWxlIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2FyY2hpdGVjdC1iYXNlLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcblxuZXhwb3J0IGludGVyZmFjZSBSdW5Db21tYW5kQXJncyB7XG4gIHRhcmdldDogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUnVuQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIEFyY2hpdGVjdEJhc2VDb21tYW5kTW9kdWxlPFJ1bkNvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxSdW5Db21tYW5kQXJncz5cbntcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuXG4gIGNvbW1hbmQgPSAncnVuIDx0YXJnZXQ+JztcbiAgZGVzY3JpYmUgPVxuICAgICdSdW5zIGFuIEFyY2hpdGVjdCB0YXJnZXQgd2l0aCBhbiBvcHRpb25hbCBjdXN0b20gYnVpbGRlciBjb25maWd1cmF0aW9uIGRlZmluZWQgaW4geW91ciBwcm9qZWN0Lic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8UnVuQ29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgeyBqc29uSGVscCwgZ2V0WWFyZ3NDb21wbGV0aW9ucywgaGVscCB9ID0gdGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucztcblxuICAgIGNvbnN0IGxvY2FsWWFyZ3M6IEFyZ3Y8UnVuQ29tbWFuZEFyZ3M+ID0gYXJndlxuICAgICAgLnBvc2l0aW9uYWwoJ3RhcmdldCcsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdUaGUgQXJjaGl0ZWN0IHRhcmdldCB0byBydW4uJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgICAgLy8gU2hvdyBvbmx5IGluIHdoZW4gdXNpbmcgLS1oZWxwIGFuZCBhdXRvIGNvbXBsZXRpb24gYmVjYXVzZSBvdGhlcndpc2UgY29tbWEgc2VwZXJhdGVkIGNvbmZpZ3VyYXRpb24gdmFsdWVzIHdpbGwgYmUgaW52YWxpZC5cbiAgICAgICAgLy8gQWxzbywgaGlkZSBjaG9pY2VzIGZyb20gSlNPTiBoZWxwIHNvIHRoYXQgd2UgZG9uJ3QgZGlzcGxheSB0aGVtIGluIEFJTy5cbiAgICAgICAgY2hvaWNlczogKGdldFlhcmdzQ29tcGxldGlvbnMgfHwgaGVscCkgJiYgIWpzb25IZWxwID8gdGhpcy5nZXRUYXJnZXRDaG9pY2VzKCkgOiB1bmRlZmluZWQsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuXG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5tYWtlVGFyZ2V0U3BlY2lmaWVyKCk7XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYU9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldEFyY2hpdGVjdFRhcmdldE9wdGlvbnModGFyZ2V0KTtcblxuICAgIHJldHVybiB0aGlzLmFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQobG9jYWxZYXJncywgc2NoZW1hT3B0aW9ucyk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxSdW5Db21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMubWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICBjb25zdCB7IHRhcmdldDogX3RhcmdldCwgLi4uZXh0cmFPcHRpb25zIH0gPSBvcHRpb25zO1xuXG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuU2luZ2xlVGFyZ2V0KHRhcmdldCwgZXh0cmFPcHRpb25zKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBtYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnM/OiBPcHRpb25zPFJ1bkNvbW1hbmRBcmdzPik6IFRhcmdldCB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgYXJjaGl0ZWN0VGFyZ2V0ID0gb3B0aW9ucz8udGFyZ2V0ID8/IHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWxbMV07XG4gICAgaWYgKCFhcmNoaXRlY3RUYXJnZXQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgW3Byb2plY3QgPSAnJywgdGFyZ2V0ID0gJycsIGNvbmZpZ3VyYXRpb25dID0gYXJjaGl0ZWN0VGFyZ2V0LnNwbGl0KCc6Jyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIHRhcmdldCxcbiAgICAgIGNvbmZpZ3VyYXRpb24sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBAcmV0dXJucyBhIHNvcnRlZCBsaXN0IG9mIHRhcmdldCBzcGVjaWZpZXJzIHRvIGJlIHVzZWQgZm9yIGF1dG8gY29tcGxldGlvbi4gKi9cbiAgcHJpdmF0ZSBnZXRUYXJnZXRDaG9pY2VzKCk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuY29udGV4dC53b3Jrc3BhY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXRzID0gW107XG4gICAgZm9yIChjb25zdCBbcHJvamVjdE5hbWUsIHByb2plY3RdIG9mIHRoaXMuY29udGV4dC53b3Jrc3BhY2UucHJvamVjdHMpIHtcbiAgICAgIGZvciAoY29uc3QgW3RhcmdldE5hbWUsIHRhcmdldF0gb2YgcHJvamVjdC50YXJnZXRzKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRUYXJnZXQgPSBgJHtwcm9qZWN0TmFtZX06JHt0YXJnZXROYW1lfWA7XG4gICAgICAgIHRhcmdldHMucHVzaChjdXJyZW50VGFyZ2V0KTtcblxuICAgICAgICBpZiAoIXRhcmdldC5jb25maWd1cmF0aW9ucykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBjb25maWdOYW1lIG9mIE9iamVjdC5rZXlzKHRhcmdldC5jb25maWd1cmF0aW9ucykpIHtcbiAgICAgICAgICB0YXJnZXRzLnB1c2goYCR7Y3VycmVudFRhcmdldH06JHtjb25maWdOYW1lfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldHMuc29ydCgpO1xuICB9XG59XG4iXX0=