"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewCommandModule = void 0;
const command_module_1 = require("../../command-builder/command-module");
const schematics_command_module_1 = require("../../command-builder/schematics-command-module");
const package_manager_1 = require("../../utilities/package-manager");
const version_1 = require("../../utilities/version");
class NewCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    constructor() {
        super(...arguments);
        this.schematicName = 'ng-new';
        this.allowPrivateSchematics = true;
        this.command = 'new [name]';
        this.aliases = 'n';
        this.describe = 'Creates a new Angular workspace.';
    }
    async builder(argv) {
        const localYargs = (await super.builder(argv)).option('collection', {
            alias: 'c',
            describe: 'A collection of schematics to use in generating the initial application.',
            type: 'string',
        });
        const { options: { collectionNameFromArgs }, } = this.context.args;
        const collectionName = typeof collectionNameFromArgs === 'string'
            ? collectionNameFromArgs
            : await this.getDefaultSchematicCollection();
        const workflow = await this.getOrCreateWorkflowForBuilder(collectionName);
        const collection = workflow.engine.createCollection(collectionName);
        const options = await this.getSchematicOptions(collection, this.schematicName, workflow);
        return this.addSchemaOptionsToCommand(localYargs, options);
    }
    async run(options) {
        var _a;
        // Register the version of the CLI in the registry.
        const collectionName = (_a = options.collection) !== null && _a !== void 0 ? _a : (await this.getDefaultSchematicCollection());
        const workflow = await this.getOrCreateWorkflowForExecution(collectionName, options);
        workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version_1.VERSION.full);
        const { dryRun, force, interactive, defaults, collection, ...schematicOptions } = options;
        // Compatibility check for NPM 7
        if (collectionName === '@schematics/angular' &&
            !schematicOptions.skipInstall &&
            (schematicOptions.packageManager === undefined || schematicOptions.packageManager === 'npm')) {
            await (0, package_manager_1.ensureCompatibleNpm)(this.context.root);
        }
        return this.runSchematic({
            collectionName,
            schematicName: this.schematicName,
            schematicOptions,
            executionOptions: {
                dryRun,
                force,
                interactive,
                defaults,
            },
        });
    }
}
exports.NewCommandModule = NewCommandModule;
NewCommandModule.scope = command_module_1.CommandScope.Out;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL25ldy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gseUVBSzhDO0FBQzlDLCtGQUd5RDtBQUN6RCxxRUFBc0U7QUFDdEUscURBQWtEO0FBTWxELE1BQWEsZ0JBQ1gsU0FBUSxtREFBdUI7SUFEakM7O1FBSW1CLGtCQUFhLEdBQUcsUUFBUSxDQUFDO1FBRXZCLDJCQUFzQixHQUFHLElBQUksQ0FBQztRQUVqRCxZQUFPLEdBQUcsWUFBWSxDQUFDO1FBQ3ZCLFlBQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxhQUFRLEdBQUcsa0NBQWtDLENBQUM7SUF1RGhELENBQUM7SUFwRFUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUNsRSxLQUFLLEVBQUUsR0FBRztZQUNWLFFBQVEsRUFBRSwwRUFBMEU7WUFDcEYsSUFBSSxFQUFFLFFBQVE7U0FDZixDQUFDLENBQUM7UUFFSCxNQUFNLEVBQ0osT0FBTyxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsR0FDcEMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUV0QixNQUFNLGNBQWMsR0FDbEIsT0FBTyxzQkFBc0IsS0FBSyxRQUFRO1lBQ3hDLENBQUMsQ0FBQyxzQkFBc0I7WUFDeEIsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFFakQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUUsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRSxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUV6RixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBK0M7O1FBQ3ZELG1EQUFtRDtRQUNuRCxNQUFNLGNBQWMsR0FBRyxNQUFBLE9BQU8sQ0FBQyxVQUFVLG1DQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRixRQUFRLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEYsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUUxRixnQ0FBZ0M7UUFDaEMsSUFDRSxjQUFjLEtBQUsscUJBQXFCO1lBQ3hDLENBQUMsZ0JBQWdCLENBQUMsV0FBVztZQUM3QixDQUFDLGdCQUFnQixDQUFDLGNBQWMsS0FBSyxTQUFTLElBQUksZ0JBQWdCLENBQUMsY0FBYyxLQUFLLEtBQUssQ0FBQyxFQUM1RjtZQUNBLE1BQU0sSUFBQSxxQ0FBbUIsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlDO1FBRUQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3ZCLGNBQWM7WUFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsZ0JBQWdCO1lBQ2hCLGdCQUFnQixFQUFFO2dCQUNoQixNQUFNO2dCQUNOLEtBQUs7Z0JBQ0wsV0FBVztnQkFDWCxRQUFRO2FBQ1Q7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDOztBQWhFSCw0Q0FpRUM7QUE1RGlCLHNCQUFLLEdBQUcsNkJBQVksQ0FBQyxHQUFHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgQ29tbWFuZFNjb3BlLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBlbnN1cmVDb21wYXRpYmxlTnBtIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3BhY2thZ2UtbWFuYWdlcic7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5pbnRlcmZhY2UgTmV3Q29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBjb2xsZWN0aW9uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTmV3Q29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPE5ld0NvbW1hbmRBcmdzPlxue1xuICBwcml2YXRlIHJlYWRvbmx5IHNjaGVtYXRpY05hbWUgPSAnbmctbmV3JztcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLk91dDtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGFsbG93UHJpdmF0ZVNjaGVtYXRpY3MgPSB0cnVlO1xuXG4gIGNvbW1hbmQgPSAnbmV3IFtuYW1lXSc7XG4gIGFsaWFzZXMgPSAnbic7XG4gIGRlc2NyaWJlID0gJ0NyZWF0ZXMgYSBuZXcgQW5ndWxhciB3b3Jrc3BhY2UuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBvdmVycmlkZSBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8TmV3Q29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgbG9jYWxZYXJncyA9IChhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpKS5vcHRpb24oJ2NvbGxlY3Rpb24nLCB7XG4gICAgICBhbGlhczogJ2MnLFxuICAgICAgZGVzY3JpYmU6ICdBIGNvbGxlY3Rpb24gb2Ygc2NoZW1hdGljcyB0byB1c2UgaW4gZ2VuZXJhdGluZyB0aGUgaW5pdGlhbCBhcHBsaWNhdGlvbi4nLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgfSk7XG5cbiAgICBjb25zdCB7XG4gICAgICBvcHRpb25zOiB7IGNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgfSxcbiAgICB9ID0gdGhpcy5jb250ZXh0LmFyZ3M7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9XG4gICAgICB0eXBlb2YgY29sbGVjdGlvbk5hbWVGcm9tQXJncyA9PT0gJ3N0cmluZydcbiAgICAgICAgPyBjb2xsZWN0aW9uTmFtZUZyb21BcmdzXG4gICAgICAgIDogYXdhaXQgdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JCdWlsZGVyKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB3b3JrZmxvdyk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIG9wdGlvbnMpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8TmV3Q29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgLy8gUmVnaXN0ZXIgdGhlIHZlcnNpb24gb2YgdGhlIENMSSBpbiB0aGUgcmVnaXN0cnkuXG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb24gPz8gKGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKSk7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JFeGVjdXRpb24oY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCduZy1jbGktdmVyc2lvbicsICgpID0+IFZFUlNJT04uZnVsbCk7XG5cbiAgICBjb25zdCB7IGRyeVJ1biwgZm9yY2UsIGludGVyYWN0aXZlLCBkZWZhdWx0cywgY29sbGVjdGlvbiwgLi4uc2NoZW1hdGljT3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIC8vIENvbXBhdGliaWxpdHkgY2hlY2sgZm9yIE5QTSA3XG4gICAgaWYgKFxuICAgICAgY29sbGVjdGlvbk5hbWUgPT09ICdAc2NoZW1hdGljcy9hbmd1bGFyJyAmJlxuICAgICAgIXNjaGVtYXRpY09wdGlvbnMuc2tpcEluc3RhbGwgJiZcbiAgICAgIChzY2hlbWF0aWNPcHRpb25zLnBhY2thZ2VNYW5hZ2VyID09PSB1bmRlZmluZWQgfHwgc2NoZW1hdGljT3B0aW9ucy5wYWNrYWdlTWFuYWdlciA9PT0gJ25wbScpXG4gICAgKSB7XG4gICAgICBhd2FpdCBlbnN1cmVDb21wYXRpYmxlTnBtKHRoaXMuY29udGV4dC5yb290KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgZXhlY3V0aW9uT3B0aW9uczoge1xuICAgICAgICBkcnlSdW4sXG4gICAgICAgIGZvcmNlLFxuICAgICAgICBpbnRlcmFjdGl2ZSxcbiAgICAgICAgZGVmYXVsdHMsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG4iXX0=