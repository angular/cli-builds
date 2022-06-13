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
        this.scope = command_module_1.CommandScope.Out;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL25ldy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gseUVBSzhDO0FBQzlDLCtGQUl5RDtBQUN6RCxxREFBa0Q7QUFNbEQsTUFBYSxnQkFDWCxTQUFRLG1EQUF1QjtJQURqQzs7UUFJbUIsa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFDakMsVUFBSyxHQUFHLDZCQUFZLENBQUMsR0FBRyxDQUFDO1FBQ2YsMkJBQXNCLEdBQUcsSUFBSSxDQUFDO1FBRWpELFlBQU8sR0FBRyxZQUFZLENBQUM7UUFDdkIsWUFBTyxHQUFHLEdBQUcsQ0FBQztRQUNkLGFBQVEsR0FBRyxrQ0FBa0MsQ0FBQztJQTBFaEQsQ0FBQztJQXZFVSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDL0IsTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ2xFLEtBQUssRUFBRSxHQUFHO1lBQ1YsUUFBUSxFQUFFLDBFQUEwRTtZQUNwRixJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUMsQ0FBQztRQUVILE1BQU0sRUFDSixPQUFPLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxHQUNwQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBRXRCLE1BQU0sY0FBYyxHQUNsQixPQUFPLHNCQUFzQixLQUFLLFFBQVE7WUFDeEMsQ0FBQyxDQUFDLHNCQUFzQjtZQUN4QixDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUUzQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxRSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXpGLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUErQzs7UUFDdkQsbURBQW1EO1FBQ25ELE1BQU0sY0FBYyxHQUFHLE1BQUEsT0FBTyxDQUFDLFVBQVUsbUNBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDcEYsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUMxRixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxjQUFjLEVBQUU7WUFDMUUsTUFBTTtZQUNOLEtBQUs7WUFDTCxXQUFXO1lBQ1gsUUFBUTtTQUNULENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRixnQ0FBZ0M7UUFDaEMsSUFDRSxjQUFjLEtBQUsscUJBQXFCO1lBQ3hDLENBQUMsZ0JBQWdCLENBQUMsV0FBVztZQUM3QixDQUFDLGdCQUFnQixDQUFDLGNBQWMsS0FBSyxTQUFTLElBQUksZ0JBQWdCLENBQUMsY0FBYyxLQUFLLEtBQUssQ0FBQyxFQUM1RjtZQUNBLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLENBQUM7U0FDbkQ7UUFFRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsY0FBYztZQUNkLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyxnQkFBZ0I7WUFDaEIsZ0JBQWdCLEVBQUU7Z0JBQ2hCLE1BQU07Z0JBQ04sS0FBSztnQkFDTCxXQUFXO2dCQUNYLFFBQVE7YUFDVDtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxvRUFBb0U7SUFDNUQsS0FBSyxDQUFDLHVCQUF1QjtRQUNuQyxLQUFLLE1BQU0sY0FBYyxJQUFJLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLEVBQUU7WUFDakUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDcEUsTUFBTSxzQkFBc0IsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQztZQUVqRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFO2dCQUNwRSxPQUFPLGNBQWMsQ0FBQzthQUN2QjtTQUNGO1FBRUQsT0FBTyx5REFBNkIsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFwRkQsNENBb0ZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIENvbW1hbmRTY29wZSxcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgREVGQVVMVF9TQ0hFTUFUSUNTX0NPTExFQ1RJT04sXG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IFZFUlNJT04gfSBmcm9tICcuLi8uLi91dGlsaXRpZXMvdmVyc2lvbic7XG5cbmludGVyZmFjZSBOZXdDb21tYW5kQXJncyBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIGNvbGxlY3Rpb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBOZXdDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248TmV3Q29tbWFuZEFyZ3M+XG57XG4gIHByaXZhdGUgcmVhZG9ubHkgc2NoZW1hdGljTmFtZSA9ICduZy1uZXcnO1xuICBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5PdXQ7XG4gIHByb3RlY3RlZCBvdmVycmlkZSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzID0gdHJ1ZTtcblxuICBjb21tYW5kID0gJ25ldyBbbmFtZV0nO1xuICBhbGlhc2VzID0gJ24nO1xuICBkZXNjcmliZSA9ICdDcmVhdGVzIGEgbmV3IEFuZ3VsYXIgd29ya3NwYWNlLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PE5ld0NvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IGxvY2FsWWFyZ3MgPSAoYXdhaXQgc3VwZXIuYnVpbGRlcihhcmd2KSkub3B0aW9uKCdjb2xsZWN0aW9uJywge1xuICAgICAgYWxpYXM6ICdjJyxcbiAgICAgIGRlc2NyaWJlOiAnQSBjb2xsZWN0aW9uIG9mIHNjaGVtYXRpY3MgdG8gdXNlIGluIGdlbmVyYXRpbmcgdGhlIGluaXRpYWwgYXBwbGljYXRpb24uJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIH0pO1xuXG4gICAgY29uc3Qge1xuICAgICAgb3B0aW9uczogeyBjb2xsZWN0aW9uTmFtZUZyb21BcmdzIH0sXG4gICAgfSA9IHRoaXMuY29udGV4dC5hcmdzO1xuXG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPVxuICAgICAgdHlwZW9mIGNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgPT09ICdzdHJpbmcnXG4gICAgICAgID8gY29sbGVjdGlvbk5hbWVGcm9tQXJnc1xuICAgICAgICA6IGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbkZyb21Db25maWcoKTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb24sIHRoaXMuc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBvcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPE5ld0NvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIC8vIFJlZ2lzdGVyIHRoZSB2ZXJzaW9uIG9mIHRoZSBDTEkgaW4gdGhlIHJlZ2lzdHJ5LlxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gb3B0aW9ucy5jb2xsZWN0aW9uID8/IChhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25Gcm9tQ29uZmlnKCkpO1xuICAgIGNvbnN0IHsgZHJ5UnVuLCBmb3JjZSwgaW50ZXJhY3RpdmUsIGRlZmF1bHRzLCBjb2xsZWN0aW9uLCAuLi5zY2hlbWF0aWNPcHRpb25zIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gYXdhaXQgdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yRXhlY3V0aW9uKGNvbGxlY3Rpb25OYW1lLCB7XG4gICAgICBkcnlSdW4sXG4gICAgICBmb3JjZSxcbiAgICAgIGludGVyYWN0aXZlLFxuICAgICAgZGVmYXVsdHMsXG4gICAgfSk7XG4gICAgd29ya2Zsb3cucmVnaXN0cnkuYWRkU21hcnREZWZhdWx0UHJvdmlkZXIoJ25nLWNsaS12ZXJzaW9uJywgKCkgPT4gVkVSU0lPTi5mdWxsKTtcblxuICAgIC8vIENvbXBhdGliaWxpdHkgY2hlY2sgZm9yIE5QTSA3XG4gICAgaWYgKFxuICAgICAgY29sbGVjdGlvbk5hbWUgPT09ICdAc2NoZW1hdGljcy9hbmd1bGFyJyAmJlxuICAgICAgIXNjaGVtYXRpY09wdGlvbnMuc2tpcEluc3RhbGwgJiZcbiAgICAgIChzY2hlbWF0aWNPcHRpb25zLnBhY2thZ2VNYW5hZ2VyID09PSB1bmRlZmluZWQgfHwgc2NoZW1hdGljT3B0aW9ucy5wYWNrYWdlTWFuYWdlciA9PT0gJ25wbScpXG4gICAgKSB7XG4gICAgICB0aGlzLmNvbnRleHQucGFja2FnZU1hbmFnZXIuZW5zdXJlQ29tcGF0aWJpbGl0eSgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgIGRyeVJ1bixcbiAgICAgICAgZm9yY2UsXG4gICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICAvKiogRmluZCBhIGNvbGxlY3Rpb24gZnJvbSBjb25maWcgdGhhdCBoYXMgYW4gYG5nLW5ld2Agc2NoZW1hdGljLiAqL1xuICBwcml2YXRlIGFzeW5jIGdldENvbGxlY3Rpb25Gcm9tQ29uZmlnKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgZm9yIChjb25zdCBjb2xsZWN0aW9uTmFtZSBvZiBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCkpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljc0luQ29sbGVjdGlvbiA9IGNvbGxlY3Rpb24uZGVzY3JpcHRpb24uc2NoZW1hdGljcztcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNjaGVtYXRpY3NJbkNvbGxlY3Rpb24pLmluY2x1ZGVzKHRoaXMuc2NoZW1hdGljTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTjtcbiAgfVxufVxuIl19