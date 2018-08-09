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
const command_1 = require("../models/command");
const schematic_command_1 = require("../models/schematic-command");
const config_1 = require("../utilities/config");
class GenerateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'generate';
        this.description = 'Generates and/or modifies files based on a schematic.';
        this.arguments = ['schematic'];
        this.options = [
            ...this.coreOptions,
        ];
        this.initialized = false;
    }
    initialize(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                return;
            }
            yield _super("initialize").call(this, options);
            this.initialized = true;
            const [collectionName, schematicName] = this.parseSchematicInfo(options);
            if (!!schematicName) {
                const schematicOptions = yield this.getOptions({
                    schematicName,
                    collectionName,
                });
                this.options = this.options.concat(schematicOptions.options);
                this.arguments = this.arguments.concat(schematicOptions.arguments.map(a => a.name));
            }
        });
    }
    validate(options) {
        if (!options._[0]) {
            this.logger.error(core_1.tags.oneLine `
        The "ng generate" command requires a
        schematic name to be specified.
        For more details, use "ng help".`);
            return false;
        }
        return true;
    }
    run(options) {
        const [collectionName, schematicName] = this.parseSchematicInfo(options);
        // remove the schematic name from the options
        options._ = options._.slice(1);
        return this.runSchematic({
            collectionName,
            schematicName,
            schematicOptions: options,
            debug: options.debug,
            dryRun: options.dryRun,
            force: options.force,
        });
    }
    parseSchematicInfo(options) {
        let collectionName = config_1.getDefaultSchematicCollection();
        let schematicName = options._[0];
        if (schematicName) {
            if (schematicName.includes(':')) {
                [collectionName, schematicName] = schematicName.split(':', 2);
            }
        }
        return [collectionName, schematicName];
    }
    printHelp(options) {
        const schematicName = options._[0];
        if (schematicName) {
            const argDisplay = this.arguments && this.arguments.length > 0
                ? ' ' + this.arguments.filter(a => a !== 'schematic').map(a => `<${a}>`).join(' ')
                : '';
            const optionsDisplay = this.options && this.options.length > 0
                ? ' [options]'
                : '';
            this.logger.info(`usage: ng generate ${schematicName}${argDisplay}${optionsDisplay}`);
            this.printHelpOptions(options);
        }
        else {
            this.printHelpUsage(this.name, this.arguments, this.options);
            const engineHost = this.getEngineHost();
            const [collectionName] = this.parseSchematicInfo(options);
            const collection = this.getCollection(collectionName);
            const schematicNames = engineHost.listSchematics(collection);
            this.logger.info('Available schematics:');
            schematicNames.forEach(schematicName => {
                this.logger.info(`    ${schematicName}`);
            });
            this.logger.warn(`\nTo see help for a schematic run:`);
            this.logger.info(core_1.terminal.cyan(`  ng generate <schematic> --help`));
        }
    }
}
GenerateCommand.aliases = ['g'];
GenerateCommand.scope = command_1.CommandScope.inProject;
exports.GenerateCommand = GenerateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2dlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxpREFBaUQ7QUFDakQsK0NBQXNEO0FBQ3RELCtDQUF5RDtBQUN6RCxtRUFBK0Q7QUFDL0QsZ0RBQW9FO0FBR3BFLHFCQUE2QixTQUFRLG9DQUFnQjtJQUFyRDs7UUFDa0IsU0FBSSxHQUFHLFVBQVUsQ0FBQztRQUNsQixnQkFBVyxHQUFHLHVEQUF1RCxDQUFDO1FBRy9FLGNBQVMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzFCLFlBQU8sR0FBYTtZQUN6QixHQUFHLElBQUksQ0FBQyxXQUFXO1NBQ3BCLENBQUM7UUFFTSxnQkFBVyxHQUFHLEtBQUssQ0FBQztJQXlGOUIsQ0FBQztJQXhGYyxVQUFVLENBQUMsT0FBWTs7O1lBQ2xDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDcEIsT0FBTzthQUNSO1lBQ0QsTUFBTSxvQkFBZ0IsWUFBQyxPQUFPLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztZQUV4QixNQUFNLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV6RSxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUU7Z0JBQ25CLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDO29CQUM3QyxhQUFhO29CQUNiLGNBQWM7aUJBQ2YsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzdELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMs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QUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdEQsTUFBTSxjQUFjLEdBQWEsVUFBVSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sYUFBYSxFQUFFLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7U0FDckU7SUFDSCxDQUFDOztBQS9GYSx1QkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEIscUJBQUssR0FBRyxzQkFBWSxDQUFDLFNBQVMsQ0FBQztBQUovQywwQ0FtR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IHRhZ3MsIHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5cblxuZXhwb3J0IGNsYXNzIEdlbmVyYXRlQ29tbWFuZCBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICdnZW5lcmF0ZSc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdHZW5lcmF0ZXMgYW5kL29yIG1vZGlmaWVzIGZpbGVzIGJhc2VkIG9uIGEgc2NoZW1hdGljLic7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsnZyddO1xuICBwdWJsaWMgc3RhdGljIHNjb3BlID0gQ29tbWFuZFNjb3BlLmluUHJvamVjdDtcbiAgcHVibGljIGFyZ3VtZW50cyA9IFsnc2NoZW1hdGljJ107XG4gIHB1YmxpYyBvcHRpb25zOiBPcHRpb25bXSA9IFtcbiAgICAuLi50aGlzLmNvcmVPcHRpb25zLFxuICBdO1xuXG4gIHByaXZhdGUgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogYW55KSB7XG4gICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcblxuICAgIGlmICghIXNjaGVtYXRpY05hbWUpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBhd2FpdCB0aGlzLmdldE9wdGlvbnMoe1xuICAgICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5vcHRpb25zID0gdGhpcy5vcHRpb25zLmNvbmNhdChzY2hlbWF0aWNPcHRpb25zLm9wdGlvbnMpO1xuICAgICAgdGhpcy5hcmd1bWVudHMgPSB0aGlzLmFyZ3VtZW50cy5jb25jYXQoc2NoZW1hdGljT3B0aW9ucy5hcmd1bWVudHMubWFwKGEgPT4gYS5uYW1lKSk7XG4gICAgfVxuICB9XG5cbiAgdmFsaWRhdGUob3B0aW9uczogYW55KTogYm9vbGVhbiB8IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghb3B0aW9ucy5fWzBdKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcih0YWdzLm9uZUxpbmVgXG4gICAgICAgIFRoZSBcIm5nIGdlbmVyYXRlXCIgY29tbWFuZCByZXF1aXJlcyBhXG4gICAgICAgIHNjaGVtYXRpYyBuYW1lIHRvIGJlIHNwZWNpZmllZC5cbiAgICAgICAgRm9yIG1vcmUgZGV0YWlscywgdXNlIFwibmcgaGVscFwiLmApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwdWJsaWMgcnVuKG9wdGlvbnM6IGFueSkge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcblxuICAgIC8vIHJlbW92ZSB0aGUgc2NoZW1hdGljIG5hbWUgZnJvbSB0aGUgb3B0aW9uc1xuICAgIG9wdGlvbnMuXyA9IG9wdGlvbnMuXy5zbGljZSgxKTtcblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgZGVidWc6IG9wdGlvbnMuZGVidWcsXG4gICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zOiBhbnkpIHtcbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSBnZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuXG4gICAgbGV0IHNjaGVtYXRpY05hbWU6IHN0cmluZyA9IG9wdGlvbnMuX1swXTtcblxuICAgIGlmIChzY2hlbWF0aWNOYW1lKSB7XG4gICAgICBpZiAoc2NoZW1hdGljTmFtZS5pbmNsdWRlcygnOicpKSB7XG4gICAgICAgIFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWNOYW1lLnNwbGl0KCc6JywgMik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV07XG4gIH1cblxuICBwdWJsaWMgcHJpbnRIZWxwKG9wdGlvbnM6IGFueSkge1xuICAgIGNvbnN0IHNjaGVtYXRpY05hbWUgPSBvcHRpb25zLl9bMF07XG4gICAgaWYgKHNjaGVtYXRpY05hbWUpIHtcbiAgICAgIGNvbnN0IGFyZ0Rpc3BsYXkgPSB0aGlzLmFyZ3VtZW50cyAmJiB0aGlzLmFyZ3VtZW50cy5sZW5ndGggPiAwXG4gICAgICAgID8gJyAnICsgdGhpcy5hcmd1bWVudHMuZmlsdGVyKGEgPT4gYSAhPT0gJ3NjaGVtYXRpYycpLm1hcChhID0+IGA8JHthfT5gKS5qb2luKCcgJylcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IG9wdGlvbnNEaXNwbGF5ID0gdGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5sZW5ndGggPiAwXG4gICAgICAgID8gJyBbb3B0aW9uc10nXG4gICAgICAgIDogJyc7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGB1c2FnZTogbmcgZ2VuZXJhdGUgJHtzY2hlbWF0aWNOYW1lfSR7YXJnRGlzcGxheX0ke29wdGlvbnNEaXNwbGF5fWApO1xuICAgICAgdGhpcy5wcmludEhlbHBPcHRpb25zKG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnByaW50SGVscFVzYWdlKHRoaXMubmFtZSwgdGhpcy5hcmd1bWVudHMsIHRoaXMub3B0aW9ucyk7XG4gICAgICBjb25zdCBlbmdpbmVIb3N0ID0gdGhpcy5nZXRFbmdpbmVIb3N0KCk7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9ucyk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5nZXRDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzOiBzdHJpbmdbXSA9IGVuZ2luZUhvc3QubGlzdFNjaGVtYXRpY3MoY29sbGVjdGlvbik7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdBdmFpbGFibGUgc2NoZW1hdGljczonKTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmZvckVhY2goc2NoZW1hdGljTmFtZSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgICAke3NjaGVtYXRpY05hbWV9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIud2FybihgXFxuVG8gc2VlIGhlbHAgZm9yIGEgc2NoZW1hdGljIHJ1bjpgKTtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odGVybWluYWwuY3lhbihgICBuZyBnZW5lcmF0ZSA8c2NoZW1hdGljPiAtLWhlbHBgKSk7XG4gICAgfVxuICB9XG59XG4iXX0=