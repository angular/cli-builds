"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
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
            describe: 'The Architect target to run provided in the the following format `project:target[:configuration]`.',
            type: 'string',
            demandOption: true,
            // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
            // Also, hide choices from JSON help so that we don't display them in AIO.
            choices: (getYargsCompletions || help) && !jsonHelp ? this.getTargetChoices() : undefined,
        })
            .middleware((args) => {
            // TODO: remove in version 15.
            const { configuration, target } = args;
            if (typeof configuration === 'string' && target) {
                const targetWithConfig = target.split(':', 2);
                targetWithConfig.push(configuration);
                throw new command_module_1.CommandModuleError('Unknown argument: configuration.\n' +
                    `Provide the configuration as part of the target 'ng run ${targetWithConfig.join(':')}'.`);
            }
        }, true)
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
        const architectTarget = options?.target ?? this.context.args.positional[1];
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
exports.default = RunCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3J1bi9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFHSCwrQkFBNEI7QUFFNUIsdUdBQWlHO0FBQ2pHLHlFQU04QztBQU05QyxNQUFxQixnQkFDbkIsU0FBUSwwREFBMEM7SUFEcEQ7O1FBSVcsVUFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDO1FBRWpDLFlBQU8sR0FBRyxjQUFjLENBQUM7UUFDekIsYUFBUSxHQUNOLGlHQUFpRyxDQUFDO1FBQ3BHLHdCQUFtQixHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBNEYvRCxDQUFDO0lBMUZDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUN0QixNQUFNLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUUxRSxNQUFNLFVBQVUsR0FBeUIsSUFBSTthQUMxQyxVQUFVLENBQUMsUUFBUSxFQUFFO1lBQ3BCLFFBQVEsRUFDTixvR0FBb0c7WUFDdEcsSUFBSSxFQUFFLFFBQVE7WUFDZCxZQUFZLEVBQUUsSUFBSTtZQUNsQiw2SEFBNkg7WUFDN0gsMEVBQTBFO1lBQzFFLE9BQU8sRUFBRSxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUMxRixDQUFDO2FBQ0QsVUFBVSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDbkIsOEJBQThCO1lBQzlCLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFD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Q0FxR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgVGFyZ2V0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgQXJjaGl0ZWN0QmFzZUNvbW1hbmRNb2R1bGUgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvYXJjaGl0ZWN0LWJhc2UtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJ1bkNvbW1hbmRBcmdzIHtcbiAgdGFyZ2V0OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJ1bkNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZTxSdW5Db21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248UnVuQ29tbWFuZEFyZ3M+XG57XG4gIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuXG4gIGNvbW1hbmQgPSAncnVuIDx0YXJnZXQ+JztcbiAgZGVzY3JpYmUgPVxuICAgICdSdW5zIGFuIEFyY2hpdGVjdCB0YXJnZXQgd2l0aCBhbiBvcHRpb25hbCBjdXN0b20gYnVpbGRlciBjb25maWd1cmF0aW9uIGRlZmluZWQgaW4geW91ciBwcm9qZWN0Lic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8UnVuQ29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgeyBqc29uSGVscCwgZ2V0WWFyZ3NDb21wbGV0aW9ucywgaGVscCB9ID0gdGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucztcblxuICAgIGNvbnN0IGxvY2FsWWFyZ3M6IEFyZ3Y8UnVuQ29tbWFuZEFyZ3M+ID0gYXJndlxuICAgICAgLnBvc2l0aW9uYWwoJ3RhcmdldCcsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1RoZSBBcmNoaXRlY3QgdGFyZ2V0IHRvIHJ1biBwcm92aWRlZCBpbiB0aGUgdGhlIGZvbGxvd2luZyBmb3JtYXQgYHByb2plY3Q6dGFyZ2V0Wzpjb25maWd1cmF0aW9uXWAuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgICAgLy8gU2hvdyBvbmx5IGluIHdoZW4gdXNpbmcgLS1oZWxwIGFuZCBhdXRvIGNvbXBsZXRpb24gYmVjYXVzZSBvdGhlcndpc2UgY29tbWEgc2VwZXJhdGVkIGNvbmZpZ3VyYXRpb24gdmFsdWVzIHdpbGwgYmUgaW52YWxpZC5cbiAgICAgICAgLy8gQWxzbywgaGlkZSBjaG9pY2VzIGZyb20gSlNPTiBoZWxwIHNvIHRoYXQgd2UgZG9uJ3QgZGlzcGxheSB0aGVtIGluIEFJTy5cbiAgICAgICAgY2hvaWNlczogKGdldFlhcmdzQ29tcGxldGlvbnMgfHwgaGVscCkgJiYgIWpzb25IZWxwID8gdGhpcy5nZXRUYXJnZXRDaG9pY2VzKCkgOiB1bmRlZmluZWQsXG4gICAgICB9KVxuICAgICAgLm1pZGRsZXdhcmUoKGFyZ3MpID0+IHtcbiAgICAgICAgLy8gVE9ETzogcmVtb3ZlIGluIHZlcnNpb24gMTUuXG4gICAgICAgIGNvbnN0IHsgY29uZmlndXJhdGlvbiwgdGFyZ2V0IH0gPSBhcmdzO1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZ3VyYXRpb24gPT09ICdzdHJpbmcnICYmIHRhcmdldCkge1xuICAgICAgICAgIGNvbnN0IHRhcmdldFdpdGhDb25maWcgPSB0YXJnZXQuc3BsaXQoJzonLCAyKTtcbiAgICAgICAgICB0YXJnZXRXaXRoQ29uZmlnLnB1c2goY29uZmlndXJhdGlvbik7XG5cbiAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgJ1Vua25vd24gYXJndW1lbnQ6IGNvbmZpZ3VyYXRpb24uXFxuJyArXG4gICAgICAgICAgICAgIGBQcm92aWRlIHRoZSBjb25maWd1cmF0aW9uIGFzIHBhcnQgb2YgdGhlIHRhcmdldCAnbmcgcnVuICR7dGFyZ2V0V2l0aENvbmZpZy5qb2luKFxuICAgICAgICAgICAgICAgICc6JyxcbiAgICAgICAgICAgICAgKX0nLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSwgdHJ1ZSlcbiAgICAgIC5zdHJpY3QoKTtcblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMubWFrZVRhcmdldFNwZWNpZmllcigpO1xuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWFPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXRPcHRpb25zKHRhcmdldCk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIHNjaGVtYU9wdGlvbnMpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8UnVuQ29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm1ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgY29uc3QgeyB0YXJnZXQ6IF90YXJnZXQsIC4uLmV4dHJhT3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0LicpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNpbmdsZVRhcmdldCh0YXJnZXQsIGV4dHJhT3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zPzogT3B0aW9uczxSdW5Db21tYW5kQXJncz4pOiBUYXJnZXQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGFyY2hpdGVjdFRhcmdldCA9IG9wdGlvbnM/LnRhcmdldCA/PyB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdO1xuICAgIGlmICghYXJjaGl0ZWN0VGFyZ2V0KSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IFtwcm9qZWN0ID0gJycsIHRhcmdldCA9ICcnLCBjb25maWd1cmF0aW9uXSA9IGFyY2hpdGVjdFRhcmdldC5zcGxpdCgnOicpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICB0YXJnZXQsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgIH07XG4gIH1cblxuICAvKiogQHJldHVybnMgYSBzb3J0ZWQgbGlzdCBvZiB0YXJnZXQgc3BlY2lmaWVycyB0byBiZSB1c2VkIGZvciBhdXRvIGNvbXBsZXRpb24uICovXG4gIHByaXZhdGUgZ2V0VGFyZ2V0Q2hvaWNlcygpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQud29ya3NwYWNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgW3Byb2plY3ROYW1lLCBwcm9qZWN0XSBvZiB0aGlzLmNvbnRleHQud29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBmb3IgKGNvbnN0IFt0YXJnZXROYW1lLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICBjb25zdCBjdXJyZW50VGFyZ2V0ID0gYCR7cHJvamVjdE5hbWV9OiR7dGFyZ2V0TmFtZX1gO1xuICAgICAgICB0YXJnZXRzLnB1c2goY3VycmVudFRhcmdldCk7XG5cbiAgICAgICAgaWYgKCF0YXJnZXQuY29uZmlndXJhdGlvbnMpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgY29uZmlnTmFtZSBvZiBPYmplY3Qua2V5cyh0YXJnZXQuY29uZmlndXJhdGlvbnMpKSB7XG4gICAgICAgICAgdGFyZ2V0cy5wdXNoKGAke2N1cnJlbnRUYXJnZXR9OiR7Y29uZmlnTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRzLnNvcnQoKTtcbiAgfVxufVxuIl19