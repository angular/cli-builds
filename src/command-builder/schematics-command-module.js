"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchematicsCommandModule = void 0;
const tools_1 = require("@angular-devkit/schematics/tools");
const schematic_engine_host_1 = require("../../models/schematic-engine-host");
const config_1 = require("../utilities/config");
const command_module_1 = require("./command-module");
const json_schema_1 = require("./utilities/json-schema");
const DEFAULT_SCHEMATICS_COLLECTION = '@schematics/angular';
class SchematicsCommandModule extends command_module_1.CommandModule {
    async builder(argv) {
        const localYargs = argv
            .option('interactive', {
            describe: 'Enable interactive input prompts.',
            type: 'boolean',
            default: true,
        })
            .option('dry-run', {
            describe: 'Run through and reports activity without writing out results.',
            type: 'boolean',
            default: false,
        })
            .option('defaults', {
            describe: 'Disable interactive input prompts for options with a default.',
            type: 'boolean',
            default: false,
        })
            .option('force', {
            describe: 'Force overwriting of existing files.',
            type: 'boolean',
            default: false,
        })
            .strict();
        if (this.schematicName) {
            const collectionName = await this.getCollectionName();
            const workflow = this.getOrCreateWorkflow(collectionName);
            const collection = workflow.engine.createCollection(collectionName);
            const options = await this.getSchematicOptions(collection, this.schematicName, workflow);
            return this.addSchemaOptionsToCommand(localYargs, options);
        }
        return localYargs;
    }
    /** Get schematic schema options.*/
    async getSchematicOptions(collection, schematicName, workflow) {
        const schematic = collection.createSchematic(schematicName, true);
        const { schemaJson } = schematic.description;
        if (!schemaJson) {
            return [];
        }
        return (0, json_schema_1.parseJsonSchemaToOptions)(workflow.registry, schemaJson);
    }
    async getCollectionName() {
        var _a, _b;
        const { options: { collection }, positional, } = this.context.args;
        return ((_b = (_a = (typeof collection === 'string' ? collection : undefined)) !== null && _a !== void 0 ? _a : 
        // positional = [generate, lint] or [new, collection-package]
        this.parseSchematicInfo(positional[1])[0]) !== null && _b !== void 0 ? _b : (await this.getDefaultSchematicCollection()));
    }
    getOrCreateWorkflow(collectionName) {
        if (this._workflow) {
            return this._workflow;
        }
        const { root, workspace } = this.context;
        return new tools_1.NodeWorkflow(root, {
            resolvePaths: workspace
                ? // Workspace
                    collectionName === DEFAULT_SCHEMATICS_COLLECTION
                        ? // Favor __dirname for @schematics/angular to use the build-in version
                            [__dirname, process.cwd(), root]
                        : [process.cwd(), root, __dirname]
                : // Global
                    [__dirname, process.cwd()],
            engineHostCreator: (options) => new schematic_engine_host_1.SchematicEngineHost(options.resolvePaths),
        });
    }
    async getDefaultSchematicCollection() {
        if (this._defaultSchematicCollection) {
            return this._defaultSchematicCollection;
        }
        let workspace = await (0, config_1.getWorkspace)('local');
        if (workspace) {
            const project = (0, config_1.getProjectByCwd)(workspace);
            if (project) {
                const value = workspace.getProjectCli(project)['defaultCollection'];
                if (typeof value == 'string') {
                    return (this._defaultSchematicCollection = value);
                }
            }
            const value = workspace.getCli()['defaultCollection'];
            if (typeof value === 'string') {
                return (this._defaultSchematicCollection = value);
            }
        }
        workspace = await (0, config_1.getWorkspace)('global');
        const value = workspace === null || workspace === void 0 ? void 0 : workspace.getCli()['defaultCollection'];
        if (typeof value === 'string') {
            return (this._defaultSchematicCollection = value);
        }
        return (this._defaultSchematicCollection = DEFAULT_SCHEMATICS_COLLECTION);
    }
    parseSchematicInfo(schematic) {
        if (schematic === null || schematic === void 0 ? void 0 : schematic.includes(':')) {
            const [collectionName, schematicName] = schematic.split(':', 2);
            return [collectionName, schematicName];
        }
        return [undefined, schematic];
    }
}
exports.SchematicsCommandModule = SchematicsCommandModule;
SchematicsCommandModule.scope = command_module_1.CommandScope.In;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCw0REFJMEM7QUFFMUMsOEVBQXlFO0FBQ3pFLGdEQUFvRTtBQUNwRSxxREFBNEY7QUFDNUYseURBQTJFO0FBRTNFLE1BQU0sNkJBQTZCLEdBQUcscUJBQXFCLENBQUM7QUFTNUQsTUFBc0IsdUJBQ3BCLFNBQVEsOEJBQW9DO0lBTTVDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUN0QixNQUFNLFVBQVUsR0FBZ0MsSUFBSTthQUNqRCxNQUFNLENBQUMsYUFBYSxFQUFFO1lBQ3JCLFFBQVEsRUFBRSxtQ0FBbUM7WUFDN0MsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUM7YUFDRCxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ2pCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsVUFBVSxFQUFFO1lBQ2xCLFFBQVEsRUFBRSwrREFBK0Q7WUFDekUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7YUFDRCxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ2YsUUFBUSxFQUFFLHNDQUFzQztZQUNoRCxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQzthQUNELE1BQU0sRUFBRSxDQUFDO1FBRVosSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3RCLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENB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Q2hDLENBQUM7O0FBeElILDBEQXlJQztBQXJJaUIsNkJBQUssR0FBRyw2QkFBWSxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBDb2xsZWN0aW9uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgRmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbixcbiAgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICBOb2RlV29ya2Zsb3csXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBTY2hlbWF0aWNFbmdpbmVIb3N0IH0gZnJvbSAnLi4vLi4vbW9kZWxzL3NjaGVtYXRpYy1lbmdpbmUtaG9zdCc7XG5pbXBvcnQgeyBnZXRQcm9qZWN0QnlDd2QsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSwgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLCBDb21tYW5kU2NvcGUgfSBmcm9tICcuL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IE9wdGlvbiwgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5jb25zdCBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTiA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcblxuZXhwb3J0IGludGVyZmFjZSBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBpbnRlcmFjdGl2ZTogYm9vbGVhbjtcbiAgZm9yY2U6IGJvb2xlYW47XG4gICdkcnktcnVuJzogYm9vbGVhbjtcbiAgZGVmYXVsdHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIENvbW1hbmRNb2R1bGU8U2NoZW1hdGljc0NvbW1hbmRBcmdzPlxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxTY2hlbWF0aWNzQ29tbWFuZEFyZ3M+XG57XG4gIHN0YXRpYyBvdmVycmlkZSBzY29wZSA9IENvbW1hbmRTY29wZS5JbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHNjaGVtYXRpY05hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8U2NoZW1hdGljc0NvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IGxvY2FsWWFyZ3M6IEFyZ3Y8U2NoZW1hdGljc0NvbW1hbmRBcmdzPiA9IGFyZ3ZcbiAgICAgIC5vcHRpb24oJ2ludGVyYWN0aXZlJywge1xuICAgICAgICBkZXNjcmliZTogJ0VuYWJsZSBpbnRlcmFjdGl2ZSBpbnB1dCBwcm9tcHRzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub3B0aW9uKCdkcnktcnVuJywge1xuICAgICAgICBkZXNjcmliZTogJ1J1biB0aHJvdWdoIGFuZCByZXBvcnRzIGFjdGl2aXR5IHdpdGhvdXQgd3JpdGluZyBvdXQgcmVzdWx0cy4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2RlZmF1bHRzJywge1xuICAgICAgICBkZXNjcmliZTogJ0Rpc2FibGUgaW50ZXJhY3RpdmUgaW5wdXQgcHJvbXB0cyBmb3Igb3B0aW9ucyB3aXRoIGEgZGVmYXVsdC4nLFxuICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgfSlcbiAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICBkZXNjcmliZTogJ0ZvcmNlIG92ZXJ3cml0aW5nIG9mIGV4aXN0aW5nIGZpbGVzLicsXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB9KVxuICAgICAgLnN0cmljdCgpO1xuXG4gICAgaWYgKHRoaXMuc2NoZW1hdGljTmFtZSkge1xuICAgICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCk7XG4gICAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvdyhjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljT3B0aW9ucyhjb2xsZWN0aW9uLCB0aGlzLnNjaGVtYXRpY05hbWUsIHdvcmtmbG93KTtcblxuICAgICAgcmV0dXJuIHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncztcbiAgfVxuXG4gIC8qKiBHZXQgc2NoZW1hdGljIHNjaGVtYSBvcHRpb25zLiovXG4gIHByb3RlY3RlZCBhc3luYyBnZXRTY2hlbWF0aWNPcHRpb25zKFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248RmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbiwgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uPixcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgd29ya2Zsb3c6IE5vZGVXb3JrZmxvdyxcbiAgKTogUHJvbWlzZTxPcHRpb25bXT4ge1xuICAgIGNvbnN0IHNjaGVtYXRpYyA9IGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIHRydWUpO1xuICAgIGNvbnN0IHsgc2NoZW1hSnNvbiB9ID0gc2NoZW1hdGljLmRlc2NyaXB0aW9uO1xuXG4gICAgaWYgKCFzY2hlbWFKc29uKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyh3b3JrZmxvdy5yZWdpc3RyeSwgc2NoZW1hSnNvbik7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0Q29sbGVjdGlvbk5hbWUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB7XG4gICAgICBvcHRpb25zOiB7IGNvbGxlY3Rpb24gfSxcbiAgICAgIHBvc2l0aW9uYWwsXG4gICAgfSA9IHRoaXMuY29udGV4dC5hcmdzO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICh0eXBlb2YgY29sbGVjdGlvbiA9PT0gJ3N0cmluZycgPyBjb2xsZWN0aW9uIDogdW5kZWZpbmVkKSA/P1xuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgbGludF0gb3IgW25ldywgY29sbGVjdGlvbi1wYWNrYWdlXVxuICAgICAgdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ocG9zaXRpb25hbFsxXSlbMF0gPz9cbiAgICAgIChhd2FpdCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCkpXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgX3dvcmtmbG93OiBOb2RlV29ya2Zsb3cgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBnZXRPckNyZWF0ZVdvcmtmbG93KGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpOiBOb2RlV29ya2Zsb3cge1xuICAgIGlmICh0aGlzLl93b3JrZmxvdykge1xuICAgICAgcmV0dXJuIHRoaXMuX3dvcmtmbG93O1xuICAgIH1cblxuICAgIGNvbnN0IHsgcm9vdCwgd29ya3NwYWNlIH0gPSB0aGlzLmNvbnRleHQ7XG5cbiAgICByZXR1cm4gbmV3IE5vZGVXb3JrZmxvdyhyb290LCB7XG4gICAgICByZXNvbHZlUGF0aHM6IHdvcmtzcGFjZVxuICAgICAgICA/IC8vIFdvcmtzcGFjZVxuICAgICAgICAgIGNvbGxlY3Rpb25OYW1lID09PSBERUZBVUxUX1NDSEVNQVRJQ1NfQ09MTEVDVElPTlxuICAgICAgICAgID8gLy8gRmF2b3IgX19kaXJuYW1lIGZvciBAc2NoZW1hdGljcy9hbmd1bGFyIHRvIHVzZSB0aGUgYnVpbGQtaW4gdmVyc2lvblxuICAgICAgICAgICAgW19fZGlybmFtZSwgcHJvY2Vzcy5jd2QoKSwgcm9vdF1cbiAgICAgICAgICA6IFtwcm9jZXNzLmN3ZCgpLCByb290LCBfX2Rpcm5hbWVdXG4gICAgICAgIDogLy8gR2xvYmFsXG4gICAgICAgICAgW19fZGlybmFtZSwgcHJvY2Vzcy5jd2QoKV0sXG4gICAgICBlbmdpbmVIb3N0Q3JlYXRvcjogKG9wdGlvbnMpID0+IG5ldyBTY2hlbWF0aWNFbmdpbmVIb3N0KG9wdGlvbnMucmVzb2x2ZVBhdGhzKSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2RlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHByb3RlY3RlZCBhc3luYyBnZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmICh0aGlzLl9kZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuX2RlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIGxldCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoJ2xvY2FsJyk7XG5cbiAgICBpZiAod29ya3NwYWNlKSB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gZ2V0UHJvamVjdEJ5Q3dkKHdvcmtzcGFjZSk7XG4gICAgICBpZiAocHJvamVjdCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRQcm9qZWN0Q2xpKHByb2plY3QpWydkZWZhdWx0Q29sbGVjdGlvbiddO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcmV0dXJuICh0aGlzLl9kZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbiA9IHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZS5nZXRDbGkoKVsnZGVmYXVsdENvbGxlY3Rpb24nXTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fZGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24gPSB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKCdnbG9iYWwnKTtcbiAgICBjb25zdCB2YWx1ZSA9IHdvcmtzcGFjZT8uZ2V0Q2xpKClbJ2RlZmF1bHRDb2xsZWN0aW9uJ107XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAodGhpcy5fZGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24gPSB2YWx1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuICh0aGlzLl9kZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbiA9IERFRkFVTFRfU0NIRU1BVElDU19DT0xMRUNUSU9OKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgc2NoZW1hdGljOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICk6IFtjb2xsZWN0aW9uTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWRdIHtcbiAgICBpZiAoc2NoZW1hdGljPy5pbmNsdWRlcygnOicpKSB7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLnNwbGl0KCc6JywgMik7XG5cbiAgICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICAgIH1cblxuICAgIHJldHVybiBbdW5kZWZpbmVkLCBzY2hlbWF0aWNdO1xuICB9XG59XG4iXX0=