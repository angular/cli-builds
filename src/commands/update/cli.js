"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCommandModule = void 0;
const path_1 = require("path");
const command_module_1 = require("../../command-builder/command-module");
const update_impl_1 = require("./update-impl");
class UpdateCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'update [packages..]';
        this.describe = 'Updates your workspace and its dependencies. See https://update.angular.io/.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return localYargs
            .positional('packages', {
            description: 'The names of package(s) to update.',
            type: 'string',
        })
            .option('force', {
            description: 'Ignore peer dependency version mismatches. ' +
                'Passes the `--force` flag to the package manager when installing packages.',
            type: 'boolean',
            default: false,
        })
            .option('next', {
            description: 'Use the prerelease version, including beta and RCs.',
            type: 'boolean',
            default: false,
        })
            .option('migrate-only', {
            description: 'Only perform a migration, do not update the installed version.',
            type: 'boolean',
        })
            .option('name', {
            description: 'The name of the migration to run.',
            type: 'string',
            implies: ['migrate-only'],
            conflicts: ['to', 'from'],
        })
            .option('from', {
            description: 'Version from which to migrate from. Only available with a single package being updated, and only on migration only.',
            type: 'string',
            implies: ['to', 'migrate-only'],
            conflicts: ['name'],
        })
            .option('to', {
            describe: 'Version up to which to apply migrations. Only available with a single package being updated, ' +
                'and only on migrations only. Requires from to be specified. Default to the installed version detected.',
            type: 'string',
            implies: ['from', 'migrate-only'],
            conflicts: ['name'],
        })
            .option('allow-dirty', {
            describe: 'Whether to allow updating when the repository contains modified or untracked files.',
            type: 'boolean',
            default: false,
        })
            .option('verbose', {
            describe: 'Display additional details about internal operations during execution.',
            type: 'boolean',
            default: false,
        })
            .option('create-commits', {
            describe: 'Create source control commits for updates and migrations.',
            type: 'boolean',
            alias: ['C'],
            default: false,
        })
            .strict();
    }
    run(options) {
        const command = new update_impl_1.UpdateCommand(this.context, 'update');
        return command.validateAndRun(options);
    }
}
exports.UpdateCommandModule = UpdateCommandModule;
UpdateCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL3VwZGF0ZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsK0JBQTRCO0FBRTVCLHlFQUs4QztBQUM5QywrQ0FBOEM7QUFlOUMsTUFBYSxtQkFBb0IsU0FBUSw4QkFBZ0M7SUFBekU7O1FBR0UsWUFBTyxHQUFHLHFCQUFxQixDQUFDO1FBQ2hDLGFBQVEsR0FBRyw4RUFBOEUsQ0FBQztRQUMxRix3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQXNFL0QsQ0FBQztJQXBFQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVO2FBQ2QsVUFBVSxDQUFDLFVBQVUsRUFBRTtZQUN0QixXQUFXLEVBQUUsb0NBQW9DO1lBQ2pELElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDZixXQUFXLEVBQ1QsNkNBQTZDO2dCQUM3Qyw0RUFBNEU7WUFDOUUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ2QsV0FBVyxFQUFFLHFEQUFxRDtZQUNsRSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxjQUFjLEVBQUU7WUFDdEIsV0FBVyxFQUFFLGdFQUFnRTtZQUM3RSxJQUFJLEVBQUUsU0FBUztTQUNoQixDQUFDO2FBQ0QsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNkLFdBQVcsRUFBRSxtQ0FBbUM7WUFDaEQsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUM7WUFDekIsU0FBUyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztTQUMxQixDQUFDO2FBQ0QsTUFBTSxDQUFDLE1BQU0sRUFBRTtZQUNkLFdBQVcsRUFDVCxxSEFBcUg7WUFDdkgsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDO1lBQy9CLFNBQVMsRUFBRSxDQUFDLE1BQU0sQ0FBQztTQUNwQixDQUFDO2FBQ0QsTUFBTSxDQUFDLElBQUksRUFBRTtZQUNaLFFBQVEsRUFDTiwrRkFBK0Y7Z0JBQy9GLHdHQUF3RztZQUMxRyxJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUM7WUFDakMsU0FBUyxFQUFFLENBQUMsTUFBTSxDQUFDO1NBQ3BCLENBQUM7YUFDRCxNQUFNLENBQUMsYUFBYSxFQUFFO1lBQ3JCLFFBQVEsRUFDTixxRkFBcUY7WUFDdkYsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ2pCLFFBQVEsRUFBRSx3RUFBd0U7WUFDbEYsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsZ0JBQWdCLEVBQUU7WUFDeEIsUUFBUSxFQUFFLDJEQUEyRDtZQUNyRSxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNaLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUVELEdBQUcsQ0FBQyxPQUFrRDtRQUNwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUUxRCxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekMsQ0FBQzs7QUExRUgsa0RBMkVDO0FBMUVpQix5QkFBSyxHQUFHLDZCQUFZLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IFVwZGF0ZUNvbW1hbmQgfSBmcm9tICcuL3VwZGF0ZS1pbXBsJztcblxuZXhwb3J0IGludGVyZmFjZSBVcGRhdGVDb21tYW5kQXJncyB7XG4gIHBhY2thZ2VzPzogc3RyaW5nIHwgc3RyaW5nW107XG4gIGZvcmNlOiBib29sZWFuO1xuICBuZXh0OiBib29sZWFuO1xuICAnbWlncmF0ZS1vbmx5Jz86IGJvb2xlYW47XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGZyb20/OiBzdHJpbmc7XG4gIHRvPzogc3RyaW5nO1xuICAnYWxsb3ctZGlydHknOiBib29sZWFuO1xuICB2ZXJib3NlOiBib29sZWFuO1xuICAnY3JlYXRlLWNvbW1pdHMnOiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgVXBkYXRlQ29tbWFuZE1vZHVsZSBleHRlbmRzIENvbW1hbmRNb2R1bGU8VXBkYXRlQ29tbWFuZEFyZ3M+IHtcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLkluO1xuXG4gIGNvbW1hbmQgPSAndXBkYXRlIFtwYWNrYWdlcy4uXSc7XG4gIGRlc2NyaWJlID0gJ1VwZGF0ZXMgeW91ciB3b3Jrc3BhY2UgYW5kIGl0cyBkZXBlbmRlbmNpZXMuIFNlZSBodHRwczovL3VwZGF0ZS5hbmd1bGFyLmlvLy4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgYnVpbGRlcihsb2NhbFlhcmdzOiBBcmd2KTogQXJndjxVcGRhdGVDb21tYW5kQXJncz4ge1xuICAgIHJldHVybiBsb2NhbFlhcmdzXG4gICAgICAucG9zaXRpb25hbCgncGFja2FnZXMnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG5hbWVzIG9mIHBhY2thZ2UocykgdG8gdXBkYXRlLicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAnSWdub3JlIHBlZXIgZGVwZW5kZW5jeSB2ZXJzaW9uIG1pc21hdGNoZXMuICcgK1xuICAgICAgICAgICdQYXNzZXMgdGhlIGAtLWZvcmNlYCBmbGFnIHRvIHRoZSBwYWNrYWdlIG1hbmFnZXIgd2hlbiBpbnN0YWxsaW5nIHBhY2thZ2VzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLm9wdGlvbignbmV4dCcsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdVc2UgdGhlIHByZXJlbGVhc2UgdmVyc2lvbiwgaW5jbHVkaW5nIGJldGEgYW5kIFJDcy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ21pZ3JhdGUtb25seScsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdPbmx5IHBlcmZvcm0gYSBtaWdyYXRpb24sIGRvIG5vdCB1cGRhdGUgdGhlIGluc3RhbGxlZCB2ZXJzaW9uLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCduYW1lJywge1xuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBuYW1lIG9mIHRoZSBtaWdyYXRpb24gdG8gcnVuLicsXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBpbXBsaWVzOiBbJ21pZ3JhdGUtb25seSddLFxuICAgICAgICBjb25mbGljdHM6IFsndG8nLCAnZnJvbSddLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2Zyb20nLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdWZXJzaW9uIGZyb20gd2hpY2ggdG8gbWlncmF0ZSBmcm9tLiBPbmx5IGF2YWlsYWJsZSB3aXRoIGEgc2luZ2xlIHBhY2thZ2UgYmVpbmcgdXBkYXRlZCwgYW5kIG9ubHkgb24gbWlncmF0aW9uIG9ubHkuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsndG8nLCAnbWlncmF0ZS1vbmx5J10sXG4gICAgICAgIGNvbmZsaWN0czogWyduYW1lJ10sXG4gICAgICB9KVxuICAgICAgLm9wdGlvbigndG8nLCB7XG4gICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICdWZXJzaW9uIHVwIHRvIHdoaWNoIHRvIGFwcGx5IG1pZ3JhdGlvbnMuIE9ubHkgYXZhaWxhYmxlIHdpdGggYSBzaW5nbGUgcGFja2FnZSBiZWluZyB1cGRhdGVkLCAnICtcbiAgICAgICAgICAnYW5kIG9ubHkgb24gbWlncmF0aW9ucyBvbmx5LiBSZXF1aXJlcyBmcm9tIHRvIGJlIHNwZWNpZmllZC4gRGVmYXVsdCB0byB0aGUgaW5zdGFsbGVkIHZlcnNpb24gZGV0ZWN0ZWQuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgIGltcGxpZXM6IFsnZnJvbScsICdtaWdyYXRlLW9ubHknXSxcbiAgICAgICAgY29uZmxpY3RzOiBbJ25hbWUnXSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdhbGxvdy1kaXJ0eScsIHtcbiAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgJ1doZXRoZXIgdG8gYWxsb3cgdXBkYXRpbmcgd2hlbiB0aGUgcmVwb3NpdG9yeSBjb250YWlucyBtb2RpZmllZCBvciB1bnRyYWNrZWQgZmlsZXMuJyxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCd2ZXJib3NlJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc3BsYXkgYWRkaXRpb25hbCBkZXRhaWxzIGFib3V0IGludGVybmFsIG9wZXJhdGlvbnMgZHVyaW5nIGV4ZWN1dGlvbi4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2NyZWF0ZS1jb21taXRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0NyZWF0ZSBzb3VyY2UgY29udHJvbCBjb21taXRzIGZvciB1cGRhdGVzIGFuZCBtaWdyYXRpb25zLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgYWxpYXM6IFsnQyddLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIH0pXG4gICAgICAuc3RyaWN0KCk7XG4gIH1cblxuICBydW4ob3B0aW9uczogT3B0aW9uczxVcGRhdGVDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUNvbW1hbmQodGhpcy5jb250ZXh0LCAndXBkYXRlJyk7XG5cbiAgICByZXR1cm4gY29tbWFuZC52YWxpZGF0ZUFuZFJ1bihvcHRpb25zKTtcbiAgfVxufVxuIl19