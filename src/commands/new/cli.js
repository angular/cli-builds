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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL25ldy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gseUVBSzhDO0FBQzlDLCtGQUl5RDtBQUN6RCxxRUFBc0U7QUFDdEUscURBQWtEO0FBTWxELE1BQWEsZ0JBQ1gsU0FBUSxtREFBdUI7SUFEakM7O1FBSW1CLGtCQUFhLEdBQUcsUUFBUSxDQUFDO1FBRXZCLDJCQUFzQixHQUFHLElBQUksQ0FBQztRQUVqRCxZQUFPLEdBQUcsWUFBWSxDQUFDO1FBQ3ZCLFlBQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxhQUFRLEdBQUcsa0NBQWtDLENBQUM7SUFzRWhELENBQUM7SUFuRVUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUNsRSxLQUFLLEVBQUUsR0FBRztZQUNWLFFBQVEsRUFBRSwwRUFBMEU7WUFDcEYsSUFBSSxFQUFFLFFBQVE7U0FDZixDQUFDLENBQUM7UUFFSCxNQUFNLEVBQ0osT0FBTyxFQUFFLEVBQUUsc0JBQXNCLEVBQUUsR0FDcEMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUV0QixNQUFNLGNBQWMsR0FDbEIsT0FBTyxzQkFBc0IsS0FBSyxRQUFRO1lBQ3hDLENBQUMsQ0FBQyxzQkFBc0I7WUFDeEIsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFFM0MsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsNkJBQTZCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDMUUsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRSxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUV6RixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBK0M7O1FBQ3ZELG1EQUFtRDtRQUNuRCxNQUFNLGNBQWMsR0FBRyxNQUFBLE9BQU8sQ0FBQyxVQUFVLG1DQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRixRQUFRLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEYsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUUxRixnQ0FBZ0M7UUFDaEMsSUFDRSxjQUFjLEtBQUsscUJBQXFCO1lBQ3hDLENBQUMsZ0JBQWdCLENBQUMsV0FBVztZQUM3QixDQUFDLGdCQUFnQixDQUFDLGNBQWMsS0FBSyxTQUFTLElBQUksZ0JBQWdCLENBQUMsY0FBYyxLQUFLLEtBQUssQ0FBQyxFQUM1RjtZQUNBLE1BQU0sSUFBQSxxQ0FBbUIsRUFBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlDO1FBRUQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3ZCLGNBQWM7WUFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsZ0JBQWdCO1lBQ2hCLGdCQUFnQixFQUFFO2dCQUNoQixNQUFNO2dCQUNOLEtBQUs7Z0JBQ0wsV0FBVztnQkFDWCxRQUFRO2FBQ1Q7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsb0VBQW9FO0lBQzVELEtBQUssQ0FBQyx1QkFBdUI7UUFDbkMsS0FBSyxNQUFNLGNBQWMsSUFBSSxNQUFNLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxFQUFFO1lBQ2pFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNwRSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sc0JBQXNCLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUM7WUFFakUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRTtnQkFDcEUsT0FBTyxjQUFjLENBQUM7YUFDdkI7U0FDRjtRQUVELE9BQU8seURBQTZCLENBQUM7SUFDdkMsQ0FBQzs7QUEvRUgsNENBZ0ZDO0FBM0VpQixzQkFBSyxHQUFHLDZCQUFZLENBQUMsR0FBRyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT04sXG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGVuc3VyZUNvbXBhdGlibGVOcG0gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvcGFja2FnZS1tYW5hZ2VyJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdmVyc2lvbic7XG5cbmludGVyZmFjZSBOZXdDb21tYW5kQXJncyBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGNvbGxlY3Rpb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBOZXdDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248TmV3Q29tbWFuZEFyZ3M+XG57XG4gIHByaXZhdGUgcmVhZG9ubHkgc2NoZW1hdGljTmFtZSA9ICduZy1uZXcnO1xuICBzdGF0aWMgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuT3V0O1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG5cbiAgY29tbWFuZCA9ICduZXcgW25hbWVdJztcbiAgYWxpYXNlcyA9ICduJztcbiAgZGVzY3JpYmUgPSAnQ3JlYXRlcyBhIG5ldyBBbmd1bGFyIHdvcmtzcGFjZS4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxOZXdDb21tYW5kQXJncz4+IHtcbiAgICBjb25zdCBsb2NhbFlhcmdzID0gKGF3YWl0IHN1cGVyLmJ1aWxkZXIoYXJndikpLm9wdGlvbignY29sbGVjdGlvbicsIHtcbiAgICAgIGFsaWFzOiAnYycsXG4gICAgICBkZXNjcmliZTogJ0EgY29sbGVjdGlvbiBvZiBzY2hlbWF0aWNzIHRvIHVzZSBpbiBnZW5lcmF0aW5nIHRoZSBpbml0aWFsIGFwcGxpY2F0aW9uLicsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHtcbiAgICAgIG9wdGlvbnM6IHsgY29sbGVjdGlvbk5hbWVGcm9tQXJncyB9LFxuICAgIH0gPSB0aGlzLmNvbnRleHQuYXJncztcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID1cbiAgICAgIHR5cGVvZiBjb2xsZWN0aW9uTmFtZUZyb21BcmdzID09PSAnc3RyaW5nJ1xuICAgICAgICA/IGNvbGxlY3Rpb25OYW1lRnJvbUFyZ3NcbiAgICAgICAgOiBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25Gcm9tQ29uZmlnKCk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWUpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljT3B0aW9ucyhjb2xsZWN0aW9uLCB0aGlzLnNjaGVtYXRpY05hbWUsIHdvcmtmbG93KTtcblxuICAgIHJldHVybiB0aGlzLmFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQobG9jYWxZYXJncywgb3B0aW9ucyk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxOZXdDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICAvLyBSZWdpc3RlciB0aGUgdmVyc2lvbiBvZiB0aGUgQ0xJIGluIHRoZSByZWdpc3RyeS5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbiA/PyAoYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uRnJvbUNvbmZpZygpKTtcbiAgICBjb25zdCB3b3JrZmxvdyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckV4ZWN1dGlvbihjb2xsZWN0aW9uTmFtZSwgb3B0aW9ucyk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ25nLWNsaS12ZXJzaW9uJywgKCkgPT4gVkVSU0lPTi5mdWxsKTtcblxuICAgIGNvbnN0IHsgZHJ5UnVuLCBmb3JjZSwgaW50ZXJhY3RpdmUsIGRlZmF1bHRzLCBjb2xsZWN0aW9uLCAuLi5zY2hlbWF0aWNPcHRpb25zIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gQ29tcGF0aWJpbGl0eSBjaGVjayBmb3IgTlBNIDdcbiAgICBpZiAoXG4gICAgICBjb2xsZWN0aW9uTmFtZSA9PT0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInICYmXG4gICAgICAhc2NoZW1hdGljT3B0aW9ucy5za2lwSW5zdGFsbCAmJlxuICAgICAgKHNjaGVtYXRpY09wdGlvbnMucGFja2FnZU1hbmFnZXIgPT09IHVuZGVmaW5lZCB8fCBzY2hlbWF0aWNPcHRpb25zLnBhY2thZ2VNYW5hZ2VyID09PSAnbnBtJylcbiAgICApIHtcbiAgICAgIGF3YWl0IGVuc3VyZUNvbXBhdGlibGVOcG0odGhpcy5jb250ZXh0LnJvb3QpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgIGRyeVJ1bixcbiAgICAgICAgZm9yY2UsXG4gICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvKiogRmluZCBhIGNvbGxlY3Rpb24gZnJvbSBjb25maWcgdGhhdCBoYXMgYW4gYG5nLW5ld2Agc2NoZW1hdGljLiAqL1xuICBwcml2YXRlIGFzeW5jIGdldENvbGxlY3Rpb25Gcm9tQ29uZmlnKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgZm9yIChjb25zdCBjb2xsZWN0aW9uTmFtZSBvZiBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCkpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljc0luQ29sbGVjdGlvbiA9IGNvbGxlY3Rpb24uZGVzY3JpcHRpb24uc2NoZW1hdGljcztcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNjaGVtYXRpY3NJbkNvbGxlY3Rpb24pLmluY2x1ZGVzKHRoaXMuc2NoZW1hdGljTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTjtcbiAgfVxufVxuIl19