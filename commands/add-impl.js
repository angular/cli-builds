"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
    async run(options) {
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
        await npmInstall(packageName, this.logger, packageManager, this.workspace.root);
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
            return await this.runSchematic(runOptions);
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
    }
}
exports.AddCommand = AddCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2FkZC1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsaURBQWlEO0FBQ2pELCtDQUFzRDtBQUN0RCw0REFBdUY7QUFFdkYsbUVBQXFGO0FBRXJGLGdEQUF3RDtBQU14RCxNQUFhLFVBRVgsU0FBUSxvQ0FBbUI7SUFGN0I7O1FBR1csMkJBQXNCLEdBQUcsSUFBSSxDQUFDO0lBNkR6QyxDQUFDO0lBM0RDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBc0M7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7WUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2Ysb0VBQW9FO2tCQUNsRSxHQUFHLGVBQVEsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsb0NBQW9DLENBQzNFLENBQUM7WUFFRixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsTUFBTSxjQUFjLEdBQUcsMEJBQWlCLEVBQUUsQ0FBQztRQUUzQyxNQUFNLFVBQVUsR0FBZSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFFdkUsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUM1QyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXhDLGdEQUFnRDtRQUNoRCxNQUFNLGNBQWMsR0FBRyxDQUNyQixXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUN6QixDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNyQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUN4QyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVqRCwyRkFBMkY7UUFDM0YsVUFBVTtRQUNWLE1BQU0sVUFBVSxDQUNkLFdBQVcsRUFDWCxJQUFJLENBQUMsTUFBTSxFQUNYLGNBQWMsRUFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDcEIsQ0FBQztRQUVGLE1BQU0sVUFBVSxHQUFHO1lBQ2pCLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ3JDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUk7WUFDL0IsY0FBYztZQUNkLGFBQWEsRUFBRSxRQUFRO1lBQ3ZCLFlBQVksRUFBRSxJQUFJO1lBQ2xCLE1BQU0sRUFBRSxLQUFLO1lBQ2IsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDO1FBRUYsSUFBSTtZQUNGLE9BQU8sTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzVDO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixJQUFJLENBQUMsWUFBWSwyQ0FBbUMsRUFBRTtnQkFDcEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTs7O1NBRzdCLENBQUMsQ0FBQztnQkFFSCxPQUFPLENBQUMsQ0FBQzthQUNWO1lBRUQsTUFBTSxDQUFDLENBQUM7U0FDVDtJQUNILENBQUM7Q0FDRjtBQWhFRCxnQ0FnRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IHRhZ3MsIHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90b29scyc7XG5pbXBvcnQgeyBBcmd1bWVudHMgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7IEJhc2VTY2hlbWF0aWNPcHRpb25zLCBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IE5wbUluc3RhbGwgfSBmcm9tICcuLi90YXNrcy9ucG0taW5zdGFsbCc7XG5pbXBvcnQgeyBnZXRQYWNrYWdlTWFuYWdlciB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFkZENvbW1hbmRPcHRpb25zIGV4dGVuZHMgQmFzZVNjaGVtYXRpY09wdGlvbnMge1xuICBjb2xsZWN0aW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBBZGRDb21tYW5kPFxuICBUIGV4dGVuZHMgQWRkQ29tbWFuZE9wdGlvbnMgPSBBZGRDb21tYW5kT3B0aW9ucyxcbj4gZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPFQ+IHtcbiAgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFkZENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgaWYgKCFvcHRpb25zLmNvbGxlY3Rpb24pIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKFxuICAgICAgICBgVGhlIFwibmcgYWRkXCIgY29tbWFuZCByZXF1aXJlcyBhIG5hbWUgYXJndW1lbnQgdG8gYmUgc3BlY2lmaWVkIGVnLiBgXG4gICAgICAgICsgYCR7dGVybWluYWwueWVsbG93KCduZyBhZGQgW25hbWVdICcpfS4gRm9yIG1vcmUgZGV0YWlscywgdXNlIFwibmcgaGVscFwiLmAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlciA9IGdldFBhY2thZ2VNYW5hZ2VyKCk7XG5cbiAgICBjb25zdCBucG1JbnN0YWxsOiBOcG1JbnN0YWxsID0gcmVxdWlyZSgnLi4vdGFza3MvbnBtLWluc3RhbGwnKS5kZWZhdWx0O1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSBvcHRpb25zLmNvbGxlY3Rpb24uc3RhcnRzV2l0aCgnQCcpXG4gICAgICA/IG9wdGlvbnMuY29sbGVjdGlvbi5zcGxpdCgnLycsIDIpLmpvaW4oJy8nKVxuICAgICAgOiBvcHRpb25zLmNvbGxlY3Rpb24uc3BsaXQoJy8nLCAxKVswXTtcblxuICAgIC8vIFJlbW92ZSB0aGUgdGFnL3ZlcnNpb24gZnJvbSB0aGUgcGFja2FnZSBuYW1lLlxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gKFxuICAgICAgcGFja2FnZU5hbWUuc3RhcnRzV2l0aCgnQCcpXG4gICAgICAgID8gcGFja2FnZU5hbWUuc3BsaXQoJ0AnLCAyKS5qb2luKCdAJylcbiAgICAgICAgOiBwYWNrYWdlTmFtZS5zcGxpdCgnQCcsIDEpLmpvaW4oJ0AnKVxuICAgICkgKyBvcHRpb25zLmNvbGxlY3Rpb24uc2xpY2UocGFja2FnZU5hbWUubGVuZ3RoKTtcblxuICAgIC8vIFdlIGRvbid0IGFjdHVhbGx5IGFkZCB0aGUgcGFja2FnZSB0byBwYWNrYWdlLmpzb24sIHRoYXQgd291bGQgYmUgdGhlIHdvcmsgb2YgdGhlIHBhY2thZ2VcbiAgICAvLyBpdHNlbGYuXG4gICAgYXdhaXQgbnBtSW5zdGFsbChcbiAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgdGhpcy5sb2dnZXIsXG4gICAgICBwYWNrYWdlTWFuYWdlcixcbiAgICAgIHRoaXMud29ya3NwYWNlLnJvb3QsXG4gICAgKTtcblxuICAgIGNvbnN0IHJ1bk9wdGlvbnMgPSB7XG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zWyctLSddIHx8IFtdLFxuICAgICAgd29ya2luZ0RpcjogdGhpcy53b3Jrc3BhY2Uucm9vdCxcbiAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogJ25nLWFkZCcsXG4gICAgICBhbGxvd1ByaXZhdGU6IHRydWUsXG4gICAgICBkcnlSdW46IGZhbHNlLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2NoZW1hdGljKHJ1bk9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIFRoZSBwYWNrYWdlIHRoYXQgeW91IGFyZSB0cnlpbmcgdG8gYWRkIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hdGljcy4gWW91IGNhbiB0cnkgdXNpbmdcbiAgICAgICAgICBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIG9yIGNvbnRhY3QgdGhlIHBhY2thZ2UgYXV0aG9yIHRvIGFkZCBuZy1hZGQgc3VwcG9ydC5cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59XG4iXX0=