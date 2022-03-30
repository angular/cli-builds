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
            : await this.getCollectionFromConfig();
        const workflow = await this.getOrCreateWorkflowForBuilder(collectionName);
        const collection = workflow.engine.createCollection(collectionName);
        const options = await this.getSchematicOptions(collection, this.schematicName, workflow);
        return this.addSchemaOptionsToCommand(localYargs, options);
    }
    async run(options) {
        var _a;
        // Register the version of the CLI in the registry.
        const collectionName = (_a = options.collection) !== null && _a !== void 0 ? _a : (await this.getCollectionFromConfig());
        const workflow = await this.getOrCreateWorkflowForExecution(collectionName, options);
        workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version_1.VERSION.full);
        const { dryRun, force, interactive, defaults, collection, ...schematicOptions } = options;
        // Compatibility check for NPM 7
        if (collectionName === '@schematics/angular' &&
            !schematicOptions.skipInstall &&
            (schematicOptions.packageManager === undefined || schematicOptions.packageManager === 'npm')) {
            this.context.packageManager.ensureCompatibility();
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
    /** Find a collection from config that has an `ng-new` schematic. */
    async getCollectionFromConfig() {
        for (const collectionName of await this.getSchematicCollections()) {
            const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
            const collection = workflow.engine.createCollection(collectionName);
            const schematicsInCollection = collection.description.schematics;
            if (Object.keys(schematicsInCollection).includes(this.schematicName)) {
                return collectionName;
            }
        }
        return schematics_command_module_1.DEFAULT_SCHEMATICS_COLLECTION;
    }
}
exports.NewCommandModule = NewCommandModule;
NewCommandModule.scope = command_module_1.CommandScope.Out;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL25ldy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gseUVBSzhDO0FBQzlDLCtGQUl5RDtBQUN6RCxxREFBa0Q7QUFNbEQsTUFBYSxnQkFDWCxTQUFRLG1EQUF1QjtJQURqQzs7UUFJbUIsa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFFdkIsMkJBQXNCLEdBQUcsSUFBSSxDQUFDO1FBRWpELFlBQU8sR0FBRyxZQUFZLENBQUM7UUFDdkIsWUFBTyxHQUFHLEdBQUcsQ0FBQztRQUNkLGFBQVEsR0FBRyxrQ0FBa0MsQ0FBQztJQXNFaEQsQ0FBQztJQW5FVSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDL0IsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ2xFLEtBQUssRUFBRSxHQUFHO1lBQ1YsUUFBUSxFQUFFLDBFQUEwRTtZQUNwRixJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUMsQ0FBQztRQUVILE1BQU0sRUFDSixPQUFPLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxHQUNwQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBRXRCLE1BQU0sY0FBYyxHQUNsQixPQUFPLHNCQUFzQixLQUFLLFFBQVE7WUFDeEMsQ0FBQyxDQUFDLHNCQUFzQjtZQUN4QixDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUUzQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxRSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXpGLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUErQzs7UUFDdkQsbURBQW1EO1FBQ25ELE1BQU0sY0FBYyxHQUFHLE1BQUEsT0FBTyxDQUFDLFVBQVUsbUNBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDcEYsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3JGLFFBQVEsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRixNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxHQUFHLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxDQUFDO1FBRTFGLGdDQUFnQztRQUNoQyxJQUNFLGNBQWMsS0FBSyxxQkFBcUI7WUFDeEMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXO1lBQzdCLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxLQUFLLFNBQVMsSUFBSSxnQkFBZ0IsQ0FBQyxjQUFjLEtBQUssS0FBSyxDQUFDLEVBQzVGO1lBQ0EsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztTQUNuRDtRQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN2QixjQUFjO1lBQ2QsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGdCQUFnQjtZQUNoQixnQkFBZ0IsRUFBRTtnQkFDaEIsTUFBTTtnQkFDTixLQUFLO2dCQUNMLFdBQVc7Z0JBQ1gsUUFBUTthQUNUO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELG9FQUFvRTtJQUM1RCxLQUFLLENBQUMsdUJBQXVCO1FBQ25DLEtBQUssTUFBTSxjQUFjLElBQUksTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsRUFBRTtZQUNqRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDcEUsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNwRSxNQUFNLHNCQUFzQixHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDO1lBRWpFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3BFLE9BQU8sY0FBYyxDQUFDO2FBQ3ZCO1NBQ0Y7UUFFRCxPQUFPLHlEQUE2QixDQUFDO0lBQ3ZDLENBQUM7O0FBL0VILDRDQWdGQztBQTNFaUIsc0JBQUssR0FBRyw2QkFBWSxDQUFDLEdBQUcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OLFxuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5pbnRlcmZhY2UgTmV3Q29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBjb2xsZWN0aW9uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTmV3Q29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPE5ld0NvbW1hbmRBcmdzPlxue1xuICBwcml2YXRlIHJlYWRvbmx5IHNjaGVtYXRpY05hbWUgPSAnbmctbmV3JztcbiAgc3RhdGljIG92ZXJyaWRlIHNjb3BlID0gQ29tbWFuZFNjb3BlLk91dDtcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGFsbG93UHJpdmF0ZVNjaGVtYXRpY3MgPSB0cnVlO1xuXG4gIGNvbW1hbmQgPSAnbmV3IFtuYW1lXSc7XG4gIGFsaWFzZXMgPSAnbic7XG4gIGRlc2NyaWJlID0gJ0NyZWF0ZXMgYSBuZXcgQW5ndWxhciB3b3Jrc3BhY2UuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBvdmVycmlkZSBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8TmV3Q29tbWFuZEFyZ3M+PiB7XG4gICAgY29uc3QgbG9jYWxZYXJncyA9IChhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpKS5vcHRpb24oJ2NvbGxlY3Rpb24nLCB7XG4gICAgICBhbGlhczogJ2MnLFxuICAgICAgZGVzY3JpYmU6ICdBIGNvbGxlY3Rpb24gb2Ygc2NoZW1hdGljcyB0byB1c2UgaW4gZ2VuZXJhdGluZyB0aGUgaW5pdGlhbCBhcHBsaWNhdGlvbi4nLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgfSk7XG5cbiAgICBjb25zdCB7XG4gICAgICBvcHRpb25zOiB7IGNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgfSxcbiAgICB9ID0gdGhpcy5jb250ZXh0LmFyZ3M7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9XG4gICAgICB0eXBlb2YgY29sbGVjdGlvbk5hbWVGcm9tQXJncyA9PT0gJ3N0cmluZydcbiAgICAgICAgPyBjb2xsZWN0aW9uTmFtZUZyb21BcmdzXG4gICAgICAgIDogYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uRnJvbUNvbmZpZygpO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JCdWlsZGVyKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB3b3JrZmxvdyk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIG9wdGlvbnMpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8TmV3Q29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgLy8gUmVnaXN0ZXIgdGhlIHZlcnNpb24gb2YgdGhlIENMSSBpbiB0aGUgcmVnaXN0cnkuXG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb24gPz8gKGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbkZyb21Db25maWcoKSk7XG4gICAgY29uc3Qgd29ya2Zsb3cgPSBhd2FpdCB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JFeGVjdXRpb24oY29sbGVjdGlvbk5hbWUsIG9wdGlvbnMpO1xuICAgIHdvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCduZy1jbGktdmVyc2lvbicsICgpID0+IFZFUlNJT04uZnVsbCk7XG5cbiAgICBjb25zdCB7IGRyeVJ1biwgZm9yY2UsIGludGVyYWN0aXZlLCBkZWZhdWx0cywgY29sbGVjdGlvbiwgLi4uc2NoZW1hdGljT3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIC8vIENvbXBhdGliaWxpdHkgY2hlY2sgZm9yIE5QTSA3XG4gICAgaWYgKFxuICAgICAgY29sbGVjdGlvbk5hbWUgPT09ICdAc2NoZW1hdGljcy9hbmd1bGFyJyAmJlxuICAgICAgIXNjaGVtYXRpY09wdGlvbnMuc2tpcEluc3RhbGwgJiZcbiAgICAgIChzY2hlbWF0aWNPcHRpb25zLnBhY2thZ2VNYW5hZ2VyID09PSB1bmRlZmluZWQgfHwgc2NoZW1hdGljT3B0aW9ucy5wYWNrYWdlTWFuYWdlciA9PT0gJ25wbScpXG4gICAgKSB7XG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuZW5zdXJlQ29tcGF0aWJpbGl0eSgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgIGRyeVJ1bixcbiAgICAgICAgZm9yY2UsXG4gICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvKiogRmluZCBhIGNvbGxlY3Rpb24gZnJvbSBjb25maWcgdGhhdCBoYXMgYW4gYG5nLW5ld2Agc2NoZW1hdGljLiAqL1xuICBwcml2YXRlIGFzeW5jIGdldENvbGxlY3Rpb25Gcm9tQ29uZmlnKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgZm9yIChjb25zdCBjb2xsZWN0aW9uTmFtZSBvZiBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCkpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljc0luQ29sbGVjdGlvbiA9IGNvbGxlY3Rpb24uZGVzY3JpcHRpb24uc2NoZW1hdGljcztcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNjaGVtYXRpY3NJbkNvbGxlY3Rpb24pLmluY2x1ZGVzKHRoaXMuc2NoZW1hdGljTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTjtcbiAgfVxufVxuIl19