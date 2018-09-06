"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any
const core_1 = require("@angular-devkit/core");
const tools_1 = require("@angular-devkit/schematics/tools");
const schematic_command_1 = require("../models/schematic-command");
const config_1 = require("../utilities/config");
class AddCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowPrivateSchematics = true;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.collection) {
                this.logger.fatal(`The "ng add" command requires a name argument to be specified eg. `
                    + `${core_1.terminal.yellow('ng add [name] ')}. For more details, use "ng help".`);
                return 1;
            }
            const packageManager = config_1.getPackageManager();
            const npmInstall = require('../tasks/npm-install').default;
            const packageName = options.collection.startsWith('@')
                ? options.collection.split('/', 2).join('/')
                : options.collection.split('/', 1)[0];
            // Remove the tag/version from the package name.
            const collectionName = (packageName.startsWith('@')
                ? packageName.split('@', 2).join('@')
                : packageName.split('@', 1).join('@')) + options.collection.slice(packageName.length);
            // We don't actually add the package to package.json, that would be the work of the package
            // itself.
            yield npmInstall(packageName, this.logger, packageManager, this.workspace.root);
            const runOptions = {
                schematicOptions: options['--'] || [],
                workingDir: this.workspace.root,
                collectionName,
                schematicName: 'ng-add',
                allowPrivate: true,
                dryRun: false,
                force: false,
            };
            try {
                return yield this.runSchematic(runOptions);
            }
            catch (e) {
                if (e instanceof tools_1.NodePackageDoesNotSupportSchematics) {
                    this.logger.error(core_1.tags.oneLine `
          The package that you are trying to add does not support schematics. You can try using
          a different version of the package or contact the package author to add ng-add support.
        `);
                    return 1;
                }
                throw e;
            }
        });
    }
}
exports.AddCommand = AddCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2FkZC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxpREFBaUQ7QUFDakQsK0NBQXNEO0FBQ3RELDREQUF1RjtBQUV2RixtRUFBcUY7QUFFckYsZ0RBQXdEO0FBTXhELGdCQUVFLFNBQVEsb0NBQW1CO0lBRjdCOztRQUdXLDJCQUFzQixHQUFHLElBQUksQ0FBQztJQTZEekMsQ0FBQztJQTNETyxHQUFHLENBQUMsT0FBc0M7O1lBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFO2dCQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDZixvRUFBb0U7c0JBQ2xFLEdBQUcsZUFBUSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxvQ0FBb0MsQ0FDM0UsQ0FBQztnQkFFRixPQUFPLENBQUMsQ0FBQzthQUNWO1lBRUQsTUFBTSxjQUFjLEdBQUcsMEJBQWlCLEVBQUUsQ0FBQztZQUUzQyxNQUFNLFVBQVUsR0FBZSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFFdkUsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO2dCQUNwRCxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQzVDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFeEMsZ0RBQWdEO1lBQ2hELE1BQU0sY0FBYyxHQUFHLENBQ3JCLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO2dCQUN6QixDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztnQkFDckMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FDeEMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFakQsMkZBQTJGO1lBQzNGLFVBQVU7WUFDVixNQUFNLFVBQVUsQ0FDZCxXQUFXLEVBQ1gsSUFBSSxDQUFDLE1BQU0sRUFDWCxjQUFjLEVBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ3BCLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBRztnQkFDakIsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ3JDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUk7Z0JBQy9CLGNBQWM7Z0JBQ2QsYUFBYSxFQUFFLFFBQVE7Z0JBQ3ZCLFlBQVksRUFBRSxJQUFJO2dCQUNsQixNQUFNLEVBQUUsS0FBSztnQkFDYixLQUFLLEVBQUUsS0FBSzthQUNiLENBQUM7WUFFRixJQUFJO2dCQUNGLE9BQU8sTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQzVDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLFlBQVksMkNBQW1DLEVBQUU7b0JBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7OztTQUc3QixDQUFDLENBQUM7b0JBRUgsT0FBTyxDQUFDLENBQUM7aUJBQ1Y7Z0JBRUQsTUFBTSxDQUFDLENBQUM7YUFDVDtRQUNILENBQUM7S0FBQTtDQUNGO0FBaEVELGdDQWdFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIG5vLWFueVxuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rvb2xzJztcbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgQmFzZVNjaGVtYXRpY09wdGlvbnMsIFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuaW1wb3J0IHsgTnBtSW5zdGFsbCB9IGZyb20gJy4uL3Rhc2tzL25wbS1pbnN0YWxsJztcbmltcG9ydCB7IGdldFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWRkQ29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBCYXNlU2NoZW1hdGljT3B0aW9ucyB7XG4gIGNvbGxlY3Rpb246IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEFkZENvbW1hbmQ8XG4gIFQgZXh0ZW5kcyBBZGRDb21tYW5kT3B0aW9ucyA9IEFkZENvbW1hbmRPcHRpb25zLFxuPiBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQ8VD4ge1xuICByZWFkb25seSBhbGxvd1ByaXZhdGVTY2hlbWF0aWNzID0gdHJ1ZTtcblxuICBhc3luYyBydW4ob3B0aW9uczogQWRkQ29tbWFuZE9wdGlvbnMgJiBBcmd1bWVudHMpIHtcbiAgICBpZiAoIW9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoXG4gICAgICAgIGBUaGUgXCJuZyBhZGRcIiBjb21tYW5kIHJlcXVpcmVzIGEgbmFtZSBhcmd1bWVudCB0byBiZSBzcGVjaWZpZWQgZWcuIGBcbiAgICAgICAgKyBgJHt0ZXJtaW5hbC55ZWxsb3coJ25nIGFkZCBbbmFtZV0gJyl9LiBGb3IgbW9yZSBkZXRhaWxzLCB1c2UgXCJuZyBoZWxwXCIuYCxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VNYW5hZ2VyID0gZ2V0UGFja2FnZU1hbmFnZXIoKTtcblxuICAgIGNvbnN0IG5wbUluc3RhbGw6IE5wbUluc3RhbGwgPSByZXF1aXJlKCcuLi90YXNrcy9ucG0taW5zdGFsbCcpLmRlZmF1bHQ7XG5cbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9IG9wdGlvbnMuY29sbGVjdGlvbi5zdGFydHNXaXRoKCdAJylcbiAgICAgID8gb3B0aW9ucy5jb2xsZWN0aW9uLnNwbGl0KCcvJywgMikuam9pbignLycpXG4gICAgICA6IG9wdGlvbnMuY29sbGVjdGlvbi5zcGxpdCgnLycsIDEpWzBdO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSB0YWcvdmVyc2lvbiBmcm9tIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWUgPSAoXG4gICAgICBwYWNrYWdlTmFtZS5zdGFydHNXaXRoKCdAJylcbiAgICAgICAgPyBwYWNrYWdlTmFtZS5zcGxpdCgnQCcsIDIpLmpvaW4oJ0AnKVxuICAgICAgICA6IHBhY2thZ2VOYW1lLnNwbGl0KCdAJywgMSkuam9pbignQCcpXG4gICAgKSArIG9wdGlvbnMuY29sbGVjdGlvbi5zbGljZShwYWNrYWdlTmFtZS5sZW5ndGgpO1xuXG4gICAgLy8gV2UgZG9uJ3QgYWN0dWFsbHkgYWRkIHRoZSBwYWNrYWdlIHRvIHBhY2thZ2UuanNvbiwgdGhhdCB3b3VsZCBiZSB0aGUgd29yayBvZiB0aGUgcGFja2FnZVxuICAgIC8vIGl0c2VsZi5cbiAgICBhd2FpdCBucG1JbnN0YWxsKFxuICAgICAgcGFja2FnZU5hbWUsXG4gICAgICB0aGlzLmxvZ2dlcixcbiAgICAgIHBhY2thZ2VNYW5hZ2VyLFxuICAgICAgdGhpcy53b3Jrc3BhY2Uucm9vdCxcbiAgICApO1xuXG4gICAgY29uc3QgcnVuT3B0aW9ucyA9IHtcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnNbJy0tJ10gfHwgW10sXG4gICAgICB3b3JraW5nRGlyOiB0aGlzLndvcmtzcGFjZS5yb290LFxuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiAnbmctYWRkJyxcbiAgICAgIGFsbG93UHJpdmF0ZTogdHJ1ZSxcbiAgICAgIGRyeVJ1bjogZmFsc2UsXG4gICAgICBmb3JjZTogZmFsc2UsXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5TY2hlbWF0aWMocnVuT3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBOb2RlUGFja2FnZURvZXNOb3RTdXBwb3J0U2NoZW1hdGljcykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgVGhlIHBhY2thZ2UgdGhhdCB5b3UgYXJlIHRyeWluZyB0byBhZGQgZG9lcyBub3Qgc3VwcG9ydCBzY2hlbWF0aWNzLiBZb3UgY2FuIHRyeSB1c2luZ1xuICAgICAgICAgIGEgZGlmZmVyZW50IHZlcnNpb24gb2YgdGhlIHBhY2thZ2Ugb3IgY29udGFjdCB0aGUgcGFja2FnZSBhdXRob3IgdG8gYWRkIG5nLWFkZCBzdXBwb3J0LlxuICAgICAgICBgKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==