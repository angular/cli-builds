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
const node_path_1 = require("node:path");
const command_module_1 = require("../../command-builder/command-module");
const schematics_command_module_1 = require("../../command-builder/schematics-command-module");
const version_1 = require("../../utilities/version");
class NewCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    constructor() {
        super(...arguments);
        this.schematicName = 'ng-new';
        this.scope = command_module_1.CommandScope.Out;
        this.allowPrivateSchematics = true;
        this.command = 'new [name]';
        this.aliases = 'n';
        this.describe = 'Creates a new Angular workspace.';
        this.longDescriptionPath = (0, node_path_1.join)(__dirname, 'long-description.md');
    }
    async builder(argv) {
        const localYargs = (await super.builder(argv)).option('collection', {
            alias: 'c',
            describe: 'A collection of schematics to use in generating the initial application.',
            type: 'string',
        });
        const { options: { collection: collectionNameFromArgs }, } = this.context.args;
        const collectionName = typeof collectionNameFromArgs === 'string'
            ? collectionNameFromArgs
            : await this.getCollectionFromConfig();
        const workflow = await this.getOrCreateWorkflowForBuilder(collectionName);
        const collection = workflow.engine.createCollection(collectionName);
        const options = await this.getSchematicOptions(collection, this.schematicName, workflow);
        return this.addSchemaOptionsToCommand(localYargs, options);
    }
    async run(options) {
        // Register the version of the CLI in the registry.
        const collectionName = options.collection ?? (await this.getCollectionFromConfig());
        const { dryRun, force, interactive, defaults, collection, ...schematicOptions } = options;
        const workflow = await this.getOrCreateWorkflowForExecution(collectionName, {
            dryRun,
            force,
            interactive,
            defaults,
        });
        workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version_1.VERSION.full);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL25ldy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgseUNBQWlDO0FBRWpDLHlFQUs4QztBQUM5QywrRkFJeUQ7QUFDekQscURBQWtEO0FBTWxELE1BQWEsZ0JBQ1gsU0FBUSxtREFBdUI7SUFEakM7O1FBSW1CLGtCQUFhLEdBQUcsUUFBUSxDQUFDO1FBQ2pDLFVBQUssR0FBRyw2QkFBWSxDQUFDLEdBQUcsQ0FBQztRQUNmLDJCQUFzQixHQUFHLElBQUksQ0FBQztRQUVqRCxZQUFPLEdBQUcsWUFBWSxDQUFDO1FBQ3ZCLFlBQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxhQUFRLEdBQUcsa0NBQWtDLENBQUM7UUFDOUMsd0JBQW1CLEdBQUcsSUFBQSxnQkFBSSxFQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBeUUvRCxDQUFDO0lBdkVVLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUMvQixNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDbEUsS0FBSyxFQUFFLEdBQUc7WUFDVixRQUFRLEVBQUUsMEVBQTBFO1lBQ3BGLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUNKLE9BQU8sRUFBRSxFQUFFLFVBQVUsRUFBRSxzQkFBc0IsRUFBRSxHQUNoRCxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBRXRCLE1BQU0sY0FBYyxHQUNsQixPQUFPLHNCQUFzQixLQUFLLFFBQVE7WUFDeEMsQ0FBQyxDQUFDLHNCQUFzQjtZQUN4QixDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUUzQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxRSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXpGLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUErQztRQUN2RCxtREFBbUQ7UUFDbkQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQztRQUNwRixNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxHQUFHLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxDQUFDO1FBQzFGLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLGNBQWMsRUFBRTtZQUMxRSxNQUFNO1lBQ04sS0FBSztZQUNMLFdBQVc7WUFDWCxRQUFRO1NBQ1QsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWhGLGdDQUFnQztRQUNoQyxJQUNFLGNBQWMsS0FBSyxxQkFBcUI7WUFDeEMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXO1lBQzdCLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxLQUFLLFNBQVMsSUFBSSxnQkFBZ0IsQ0FBQyxjQUFjLEtBQUssS0FBSyxDQUFDLEVBQzVGO1lBQ0EsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztTQUNuRDtRQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN2QixjQUFjO1lBQ2QsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGdCQUFnQjtZQUNoQixnQkFBZ0IsRUFBRTtnQkFDaEIsTUFBTTtnQkFDTixLQUFLO2dCQUNMLFdBQVc7Z0JBQ1gsUUFBUTthQUNUO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELG9FQUFvRTtJQUM1RCxLQUFLLENBQUMsdUJBQXVCO1FBQ25DLEtBQUssTUFBTSxjQUFjLElBQUksTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsRUFBRTtZQUNqRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDcEUsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNwRSxNQUFNLHNCQUFzQixHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDO1lBRWpFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3BFLE9BQU8sY0FBYyxDQUFDO2FBQ3ZCO1NBQ0Y7UUFFRCxPQUFPLHlEQUE2QixDQUFDO0lBQ3ZDLENBQUM7Q0FDRjtBQXBGRCw0Q0FvRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBDb21tYW5kU2NvcGUsXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OLFxuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuXG5pbnRlcmZhY2UgTmV3Q29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBjb2xsZWN0aW9uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTmV3Q29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPE5ld0NvbW1hbmRBcmdzPlxue1xuICBwcml2YXRlIHJlYWRvbmx5IHNjaGVtYXRpY05hbWUgPSAnbmctbmV3JztcbiAgb3ZlcnJpZGUgc2NvcGUgPSBDb21tYW5kU2NvcGUuT3V0O1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG5cbiAgY29tbWFuZCA9ICduZXcgW25hbWVdJztcbiAgYWxpYXNlcyA9ICduJztcbiAgZGVzY3JpYmUgPSAnQ3JlYXRlcyBhIG5ldyBBbmd1bGFyIHdvcmtzcGFjZS4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoID0gam9pbihfX2Rpcm5hbWUsICdsb25nLWRlc2NyaXB0aW9uLm1kJyk7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PE5ld0NvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IGxvY2FsWWFyZ3MgPSAoYXdhaXQgc3VwZXIuYnVpbGRlcihhcmd2KSkub3B0aW9uKCdjb2xsZWN0aW9uJywge1xuICAgICAgYWxpYXM6ICdjJyxcbiAgICAgIGRlc2NyaWJlOiAnQSBjb2xsZWN0aW9uIG9mIHNjaGVtYXRpY3MgdG8gdXNlIGluIGdlbmVyYXRpbmcgdGhlIGluaXRpYWwgYXBwbGljYXRpb24uJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIH0pO1xuXG4gICAgY29uc3Qge1xuICAgICAgb3B0aW9uczogeyBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZUZyb21BcmdzIH0sXG4gICAgfSA9IHRoaXMuY29udGV4dC5hcmdzO1xuXG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPVxuICAgICAgdHlwZW9mIGNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgPT09ICdzdHJpbmcnXG4gICAgICAgID8gY29sbGVjdGlvbk5hbWVGcm9tQXJnc1xuICAgICAgICA6IGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbkZyb21Db25maWcoKTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb24sIHRoaXMuc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBvcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPE5ld0NvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIC8vIFJlZ2lzdGVyIHRoZSB2ZXJzaW9uIG9mIHRoZSBDTEkgaW4gdGhlIHJlZ2lzdHJ5LlxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gb3B0aW9ucy5jb2xsZWN0aW9uID8/IChhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25Gcm9tQ29uZmlnKCkpO1xuICAgIGNvbnN0IHsgZHJ5UnVuLCBmb3JjZSwgaW50ZXJhY3RpdmUsIGRlZmF1bHRzLCBjb2xsZWN0aW9uLCAuLi5zY2hlbWF0aWNPcHRpb25zIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKGNvbGxlY3Rpb25OYW1lLCB7XG4gICAgICBkcnlSdW4sXG4gICAgICBmb3JjZSxcbiAgICAgIGludGVyYWN0aXZlLFxuICAgICAgZGVmYXVsdHMsXG4gICAgfSk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ25nLWNsaS12ZXJzaW9uJywgKCkgPT4gVkVSU0lPTi5mdWxsKTtcblxuICAgIC8vIENvbXBhdGliaWxpdHkgY2hlY2sgZm9yIE5QTSA3XG4gICAgaWYgKFxuICAgICAgY29sbGVjdGlvbk5hbWUgPT09ICdAc2NoZW1hdGljcy9hbmd1bGFyJyAmJlxuICAgICAgIXNjaGVtYXRpY09wdGlvbnMuc2tpcEluc3RhbGwgJiZcbiAgICAgIChzY2hlbWF0aWNPcHRpb25zLnBhY2thZ2VNYW5hZ2VyID09PSB1bmRlZmluZWQgfHwgc2NoZW1hdGljT3B0aW9ucy5wYWNrYWdlTWFuYWdlciA9PT0gJ25wbScpXG4gICAgKSB7XG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuZW5zdXJlQ29tcGF0aWJpbGl0eSgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgIGRyeVJ1bixcbiAgICAgICAgZm9yY2UsXG4gICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvKiogRmluZCBhIGNvbGxlY3Rpb24gZnJvbSBjb25maWcgdGhhdCBoYXMgYW4gYG5nLW5ld2Agc2NoZW1hdGljLiAqL1xuICBwcml2YXRlIGFzeW5jIGdldENvbGxlY3Rpb25Gcm9tQ29uZmlnKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgZm9yIChjb25zdCBjb2xsZWN0aW9uTmFtZSBvZiBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCkpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljc0luQ29sbGVjdGlvbiA9IGNvbGxlY3Rpb24uZGVzY3JpcHRpb24uc2NoZW1hdGljcztcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNjaGVtYXRpY3NJbkNvbGxlY3Rpb24pLmluY2x1ZGVzKHRoaXMuc2NoZW1hdGljTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTjtcbiAgfVxufVxuIl19