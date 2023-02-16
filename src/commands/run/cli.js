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
exports.RunCommandModule = RunCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3J1bi9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBRTVCLHVHQUFpRztBQUNqRyx5RUFNOEM7QUFNOUMsTUFBYSxnQkFDWCxTQUFRLDBEQUEwQztJQURwRDs7UUFJVyxVQUFLLEdBQUcsNkJBQVksQ0FBQyxFQUFFLENBQUM7UUFFakMsWUFBTyxHQUFHLGNBQWMsQ0FBQztRQUN6QixhQUFRLEdBQ04saUdBQWlHLENBQUM7UUFDcEcsd0JBQW1CLEdBQUcsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7SUE0Ri9ELENBQUM7SUExRkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQ3RCLE1BQU0sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBRTFFLE1BQU0sVUFBVSxHQUF5QixJQUFJO2FBQzFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7WUFDcEIsUUFBUSxFQUNOLG9HQUFvRztZQUN0RyxJQUFJLEVBQUUsUUFBUTtZQUNkLFlBQVksRUFBRSxJQUFJO1lBQ2xCLDZIQUE2SDtZQUM3SCwwRUFBMEU7WUFDMUUsT0FBTyxFQUFFLENBQUMsbUJBQW1CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQzFGLENBQUM7YUFDRCxVQUFVLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNuQiw4QkFBOEI7WUFDOUIsTUFBTSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUM7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QXFHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9hcmNoaXRlY3QtYmFzZS1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuQ29tbWFuZEFyZ3Mge1xuICB0YXJnZXQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFJ1bkNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZTxSdW5Db21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248UnVuQ29tbWFuZEFyZ3M+XG57XG4gIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuXG4gIGNvbW1hbmQgPSAncnVuIDx0YXJnZXQ+JztcbiAgZGVzY3JpYmUgPVxuICAgICdSdW5zIGFuIEFyY2hpdGVjdCB0YXJnZXQgd2l0aCBhbiBvcHRpb25hbCBjdXN0b20gYnVpbGRlciBjb25maWd1cmF0aW9uIGRlZmluZWQgaW4geW91ciBwcm9qZWN0Lic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8UnVuQ29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgeyBqc29uSGVscCwgZ2V0WWFyZ3NDb21wbGV0aW9ucywgaGVscCB9ID0gdGhpcy5jb250ZXh0LmFyZ3Mub3B0aW9ucztcblxuICAgIGNvbnN0IGxvY2FsWWFyZ3M6IEFyZ3Y8UnVuQ29tbWFuZEFyZ3M+ID0gYXJndlxuICAgICAgLnBvc2l0aW9uYWwoJ3RhcmdldCcsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1RoZSBBcmNoaXRlY3QgdGFyZ2V0IHRvIHJ1biBwcm92aWRlZCBpbiB0aGUgdGhlIGZvbGxvd2luZyBmb3JtYXQgYHByb2plY3Q6dGFyZ2V0Wzpjb25maWd1cmF0aW9uXWAuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgICAgLy8gU2hvdyBvbmx5IGluIHdoZW4gdXNpbmcgLS1oZWxwIGFuZCBhdXRvIGNvbXBsZXRpb24gYmVjYXVzZSBvdGhlcndpc2UgY29tbWEgc2VwZXJhdGVkIGNvbmZpZ3VyYXRpb24gdmFsdWVzIHdpbGwgYmUgaW52YWxpZC5cbiAgICAgICAgLy8gQWxzbywgaGlkZSBjaG9pY2VzIGZyb20gSlNPTiBoZWxwIHNvIHRoYXQgd2UgZG9uJ3QgZGlzcGxheSB0aGVtIGluIEFJTy5cbiAgICAgICAgY2hvaWNlczogKGdldFlhcmdzQ29tcGxldGlvbnMgfHwgaGVscCkgJiYgIWpzb25IZWxwID8gdGhpcy5nZXRUYXJnZXRDaG9pY2VzKCkgOiB1bmRlZmluZWQsXG4gICAgICB9KVxuICAgICAgLm1pZGRsZXdhcmUoKGFyZ3MpID0+IHtcbiAgICAgICAgLy8gVE9ETzogcmVtb3ZlIGluIHZlcnNpb24gMTUuXG4gICAgICAgIGNvbnN0IHsgY29uZmlndXJhdGlvbiwgdGFyZ2V0IH0gPSBhcmdzO1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZ3VyYXRpb24gPT09ICdzdHJpbmcnICYmIHRhcmdldCkge1xuICAgICAgICAgIGNvbnN0IHRhcmdldFdpdGhDb25maWcgPSB0YXJnZXQuc3BsaXQoJzonLCAyKTtcbiAgICAgICAgICB0YXJnZXRXaXRoQ29uZmlnLnB1c2goY29uZmlndXJhdGlvbik7XG5cbiAgICAgICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKFxuICAgICAgICAgICAgJ1Vua25vd24gYXJndW1lbnQ6IGNvbmZpZ3VyYXRpb24uXFxuJyArXG4gICAgICAgICAgICAgIGBQcm92aWRlIHRoZSBjb25maWd1cmF0aW9uIGFzIHBhcnQgb2YgdGhlIHRhcmdldCAnbmcgcnVuICR7dGFyZ2V0V2l0aENvbmZpZy5qb2luKFxuICAgICAgICAgICAgICAgICc6JyxcbiAgICAgICAgICAgICAgKX0nLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSwgdHJ1ZSlcbiAgICAgIC5zdHJpY3QoKTtcblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMubWFrZVRhcmdldFNwZWNpZmllcigpO1xuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWFPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRBcmNoaXRlY3RUYXJnZXRPcHRpb25zKHRhcmdldCk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIHNjaGVtYU9wdGlvbnMpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8UnVuQ29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm1ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgY29uc3QgeyB0YXJnZXQ6IF90YXJnZXQsIC4uLmV4dHJhT3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0LicpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNpbmdsZVRhcmdldCh0YXJnZXQsIGV4dHJhT3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zPzogT3B0aW9uczxSdW5Db21tYW5kQXJncz4pOiBUYXJnZXQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGFyY2hpdGVjdFRhcmdldCA9IG9wdGlvbnM/LnRhcmdldCA/PyB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdO1xuICAgIGlmICghYXJjaGl0ZWN0VGFyZ2V0KSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IFtwcm9qZWN0ID0gJycsIHRhcmdldCA9ICcnLCBjb25maWd1cmF0aW9uXSA9IGFyY2hpdGVjdFRhcmdldC5zcGxpdCgnOicpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICB0YXJnZXQsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgIH07XG4gIH1cblxuICAvKiogQHJldHVybnMgYSBzb3J0ZWQgbGlzdCBvZiB0YXJnZXQgc3BlY2lmaWVycyB0byBiZSB1c2VkIGZvciBhdXRvIGNvbXBsZXRpb24uICovXG4gIHByaXZhdGUgZ2V0VGFyZ2V0Q2hvaWNlcygpOiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQud29ya3NwYWNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdGFyZ2V0cyA9IFtdO1xuICAgIGZvciAoY29uc3QgW3Byb2plY3ROYW1lLCBwcm9qZWN0XSBvZiB0aGlzLmNvbnRleHQud29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBmb3IgKGNvbnN0IFt0YXJnZXROYW1lLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICBjb25zdCBjdXJyZW50VGFyZ2V0ID0gYCR7cHJvamVjdE5hbWV9OiR7dGFyZ2V0TmFtZX1gO1xuICAgICAgICB0YXJnZXRzLnB1c2goY3VycmVudFRhcmdldCk7XG5cbiAgICAgICAgaWYgKCF0YXJnZXQuY29uZmlndXJhdGlvbnMpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgY29uZmlnTmFtZSBvZiBPYmplY3Qua2V5cyh0YXJnZXQuY29uZmlndXJhdGlvbnMpKSB7XG4gICAgICAgICAgdGFyZ2V0cy5wdXNoKGAke2N1cnJlbnRUYXJnZXR9OiR7Y29uZmlnTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRzLnNvcnQoKTtcbiAgfVxufVxuIl19