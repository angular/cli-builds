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
const schematic_command_1 = require("../models/schematic-command");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.schematicName = 'ng-new';
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.dryRun) {
                options.skipGit = true;
            }
            let collectionName;
            if (options.collection) {
                collectionName = options.collection;
            }
            else {
                collectionName = this.parseCollectionName(options);
            }
            // Register the version of the CLI in the registry.
            const packageJson = require('../package.json');
            const version = packageJson.version;
            this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);
            return this.runSchematic({
                collectionName: collectionName,
                schematicName: this.schematicName,
                schematicOptions: options['--'] || [],
                debug: options.debug,
                dryRun: options.dryRun,
                force: options.force,
            });
        });
    }
    parseCollectionName(options) {
        return options.collection || this.getDefaultSchematicCollection();
    }
}
exports.NewCommand = NewCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3LWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL25ldy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxpREFBaUQ7QUFDakQsbUVBQXFGO0FBUXJGLE1BQWEsVUFBVyxTQUFRLG9DQUFnQjtJQUFoRDs7UUFDa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ3JDLGtCQUFhLEdBQUcsUUFBUSxDQUFDO0lBaUNuQyxDQUFDO0lBL0JjLEdBQUcsQ0FBQyxPQUEwQjs7WUFDekMsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUNsQixPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQzthQUN4QjtZQUVELElBQUksY0FBc0IsQ0FBQztZQUMzQixJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7Z0JBQ3RCLGNBQWMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQ3JDO2lCQUFNO2dCQUNMLGNBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDcEQ7WUFFRCxtREFBbUQ7WUFDbkQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDL0MsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztZQUVwQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVqRixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3ZCLGNBQWMsRUFBRSxjQUFjO2dCQUM5QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7Z0JBQ2pDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNyQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2FBQ3JCLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVPLG1CQUFtQixDQUFDLE9BQVk7UUFDdEMsT0FBTyxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO0lBQ3BFLENBQUM7Q0FDRjtBQW5DRCxnQ0FtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IEJhc2VTY2hlbWF0aWNPcHRpb25zLCBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcblxuZXhwb3J0IGludGVyZmFjZSBOZXdDb21tYW5kT3B0aW9ucyBleHRlbmRzIEJhc2VTY2hlbWF0aWNPcHRpb25zIHtcbiAgc2tpcEdpdD86IGJvb2xlYW47XG4gIGNvbGxlY3Rpb24/OiBzdHJpbmc7XG59XG5cblxuZXhwb3J0IGNsYXNzIE5ld0NvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kIHtcbiAgcHVibGljIHJlYWRvbmx5IGFsbG93TWlzc2luZ1dvcmtzcGFjZSA9IHRydWU7XG4gIHByaXZhdGUgc2NoZW1hdGljTmFtZSA9ICduZy1uZXcnO1xuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogTmV3Q29tbWFuZE9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5kcnlSdW4pIHtcbiAgICAgIG9wdGlvbnMuc2tpcEdpdCA9IHRydWU7XG4gICAgfVxuXG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gICAgaWYgKG9wdGlvbnMuY29sbGVjdGlvbikge1xuICAgICAgY29sbGVjdGlvbk5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lID0gdGhpcy5wYXJzZUNvbGxlY3Rpb25OYW1lKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIHRoZSB2ZXJzaW9uIG9mIHRoZSBDTEkgaW4gdGhlIHJlZ2lzdHJ5LlxuICAgIGNvbnN0IHBhY2thZ2VKc29uID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgdmVyc2lvbiA9IHBhY2thZ2VKc29uLnZlcnNpb247XG5cbiAgICB0aGlzLl93b3JrZmxvdy5yZWdpc3RyeS5hZGRTbWFydERlZmF1bHRQcm92aWRlcignbmctY2xpLXZlcnNpb24nLCAoKSA9PiB2ZXJzaW9uKTtcblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZTogY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lOiB0aGlzLnNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zWyctLSddIHx8IFtdLFxuICAgICAgZGVidWc6IG9wdGlvbnMuZGVidWcsXG4gICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ29sbGVjdGlvbk5hbWUob3B0aW9uczogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gb3B0aW9ucy5jb2xsZWN0aW9uIHx8IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTtcbiAgfVxufVxuIl19