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
const command_1 = require("../models/command");
const command_runner_1 = require("../models/command-runner");
const schematic_command_1 = require("../models/schematic-command");
const config_1 = require("../utilities/config");
class AddCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'add';
        this.description = 'Add support for a library to your project.';
        this.allowPrivateSchematics = true;
        this.scope = command_1.CommandScope.inProject;
        this.arguments = ['collection'];
        this.options = [];
    }
    _parseSchematicOptions(collectionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const schematicOptions = yield this.getOptions({
                schematicName: 'ng-add',
                collectionName,
            });
            const options = this.options.concat(schematicOptions.options);
            const args = schematicOptions.arguments.map(arg => arg.name);
            return command_runner_1.parseOptions(this._rawArgs, options, args, this.argStrategy);
        });
    }
    validate(options) {
        const collectionName = options._[0];
        if (!collectionName) {
            this.logger.fatal(`The "ng ${this.name}" command requires a name argument to be specified eg. `
                + `${core_1.terminal.yellow('ng add [name] ')}. For more details, use "ng help".`);
            return false;
        }
        return true;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const firstArg = options._[0];
            if (!firstArg) {
                this.logger.fatal(`The "ng ${this.name}" command requires a name argument to be specified eg. `
                    + `${core_1.terminal.yellow('ng add [name] ')}. For more details, use "ng help".`);
                return 1;
            }
            const packageManager = config_1.getPackageManager();
            const npmInstall = require('../tasks/npm-install').default;
            const packageName = firstArg.startsWith('@')
                ? firstArg.split('/', 2).join('/')
                : firstArg.split('/', 1)[0];
            // Remove the tag/version from the package name.
            const collectionName = (packageName.startsWith('@')
                ? packageName.split('@', 2).join('@')
                : packageName.split('@', 1).join('@')) + firstArg.slice(packageName.length);
            // We don't actually add the package to package.json, that would be the work of the package
            // itself.
            yield npmInstall(packageName, this.logger, packageManager, this.project.root);
            // Reparse the options with the new schematic accessible.
            options = yield this._parseSchematicOptions(collectionName);
            const runOptions = {
                schematicOptions: options,
                workingDir: this.project.root,
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
exports.default = AddCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9hZGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7OztBQUVILGlEQUFpRDtBQUNqRCwrQ0FBc0Q7QUFDdEQsNERBQXVGO0FBQ3ZGLCtDQUF5RDtBQUN6RCw2REFBd0Q7QUFDeEQsbUVBQStEO0FBRS9ELGdEQUF3RDtBQUd4RCxnQkFBZ0MsU0FBUSxvQ0FBZ0I7SUFBeEQ7O1FBQ1csU0FBSSxHQUFHLEtBQUssQ0FBQztRQUNiLGdCQUFXLEdBQUcsNENBQTRDLENBQUM7UUFDM0QsMkJBQXNCLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLFVBQUssR0FBRyxzQkFBWSxDQUFDLFNBQVMsQ0FBQztRQUMvQixjQUFTLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzQixZQUFPLEdBQWEsRUFBRSxDQUFDO0lBNkZ6QixDQUFDO0lBM0ZlLHNCQUFzQixDQUFDLGNBQXNCOztZQUN6RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDN0MsYUFBYSxFQUFFLFFBQVE7Z0JBQ3ZCLGNBQWM7YUFDZixDQUFDLENBQUM7WUFFSCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5RCxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTdELE1BQU0sQ0FBQyw2QkFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdEUsQ0FBQztLQUFBO0lBRUQsUUFBUSxDQUFDLE9BQVk7UUFDbkIsTUFBTSxjQUFj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SCxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNYLENBQUM7Z0JBRUQsTUFBTSxDQUFDLENBQUM7WUFDVixDQUFDO1FBQ0gsQ0FBQztLQUFBO0NBQ0Y7QUFuR0QsNkJBbUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyB0YWdzLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlRG9lc05vdFN1cHBvcnRTY2hlbWF0aWNzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBwYXJzZU9wdGlvbnMgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZC1ydW5uZXInO1xuaW1wb3J0IHsgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgeyBOcG1JbnN0YWxsIH0gZnJvbSAnLi4vdGFza3MvbnBtLWluc3RhbGwnO1xuaW1wb3J0IHsgZ2V0UGFja2FnZU1hbmFnZXIgfSBmcm9tICcuLi91dGlsaXRpZXMvY29uZmlnJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBZGRDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZCB7XG4gIHJlYWRvbmx5IG5hbWUgPSAnYWRkJztcbiAgcmVhZG9ubHkgZGVzY3JpcHRpb24gPSAnQWRkIHN1cHBvcnQgZm9yIGEgbGlicmFyeSB0byB5b3VyIHByb2plY3QuJztcbiAgcmVhZG9ubHkgYWxsb3dQcml2YXRlU2NoZW1hdGljcyA9IHRydWU7XG4gIHNjb3BlID0gQ29tbWFuZFNjb3BlLmluUHJvamVjdDtcbiAgYXJndW1lbnRzID0gWydjb2xsZWN0aW9uJ107XG4gIG9wdGlvbnM6IE9wdGlvbltdID0gW107XG5cbiAgcHJpdmF0ZSBhc3luYyBfcGFyc2VTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBhd2FpdCB0aGlzLmdldE9wdGlvbnMoe1xuICAgICAgc2NoZW1hdGljTmFtZTogJ25nLWFkZCcsXG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMuY29uY2F0KHNjaGVtYXRpY09wdGlvbnMub3B0aW9ucyk7XG4gICAgY29uc3QgYXJncyA9IHNjaGVtYXRpY09wdGlvbnMuYXJndW1lbnRzLm1hcChhcmcgPT4gYXJnLm5hbWUpO1xuXG4gICAgcmV0dXJuIHBhcnNlT3B0aW9ucyh0aGlzLl9yYXdBcmdzLCBvcHRpb25zLCBhcmdzLCB0aGlzLmFyZ1N0cmF0ZWd5KTtcbiAgfVxuXG4gIHZhbGlkYXRlKG9wdGlvbnM6IGFueSkge1xuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gb3B0aW9ucy5fWzBdO1xuXG4gICAgaWYgKCFjb2xsZWN0aW9uTmFtZSkge1xuICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoXG4gICAgICAgIGBUaGUgXCJuZyAke3RoaXMubmFtZX1cIiBjb21tYW5kIHJlcXVpcmVzIGEgbmFtZSBhcmd1bWVudCB0byBiZSBzcGVjaWZpZWQgZWcuIGBcbiAgICAgICAgKyBgJHt0ZXJtaW5hbC55ZWxsb3coJ25nIGFkZCBbbmFtZV0gJyl9LiBGb3IgbW9yZSBkZXRhaWxzLCB1c2UgXCJuZyBoZWxwXCIuYCxcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBhbnkpIHtcbiAgICBjb25zdCBmaXJzdEFyZyA9IG9wdGlvbnMuX1swXTtcblxuICAgIGlmICghZmlyc3RBcmcpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKFxuICAgICAgICBgVGhlIFwibmcgJHt0aGlzLm5hbWV9XCIgY29tbWFuZCByZXF1aXJlcyBhIG5hbWUgYXJndW1lbnQgdG8gYmUgc3BlY2lmaWVkIGVnLiBgXG4gICAgICAgICsgYCR7dGVybWluYWwueWVsbG93KCduZyBhZGQgW25hbWVdICcpfS4gRm9yIG1vcmUgZGV0YWlscywgdXNlIFwibmcgaGVscFwiLmAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTWFuYWdlciA9IGdldFBhY2thZ2VNYW5hZ2VyKCk7XG5cbiAgICBjb25zdCBucG1JbnN0YWxsOiBOcG1JbnN0YWxsID0gcmVxdWlyZSgnLi4vdGFza3MvbnBtLWluc3RhbGwnKS5kZWZhdWx0O1xuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSBmaXJzdEFyZy5zdGFydHNXaXRoKCdAJylcbiAgICAgID8gZmlyc3RBcmcuc3BsaXQoJy8nLCAyKS5qb2luKCcvJylcbiAgICAgIDogZmlyc3RBcmcuc3BsaXQoJy8nLCAxKVswXTtcblxuICAgIC8vIFJlbW92ZSB0aGUgdGFnL3ZlcnNpb24gZnJvbSB0aGUgcGFja2FnZSBuYW1lLlxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gKFxuICAgICAgcGFja2FnZU5hbWUuc3RhcnRzV2l0aCgnQCcpXG4gICAgICAgID8gcGFja2FnZU5hbWUuc3BsaXQoJ0AnLCAyKS5qb2luKCdAJylcbiAgICAgICAgOiBwYWNrYWdlTmFtZS5zcGxpdCgnQCcsIDEpLmpvaW4oJ0AnKVxuICAgICkgKyBmaXJzdEFyZy5zbGljZShwYWNrYWdlTmFtZS5sZW5ndGgpO1xuXG4gICAgLy8gV2UgZG9uJ3QgYWN0dWFsbHkgYWRkIHRoZSBwYWNrYWdlIHRvIHBhY2thZ2UuanNvbiwgdGhhdCB3b3VsZCBiZSB0aGUgd29yayBvZiB0aGUgcGFja2FnZVxuICAgIC8vIGl0c2VsZi5cbiAgICBhd2FpdCBucG1JbnN0YWxsKFxuICAgICAgcGFja2FnZU5hbWUsXG4gICAgICB0aGlzLmxvZ2dlcixcbiAgICAgIHBhY2thZ2VNYW5hZ2VyLFxuICAgICAgdGhpcy5wcm9qZWN0LnJvb3QsXG4gICAgKTtcblxuICAgIC8vIFJlcGFyc2UgdGhlIG9wdGlvbnMgd2l0aCB0aGUgbmV3IHNjaGVtYXRpYyBhY2Nlc3NpYmxlLlxuICAgIG9wdGlvbnMgPSBhd2FpdCB0aGlzLl9wYXJzZVNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgY29uc3QgcnVuT3B0aW9ucyA9IHtcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICB3b3JraW5nRGlyOiB0aGlzLnByb2plY3Qucm9vdCxcbiAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogJ25nLWFkZCcsXG4gICAgICBhbGxvd1ByaXZhdGU6IHRydWUsXG4gICAgICBkcnlSdW46IGZhbHNlLFxuICAgICAgZm9yY2U6IGZhbHNlLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuU2NoZW1hdGljKHJ1bk9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2YgTm9kZVBhY2thZ2VEb2VzTm90U3VwcG9ydFNjaGVtYXRpY3MpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgIFRoZSBwYWNrYWdlIHRoYXQgeW91IGFyZSB0cnlpbmcgdG8gYWRkIGRvZXMgbm90IHN1cHBvcnQgc2NoZW1hdGljcy4gWW91IGNhbiB0cnkgdXNpbmdcbiAgICAgICAgICBhIGRpZmZlcmVudCB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIG9yIGNvbnRhY3QgdGhlIHBhY2thZ2UgYXV0aG9yIHRvIGFkZCBuZy1hZGQgc3VwcG9ydC5cbiAgICAgICAgYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG59XG4iXX0=