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
        const localYargs = argv
            .positional('target', {
            describe: 'The Architect target to run.',
            type: 'string',
            demandOption: true,
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
}
exports.RunCommandModule = RunCommandModule;
RunCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3J1bi9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsK0JBQTRCO0FBRTVCLHVHQUFpRztBQUNqRyx5RUFPOEM7QUFNOUMsTUFBYSxnQkFDWCxTQUFRLDBEQUEwQztJQURwRDs7UUFNRSxZQUFPLEdBQUcsY0FBYyxDQUFDO1FBQ3pCLGFBQVEsR0FDTixpR0FBaUcsQ0FBQztRQUNwRyx3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQThDL0QsQ0FBQztJQTVDQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDdEIsTUFBTSxVQUFVLEdBQXlCLElBQUk7YUFDMUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtZQUNwQixRQUFRLEVBQUUsOEJBQThCO1lBQ3hDLElBQUksRUFBRSxRQUFRO1lBQ2QsWUFBWSxFQUFFLElBQUk7U0FDbkIsQ0FBQzthQUNELE1BQU0sRUFBRSxDQUFDO1FBRVosTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE9BQU8sVUFBVSxDQUFDO1NBQ25CO1FBRUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkUsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQStDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUVyRCxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsTUFBTSxJQUFJLG1DQUFrQixDQUFDLHFDQUFxQyxDQUFDLENBQUM7U0FDckU7UUFFRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFUyxtQkFBbUIsQ0FBQyxPQUFpQzs7UUFDN0QsTUFBTSxlQUFlLEdBQUcsTUFBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsTUFBTSxtQ0FBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNwQixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsYUFBYSxDQUFDLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU5RSxPQUFPO1lBQ0wsT0FBTztZQUNQLE1BQU07WUFDTixhQUFhO1NBQ2QsQ0FBQztJQUNKLENBQUM7O0FBdERILDRDQXVEQztBQW5EaUIsc0JBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBUYXJnZXQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZSB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9hcmNoaXRlY3QtYmFzZS1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuQ29tbWFuZEFyZ3Mge1xuICB0YXJnZXQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFJ1bkNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBBcmNoaXRlY3RCYXNlQ29tbWFuZE1vZHVsZTxSdW5Db21tYW5kQXJncz5cbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248UnVuQ29tbWFuZEFyZ3M+XG57XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcblxuICBjb21tYW5kID0gJ3J1biA8dGFyZ2V0Pic7XG4gIGRlc2NyaWJlID1cbiAgICAnUnVucyBhbiBBcmNoaXRlY3QgdGFyZ2V0IHdpdGggYW4gb3B0aW9uYWwgY3VzdG9tIGJ1aWxkZXIgY29uZmlndXJhdGlvbiBkZWZpbmVkIGluIHlvdXIgcHJvamVjdC4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PFJ1bkNvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IGxvY2FsWWFyZ3M6IEFyZ3Y8UnVuQ29tbWFuZEFyZ3M+ID0gYXJndlxuICAgICAgLnBvc2l0aW9uYWwoJ3RhcmdldCcsIHtcbiAgICAgICAgZGVzY3JpYmU6ICdUaGUgQXJjaGl0ZWN0IHRhcmdldCB0byBydW4uJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG5cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm1ha2VUYXJnZXRTcGVjaWZpZXIoKTtcbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgcmV0dXJuIGxvY2FsWWFyZ3M7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hT3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0QXJjaGl0ZWN0VGFyZ2V0T3B0aW9ucyh0YXJnZXQpO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBzY2hlbWFPcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPFJ1bkNvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgIGNvbnN0IHsgdGFyZ2V0OiBfdGFyZ2V0LCAuLi5leHRyYU9wdGlvbnMgfSA9IG9wdGlvbnM7XG5cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TaW5nbGVUYXJnZXQodGFyZ2V0LCBleHRyYU9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG1ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucz86IE9wdGlvbnM8UnVuQ29tbWFuZEFyZ3M+KTogVGFyZ2V0IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBhcmNoaXRlY3RUYXJnZXQgPSBvcHRpb25zPy50YXJnZXQgPz8gdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXTtcbiAgICBpZiAoIWFyY2hpdGVjdFRhcmdldCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBbcHJvamVjdCA9ICcnLCB0YXJnZXQgPSAnJywgY29uZmlndXJhdGlvbl0gPSBhcmNoaXRlY3RUYXJnZXQuc3BsaXQoJzonKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgdGFyZ2V0LFxuICAgICAgY29uZmlndXJhdGlvbixcbiAgICB9O1xuICB9XG59XG4iXX0=