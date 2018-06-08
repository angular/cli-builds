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
const schematics_1 = require("../utilities/schematics");
class GenerateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'generate';
        this.description = 'Generates and/or modifies files based on a schematic.';
        this.scope = command_1.CommandScope.inProject;
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
            const engineHost = schematics_1.getEngineHost();
            const [collectionName] = this.parseSchematicInfo(options);
            const collection = schematics_1.getCollection(collectionName);
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
exports.default = GenerateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2dlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7QUFFSCxpREFBaUQ7QUFDakQsK0NBQXNEO0FBQ3RELCtDQUF5RDtBQUN6RCxtRUFBK0Q7QUFDL0QsZ0RBQW9FO0FBQ3BFLHdEQUdpQztBQUdqQyxxQkFBcUMsU0FBUSxvQ0FBZ0I7SUFBN0Q7O1FBQ2tCLFNBQUksR0FBRyxVQUFVLENBQUM7UUFDbEIsZ0JBQVcsR0FBRyx1REFBdUQsQ0FBQztRQUV0RSxVQUFLLEdBQUcsc0JBQVksQ0FBQyxTQUFTLENBQUM7UUFDeEMsY0FBUyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDMUIsWUFBTyxHQUFhO1lBQ3pCLEdBQUcsSUFBSSxDQUFDLFdBQVc7U0FDcEIsQ0FBQztRQUVNLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBeUY5QixDQUFDO0lBeEZjLFVBQVUsQ0FBQyxPQUFZOzs7WUFDbEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQztZQUNULENBQUM7WUFDRCxNQUFNLG9CQUFnQixZQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBRXhCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXpFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztvQkFDN0MsYUFBYTtvQkFDYixjQUFjO2lCQUNmLENBQUMsQ0FBQztnQkFDSCxJQUFJLENBQUMsT0FBTyxHQUFH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QUcsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUN0RixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdELE1BQU0sVUFBVSxHQUFHLDBCQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFELE1BQU0sVUFBVSxHQUFHLDBCQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDakQsTUFBTSxjQUFjLEdBQWEsVUFBVSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sYUFBYSxFQUFFLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNILENBQUM7O0FBL0ZhLHVCQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUhoQyxrQ0FtR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IHRhZ3MsIHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29tbWFuZFNjb3BlLCBPcHRpb24gfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQge1xuICBnZXRDb2xsZWN0aW9uLFxuICBnZXRFbmdpbmVIb3N0LFxufSBmcm9tICcuLi91dGlsaXRpZXMvc2NoZW1hdGljcyc7XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2VuZXJhdGVDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ2dlbmVyYXRlJztcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uID0gJ0dlbmVyYXRlcyBhbmQvb3IgbW9kaWZpZXMgZmlsZXMgYmFzZWQgb24gYSBzY2hlbWF0aWMuJztcbiAgcHVibGljIHN0YXRpYyBhbGlhc2VzID0gWydnJ107XG4gIHB1YmxpYyByZWFkb25seSBzY29wZSA9IENvbW1hbmRTY29wZS5pblByb2plY3Q7XG4gIHB1YmxpYyBhcmd1bWVudHMgPSBbJ3NjaGVtYXRpYyddO1xuICBwdWJsaWMgb3B0aW9uczogT3B0aW9uW10gPSBbXG4gICAgLi4udGhpcy5jb3JlT3B0aW9ucyxcbiAgXTtcblxuICBwcml2YXRlIGluaXRpYWxpemVkID0gZmFsc2U7XG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IGFueSkge1xuICAgIGlmICh0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9ucyk7XG5cbiAgICBpZiAoISFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWNPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRPcHRpb25zKHtcbiAgICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICB9KTtcbiAgICAgIHRoaXMub3B0aW9ucyA9IHRoaXMub3B0aW9ucy5jb25jYXQoc2NoZW1hdGljT3B0aW9ucy5vcHRpb25zKTtcbiAgICAgIHRoaXMuYXJndW1lbnRzID0gdGhpcy5hcmd1bWVudHMuY29uY2F0KHNjaGVtYXRpY09wdGlvbnMuYXJndW1lbnRzLm1hcChhID0+IGEubmFtZSkpO1xuICAgIH1cbiAgfVxuXG4gIHZhbGlkYXRlKG9wdGlvbnM6IGFueSk6IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIW9wdGlvbnMuX1swXSkge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICBUaGUgXCJuZyBnZW5lcmF0ZVwiIGNvbW1hbmQgcmVxdWlyZXMgYVxuICAgICAgICBzY2hlbWF0aWMgbmFtZSB0byBiZSBzcGVjaWZpZWQuXG4gICAgICAgIEZvciBtb3JlIGRldGFpbHMsIHVzZSBcIm5nIGhlbHBcIi5gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHVibGljIHJ1bihvcHRpb25zOiBhbnkpIHtcbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9ucyk7XG5cbiAgICAvLyByZW1vdmUgdGhlIHNjaGVtYXRpYyBuYW1lIGZyb20gdGhlIG9wdGlvbnNcbiAgICBvcHRpb25zLl8gPSBvcHRpb25zLl8uc2xpY2UoMSk7XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGRlYnVnOiBvcHRpb25zLmRlYnVnLFxuICAgICAgZHJ5UnVuOiBvcHRpb25zLmRyeVJ1bixcbiAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9uczogYW55KSB7XG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lID0gZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTtcblxuICAgIGxldCBzY2hlbWF0aWNOYW1lOiBzdHJpbmcgPSBvcHRpb25zLl9bMF07XG5cbiAgICBpZiAoc2NoZW1hdGljTmFtZSkge1xuICAgICAgaWYgKHNjaGVtYXRpY05hbWUuaW5jbHVkZXMoJzonKSkge1xuICAgICAgICBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljTmFtZS5zcGxpdCgnOicsIDIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICB9XG5cbiAgcHVibGljIHByaW50SGVscChvcHRpb25zOiBhbnkpIHtcbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lID0gb3B0aW9ucy5fWzBdO1xuICAgIGlmIChzY2hlbWF0aWNOYW1lKSB7XG4gICAgICBjb25zdCBhcmdEaXNwbGF5ID0gdGhpcy5hcmd1bWVudHMgJiYgdGhpcy5hcmd1bWVudHMubGVuZ3RoID4gMFxuICAgICAgICA/ICcgJyArIHRoaXMuYXJndW1lbnRzLmZpbHRlcihhID0+IGEgIT09ICdzY2hlbWF0aWMnKS5tYXAoYSA9PiBgPCR7YX0+YCkuam9pbignICcpXG4gICAgICAgIDogJyc7XG4gICAgICBjb25zdCBvcHRpb25zRGlzcGxheSA9IHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMubGVuZ3RoID4gMFxuICAgICAgICA/ICcgW29wdGlvbnNdJ1xuICAgICAgICA6ICcnO1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgdXNhZ2U6IG5nIGdlbmVyYXRlICR7c2NoZW1hdGljTmFtZX0ke2FyZ0Rpc3BsYXl9JHtvcHRpb25zRGlzcGxheX1gKTtcbiAgICAgIHRoaXMucHJpbnRIZWxwT3B0aW9ucyhvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcmludEhlbHBVc2FnZSh0aGlzLm5hbWUsIHRoaXMuYXJndW1lbnRzLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgY29uc3QgZW5naW5lSG9zdCA9IGdldEVuZ2luZUhvc3QoKTtcbiAgICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBnZXRDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzOiBzdHJpbmdbXSA9IGVuZ2luZUhvc3QubGlzdFNjaGVtYXRpY3MoY29sbGVjdGlvbik7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdBdmFpbGFibGUgc2NoZW1hdGljczonKTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmZvckVhY2goc2NoZW1hdGljTmFtZSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgICAke3NjaGVtYXRpY05hbWV9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIud2FybihgXFxuVG8gc2VlIGhlbHAgZm9yIGEgc2NoZW1hdGljIHJ1bjpgKTtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odGVybWluYWwuY3lhbihgICBuZyBnZW5lcmF0ZSA8c2NoZW1hdGljPiAtLWhlbHBgKSk7XG4gICAgfVxuICB9XG59XG4iXX0=