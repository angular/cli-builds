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
class UpdateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.collectionName = '@schematics/update';
        this.schematicName = 'update';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL3VwZGF0ZS1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQWlEO0FBRWpELG1FQUErRDtBQUMvRCxrREFBOEM7QUFHOUMsTUFBYSxhQUFjLFNBQVEsb0NBQXFDO0lBQXhFOztRQUNrQiwwQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFFN0MsbUJBQWMsR0FBRyxvQkFBb0IsQ0FBQztRQUN0QyxrQkFBYSxHQUFHLFFBQVEsQ0FBQztJQTRDM0IsQ0FBQztJQTFDQyxLQUFLLENBQUMsY0FBYyxDQUFDLGdCQUEwQixFQUFFLE1BQWdCO1FBQy9ELE1BQU0sSUFBSSxHQUFHLE1BQU0sS0FBSyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRSxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QyxJQUFJLGtCQUFrQjtlQUNmLGtCQUFrQixDQUFDLE1BQU0sSUFBSSxDQUFDO2VBQzlCLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWM7ZUFDdkMsSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTO2VBQzlCLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzlCLHlDQUF5QztZQUN6QyxNQUFNLGtCQUFrQixHQUFHO2dCQUN6QixnQkFBUyxDQUFDLG1CQUFtQixDQUFDO2dCQUM5QixnQkFBUyxDQUFDLGtCQUFrQixDQUFDO2FBQzlCLENBQUM7WUFDRixNQUFNLGlCQUFpQixHQUFHLGdCQUFNLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO21CQUN6QyxnQkFBTSxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRWhFLElBQUksaUJBQWlCLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQzthQUNyQjtTQUNGO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ25CO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUF3QztRQUNoRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ25DLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUNqQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQy9CLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixLQUFLLEVBQUUsS0FBSztZQUNaLGVBQWUsRUFBRSxLQUFLO1NBQ3ZCLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhERCxzQ0FnREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgeyBmaW5kVXAgfSBmcm9tICcuLi91dGlsaXRpZXMvZmluZC11cCc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgVXBkYXRlQ29tbWFuZFNjaGVtYSB9IGZyb20gJy4vdXBkYXRlJztcblxuZXhwb3J0IGNsYXNzIFVwZGF0ZUNvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPFVwZGF0ZUNvbW1hbmRTY2hlbWE+IHtcbiAgcHVibGljIHJlYWRvbmx5IGFsbG93TWlzc2luZ1dvcmtzcGFjZSA9IHRydWU7XG5cbiAgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvdXBkYXRlJztcbiAgc2NoZW1hdGljTmFtZSA9ICd1cGRhdGUnO1xuXG4gIGFzeW5jIHBhcnNlQXJndW1lbnRzKHNjaGVtYXRpY09wdGlvbnM6IHN0cmluZ1tdLCBzY2hlbWE6IE9wdGlvbltdKTogUHJvbWlzZTxBcmd1bWVudHM+IHtcbiAgICBjb25zdCBhcmdzID0gYXdhaXQgc3VwZXIucGFyc2VBcmd1bWVudHMoc2NoZW1hdGljT3B0aW9ucywgc2NoZW1hKTtcbiAgICBjb25zdCBtYXliZUFyZ3NMZWZ0b3ZlcnMgPSBhcmdzWyctLSddO1xuXG4gICAgaWYgKG1heWJlQXJnc0xlZnRvdmVyc1xuICAgICAgICAmJiBtYXliZUFyZ3NMZWZ0b3ZlcnMubGVuZ3RoID09IDFcbiAgICAgICAgJiYgbWF5YmVBcmdzTGVmdG92ZXJzWzBdID09ICdAYW5ndWxhci9jbGknXG4gICAgICAgICYmIGFyZ3MubWlncmF0ZU9ubHkgPT09IHVuZGVmaW5lZFxuICAgICAgICAmJiBhcmdzLmZyb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gQ2hlY2sgZm9yIGEgMS43IGFuZ3VsYXItY2xpLmpzb24gZmlsZS5cbiAgICAgIGNvbnN0IG9sZENvbmZpZ0ZpbGVOYW1lcyA9IFtcbiAgICAgICAgbm9ybWFsaXplKCcuYW5ndWxhci1jbGkuanNvbicpLFxuICAgICAgICBub3JtYWxpemUoJ2FuZ3VsYXItY2xpLmpzb24nKSxcbiAgICAgIF07XG4gICAgICBjb25zdCBvbGRDb25maWdGaWxlUGF0aCA9IGZpbmRVcChvbGRDb25maWdGaWxlTmFtZXMsIHByb2Nlc3MuY3dkKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IGZpbmRVcChvbGRDb25maWdGaWxlTmFtZXMsIF9fZGlybmFtZSk7XG5cbiAgICAgIGlmIChvbGRDb25maWdGaWxlUGF0aCkge1xuICAgICAgICBhcmdzLm1pZ3JhdGVPbmx5ID0gdHJ1ZTtcbiAgICAgICAgYXJncy5mcm9tID0gJzEuMC4wJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNb3ZlIGAtLWAgdG8gcGFja2FnZXMuXG4gICAgaWYgKGFyZ3MucGFja2FnZXMgPT0gdW5kZWZpbmVkICYmIGFyZ3NbJy0tJ10pIHtcbiAgICAgIGFyZ3MucGFja2FnZXMgPSBhcmdzWyctLSddO1xuICAgICAgZGVsZXRlIGFyZ3NbJy0tJ107XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZ3M7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogVXBkYXRlQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZTogdGhpcy5jb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWU6IHRoaXMuc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnNbJy0tJ10sXG4gICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgICAgc2hvd05vdGhpbmdEb25lOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuIl19