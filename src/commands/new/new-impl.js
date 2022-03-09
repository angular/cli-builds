"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewCommand = void 0;
const schematic_command_1 = require("../../../models/schematic-command");
const version_1 = require("../../utilities/version");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.schematicName = 'ng-new';
    }
    async initialize(options) {
        this.collectionName = options.collection || (await this.getDefaultSchematicCollection());
        return super.initialize(options);
    }
    async run(options) {
        // Register the version of the CLI in the registry.
        const version = version_1.VERSION.full;
        this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);
        const { dryRun, force, interactive, defaults, collection, ...schematicOptions } = options;
        return this.runSchematic({
            collectionName: this.collectionName,
            schematicName: this.schematicName,
            schematicOptions,
            debug: false,
            dryRun,
            force,
        });
    }
}
exports.NewCommand = NewCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9zcmMvY29tbWFuZHMvbmV3L25ldy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILHlFQUFxRTtBQUVyRSxxREFBa0Q7QUFLbEQsTUFBYSxVQUFXLFNBQVEsb0NBQW1DO0lBQW5FOztRQUMyQiwwQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFDN0Msa0JBQWEsR0FBRyxRQUFRLENBQUM7SUF3QnBDLENBQUM7SUF0QlUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUEwQjtRQUNsRCxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxVQUFVLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLENBQUM7UUFFekYsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTSxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQXlDO1FBQ3hELG1EQUFtRDtRQUNuRCxNQUFNLE9BQU8sR0FBRyxpQkFBTyxDQUFDLElBQUksQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRixNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxHQUFHLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxDQUFDO1FBRTFGLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztZQUN2QixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbkMsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGdCQUFnQjtZQUNoQixLQUFLLEVBQUUsS0FBSztZQUNaLE1BQU07WUFDTixLQUFLO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUJELGdDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vLi4vLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IE9wdGlvbnMsIE90aGVyT3B0aW9ucyB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBWRVJTSU9OIH0gZnJvbSAnLi4vLi4vdXRpbGl0aWVzL3ZlcnNpb24nO1xuaW1wb3J0IHsgTmV3Q29tbWFuZEFyZ3MgfSBmcm9tICcuL2NsaSc7XG5cbnR5cGUgTmV3Q29tbWFuZE9wdGlvbnMgPSBPcHRpb25zPE5ld0NvbW1hbmRBcmdzPjtcblxuZXhwb3J0IGNsYXNzIE5ld0NvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPE5ld0NvbW1hbmRPcHRpb25zPiB7XG4gIHB1YmxpYyBvdmVycmlkZSByZWFkb25seSBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSB0cnVlO1xuICBvdmVycmlkZSBzY2hlbWF0aWNOYW1lID0gJ25nLW5ldyc7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBOZXdDb21tYW5kT3B0aW9ucykge1xuICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb24gfHwgKGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKSk7XG5cbiAgICByZXR1cm4gc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogTmV3Q29tbWFuZE9wdGlvbnMgJiBPdGhlck9wdGlvbnMpIHtcbiAgICAvLyBSZWdpc3RlciB0aGUgdmVyc2lvbiBvZiB0aGUgQ0xJIGluIHRoZSByZWdpc3RyeS5cbiAgICBjb25zdCB2ZXJzaW9uID0gVkVSU0lPTi5mdWxsO1xuICAgIHRoaXMuX3dvcmtmbG93LnJlZ2lzdHJ5LmFkZFNtYXJ0RGVmYXVsdFByb3ZpZGVyKCduZy1jbGktdmVyc2lvbicsICgpID0+IHZlcnNpb24pO1xuXG4gICAgY29uc3QgeyBkcnlSdW4sIGZvcmNlLCBpbnRlcmFjdGl2ZSwgZGVmYXVsdHMsIGNvbGxlY3Rpb24sIC4uLnNjaGVtYXRpY09wdGlvbnMgfSA9IG9wdGlvbnM7XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWU6IHRoaXMuY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgZGVidWc6IGZhbHNlLFxuICAgICAgZHJ5UnVuLFxuICAgICAgZm9yY2UsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==