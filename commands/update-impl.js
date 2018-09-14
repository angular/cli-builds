"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const schematic_command_1 = require("../models/schematic-command");
const find_up_1 = require("../utilities/find-up");
const json_schema_1 = require("../utilities/json-schema");
class UpdateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.collectionName = '@schematics/update';
        this.schematicName = 'update';
    }
    async initialize(input) {
        await super.initialize(input);
        // Set the options.
        const collection = this.getCollection(this.collectionName);
        const schematic = this.getSchematic(collection, this.schematicName, true);
        const options = await json_schema_1.parseJsonSchemaToOptions(this._workflow.registry, schematic.description.schemaJson || {});
        this.description.options.push(...options);
    }
    async parseArguments(schematicOptions, schema) {
        const args = await super.parseArguments(schematicOptions, schema);
        const maybeArgsLeftovers = args['--'];
        if (maybeArgsLeftovers
            && maybeArgsLeftovers.length == 1
            && maybeArgsLeftovers[0] == '@angular/cli'
            && args.migrateOnly === undefined
            && args.from === undefined) {
            // Check for a 1.7 angular-cli.json file.
            const oldConfigFileNames = [
                core_1.normalize('.angular-cli.json'),
                core_1.normalize('angular-cli.json'),
            ];
            const oldConfigFilePath = find_up_1.findUp(oldConfigFileNames, process.cwd())
                || find_up_1.findUp(oldConfigFileNames, __dirname);
            if (oldConfigFilePath) {
                args.migrateOnly = true;
                args.from = '1.0.0';
            }
        }
        // Move `--` to packages.
        if (args.packages == undefined && args['--']) {
            args.packages = args['--'];
            delete args['--'];
        }
        return args;
    }
    async run(options) {
        return this.runSchematic({
            collectionName: this.collectionName,
            schematicName: this.schematicName,
            schematicOptions: options['--'],
            dryRun: options.dryRun,
            force: false,
            showNothingDone: false,
        });
    }
}
exports.UpdateCommand = UpdateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3VwZGF0ZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQWlEO0FBRWpELG1FQUErRDtBQUMvRCxrREFBOEM7QUFDOUMsMERBQW9FO0FBR3BFLE1BQWEsYUFBYyxTQUFRLG9DQUFxQztJQUF4RTs7UUFDa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBRXJDLG1CQUFjLEdBQUcsb0JBQW9CLENBQUM7UUFDdEMsa0JBQWEsR0FBRyxRQUFRLENBQUM7SUEwRG5DLENBQUM7SUF4REMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFzQztRQUNyRCxNQUFNLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFOUIsbUJBQW1CO1FBQ25CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUUsTUFBTSxPQUFPLEdBQUcsTUFBTSxzQ0FBd0IsQ0FDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQ3ZCLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FDdkMsQ0FBQztRQUVGLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLGdCQUEwQixFQUFFLE1BQWdCO1FBQy9ELE1BQU0sSUFBSSxHQUFHLE1BQU0sS0FBSyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRSxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QyxJQUFJLGtCQUFrQjtlQUNmLGtCQUFrQixDQUFDLE1BQU0sSUFBSSxDQUFDO2VBQzlCLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWM7ZUFDdkMsSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTO2VBQzlCLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzlCLHlDQUF5QztZQUN6QyxNQUFNLGtCQUFrQixHQUFHO2dCQUN6QixnQkFBUyxDQUFDLG1CQUFtQixDQUFDO2dCQUM5QixnQkFBUyxDQUFDLGtCQUFrQixDQUFDO2FBQzlCLENBQUM7WUFDRixNQUFNLGlCQUFpQixHQUFHLGdCQUFNLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO21CQUN6QyxnQkFBTSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRWhFLElBQUksaUJBQWlCLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQzthQUNyQjtTQUNGO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25CO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUF3QztRQUNoRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQy9CLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixLQUFLLEVBQUUsS0FBSztZQUNaLGVBQWUsRUFBRSxLQUFLO1NBQ3ZCLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlERCxzQ0E4REMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFVwZGF0ZUNvbW1hbmRTY2hlbWEgfSBmcm9tICcuL3VwZGF0ZSc7XG5cbmV4cG9ydCBjbGFzcyBVcGRhdGVDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZDxVcGRhdGVDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyByZWFkb25seSBhbGxvd01pc3NpbmdXb3Jrc3BhY2UgPSB0cnVlO1xuXG4gIHByaXZhdGUgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvdXBkYXRlJztcbiAgcHJpdmF0ZSBzY2hlbWF0aWNOYW1lID0gJ3VwZGF0ZSc7XG5cbiAgYXN5bmMgaW5pdGlhbGl6ZShpbnB1dDogVXBkYXRlQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUoaW5wdXQpO1xuXG4gICAgLy8gU2V0IHRoZSBvcHRpb25zLlxuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLmdldENvbGxlY3Rpb24odGhpcy5jb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3Qgc2NoZW1hdGljID0gdGhpcy5nZXRTY2hlbWF0aWMoY29sbGVjdGlvbiwgdGhpcy5zY2hlbWF0aWNOYW1lLCB0cnVlKTtcbiAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKFxuICAgICAgdGhpcy5fd29ya2Zsb3cucmVnaXN0cnksXG4gICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbiB8fCB7fSxcbiAgICApO1xuXG4gICAgdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLnB1c2goLi4ub3B0aW9ucyk7XG4gIH1cblxuICBhc3luYyBwYXJzZUFyZ3VtZW50cyhzY2hlbWF0aWNPcHRpb25zOiBzdHJpbmdbXSwgc2NoZW1hOiBPcHRpb25bXSk6IFByb21pc2U8QXJndW1lbnRzPiB7XG4gICAgY29uc3QgYXJncyA9IGF3YWl0IHN1cGVyLnBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnMsIHNjaGVtYSk7XG4gICAgY29uc3QgbWF5YmVBcmdzTGVmdG92ZXJzID0gYXJnc1snLS0nXTtcblxuICAgIGlmIChtYXliZUFyZ3NMZWZ0b3ZlcnNcbiAgICAgICAgJiYgbWF5YmVBcmdzTGVmdG92ZXJzLmxlbmd0aCA9PSAxXG4gICAgICAgICYmIG1heWJlQXJnc0xlZnRvdmVyc1swXSA9PSAnQGFuZ3VsYXIvY2xpJ1xuICAgICAgICAmJiBhcmdzLm1pZ3JhdGVPbmx5ID09PSB1bmRlZmluZWRcbiAgICAgICAgJiYgYXJncy5mcm9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIENoZWNrIGZvciBhIDEuNyBhbmd1bGFyLWNsaS5qc29uIGZpbGUuXG4gICAgICBjb25zdCBvbGRDb25maWdGaWxlTmFtZXMgPSBbXG4gICAgICAgIG5vcm1hbGl6ZSgnLmFuZ3VsYXItY2xpLmpzb24nKSxcbiAgICAgICAgbm9ybWFsaXplKCdhbmd1bGFyLWNsaS5qc29uJyksXG4gICAgICBdO1xuICAgICAgY29uc3Qgb2xkQ29uZmlnRmlsZVBhdGggPSBmaW5kVXAob2xkQ29uZmlnRmlsZU5hbWVzLCBwcm9jZXNzLmN3ZCgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCBmaW5kVXAob2xkQ29uZmlnRmlsZU5hbWVzLCBfX2Rpcm5hbWUpO1xuXG4gICAgICBpZiAob2xkQ29uZmlnRmlsZVBhdGgpIHtcbiAgICAgICAgYXJncy5taWdyYXRlT25seSA9IHRydWU7XG4gICAgICAgIGFyZ3MuZnJvbSA9ICcxLjAuMCc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTW92ZSBgLS1gIHRvIHBhY2thZ2VzLlxuICAgIGlmIChhcmdzLnBhY2thZ2VzID09IHVuZGVmaW5lZCAmJiBhcmdzWyctLSddKSB7XG4gICAgICBhcmdzLnBhY2thZ2VzID0gYXJnc1snLS0nXTtcbiAgICAgIGRlbGV0ZSBhcmdzWyctLSddO1xuICAgIH1cblxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IFVwZGF0ZUNvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMpIHtcbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWU6IHRoaXMuY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zWyctLSddLFxuICAgICAgZHJ5UnVuOiBvcHRpb25zLmRyeVJ1bixcbiAgICAgIGZvcmNlOiBmYWxzZSxcbiAgICAgIHNob3dOb3RoaW5nRG9uZTogZmFsc2UsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==