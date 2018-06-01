"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any file-header
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2dlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw2REFBNkQ7QUFDN0QsK0NBQXNEO0FBQ3RELCtDQUF5RDtBQUN6RCxtRUFBK0Q7QUFDL0QsZ0RBQW9FO0FBQ3BFLHdEQUdpQztBQUdqQyxxQkFBcUMsU0FBUSxvQ0FBZ0I7SUFBN0Q7O1FBQ2tCLFNBQUksR0FBRyxVQUFVLENBQUM7UUFDbEIsZ0JBQVcsR0FBRyx1REFBdUQsQ0FBQztRQUV0RSxVQUFLLEdBQUcsc0JBQVksQ0FBQyxTQUFTLENBQUM7UUFDeEMsY0FBUyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDMUIsWUFBTyxHQUFhO1lBQ3pCLEdBQUcsSUFBSSxDQUFDLFdBQVc7U0FDcEIsQ0FBQztRQUVNLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBeUY5QixDQUFDO0lBeEZjLFVBQVUsQ0FBQyxPQUFZOzs7WUFDbEMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLE1BQU0sQ0FBQztZQUNULENBQUM7WUFDRCxNQUFNLG9CQUFnQixZQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBRXhCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXpFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztvQkFDN0MsYUFBYTtvQkFDYixjQUFjO2lCQUNmLENBQUMsQ0FBQztnQkFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFP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QUMsQ0FBQztZQUN0RixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdELE1BQU0sVUFBVSxHQUFHLDBCQUFhLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFELE1BQU0sVUFBVSxHQUFHLDBCQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDakQsTUFBTSxjQUFjLEdBQWEsVUFBVSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sYUFBYSxFQUFFLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNILENBQUM7O0FBL0ZhLHVCQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUhoQyxrQ0FtR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55IGZpbGUtaGVhZGVyXG5pbXBvcnQgeyB0YWdzLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IENvbW1hbmRTY29wZSwgT3B0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuaW1wb3J0IHsgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgeyBnZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9jb25maWcnO1xuaW1wb3J0IHtcbiAgZ2V0Q29sbGVjdGlvbixcbiAgZ2V0RW5naW5lSG9zdCxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL3NjaGVtYXRpY3MnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdlbmVyYXRlQ29tbWFuZCBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQge1xuICBwdWJsaWMgcmVhZG9ubHkgbmFtZSA9ICdnZW5lcmF0ZSc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdHZW5lcmF0ZXMgYW5kL29yIG1vZGlmaWVzIGZpbGVzIGJhc2VkIG9uIGEgc2NoZW1hdGljLic7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsnZyddO1xuICBwdWJsaWMgcmVhZG9ubHkgc2NvcGUgPSBDb21tYW5kU2NvcGUuaW5Qcm9qZWN0O1xuICBwdWJsaWMgYXJndW1lbnRzID0gWydzY2hlbWF0aWMnXTtcbiAgcHVibGljIG9wdGlvbnM6IE9wdGlvbltdID0gW1xuICAgIC4uLnRoaXMuY29yZU9wdGlvbnMsXG4gIF07XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplZCA9IGZhbHNlO1xuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAodGhpcy5pbml0aWFsaXplZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKG9wdGlvbnMpO1xuXG4gICAgaWYgKCEhc2NoZW1hdGljTmFtZSkge1xuICAgICAgY29uc3Qgc2NoZW1hdGljT3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0T3B0aW9ucyh7XG4gICAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgfSk7XG4gICAgICB0aGlzLm9wdGlvbnMgPSB0aGlzLm9wdGlvbnMuY29uY2F0KHNjaGVtYXRpY09wdGlvbnMub3B0aW9ucyk7XG4gICAgICB0aGlzLmFyZ3VtZW50cyA9IHRoaXMuYXJndW1lbnRzLmNvbmNhdChzY2hlbWF0aWNPcHRpb25zLmFyZ3VtZW50cy5tYXAoYSA9PiBhLm5hbWUpKTtcbiAgICB9XG4gIH1cblxuICB2YWxpZGF0ZShvcHRpb25zOiBhbnkpOiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCFvcHRpb25zLl9bMF0pIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKHRhZ3Mub25lTGluZWBcbiAgICAgICAgVGhlIFwibmcgZ2VuZXJhdGVcIiBjb21tYW5kIHJlcXVpcmVzIGFcbiAgICAgICAgc2NoZW1hdGljIG5hbWUgdG8gYmUgc3BlY2lmaWVkLlxuICAgICAgICBGb3IgbW9yZSBkZXRhaWxzLCB1c2UgXCJuZyBoZWxwXCIuYCk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBydW4ob3B0aW9uczogYW55KSB7XG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKG9wdGlvbnMpO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzY2hlbWF0aWMgbmFtZSBmcm9tIHRoZSBvcHRpb25zXG4gICAgb3B0aW9ucy5fID0gb3B0aW9ucy5fLnNsaWNlKDEpO1xuXG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBkZWJ1Zzogb3B0aW9ucy5kZWJ1ZyxcbiAgICAgIGRyeVJ1bjogb3B0aW9ucy5kcnlSdW4sXG4gICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VTY2hlbWF0aWNJbmZvKG9wdGlvbnM6IGFueSkge1xuICAgIGxldCBjb2xsZWN0aW9uTmFtZSA9IGdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG5cbiAgICBsZXQgc2NoZW1hdGljTmFtZTogc3RyaW5nID0gb3B0aW9ucy5fWzBdO1xuXG4gICAgaWYgKHNjaGVtYXRpY05hbWUpIHtcbiAgICAgIGlmIChzY2hlbWF0aWNOYW1lLmluY2x1ZGVzKCc6JykpIHtcbiAgICAgICAgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpY05hbWUuc3BsaXQoJzonLCAyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXTtcbiAgfVxuXG4gIHB1YmxpYyBwcmludEhlbHAob3B0aW9uczogYW55KSB7XG4gICAgY29uc3Qgc2NoZW1hdGljTmFtZSA9IG9wdGlvbnMuX1swXTtcbiAgICBpZiAoc2NoZW1hdGljTmFtZSkge1xuICAgICAgY29uc3QgYXJnRGlzcGxheSA9IHRoaXMuYXJndW1lbnRzICYmIHRoaXMuYXJndW1lbnRzLmxlbmd0aCA+IDBcbiAgICAgICAgPyAnICcgKyB0aGlzLmFyZ3VtZW50cy5maWx0ZXIoYSA9PiBhICE9PSAnc2NoZW1hdGljJykubWFwKGEgPT4gYDwke2F9PmApLmpvaW4oJyAnKVxuICAgICAgICA6ICcnO1xuICAgICAgY29uc3Qgb3B0aW9uc0Rpc3BsYXkgPSB0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgPyAnIFtvcHRpb25zXSdcbiAgICAgICAgOiAnJztcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYHVzYWdlOiBuZyBnZW5lcmF0ZSAke3NjaGVtYXRpY05hbWV9JHthcmdEaXNwbGF5fSR7b3B0aW9uc0Rpc3BsYXl9YCk7XG4gICAgICB0aGlzLnByaW50SGVscE9wdGlvbnMob3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHJpbnRIZWxwVXNhZ2UodGhpcy5uYW1lLCB0aGlzLmFyZ3VtZW50cywgdGhpcy5vcHRpb25zKTtcbiAgICAgIGNvbnN0IGVuZ2luZUhvc3QgPSBnZXRFbmdpbmVIb3N0KCk7XG4gICAgICBjb25zdCBbY29sbGVjdGlvbk5hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9ucyk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBzY2hlbWF0aWNOYW1lczogc3RyaW5nW10gPSBlbmdpbmVIb3N0Lmxpc3RTY2hlbWF0aWNzKGNvbGxlY3Rpb24pO1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnQXZhaWxhYmxlIHNjaGVtYXRpY3M6Jyk7XG4gICAgICBzY2hlbWF0aWNOYW1lcy5mb3JFYWNoKHNjaGVtYXRpY05hbWUgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGAgICAgJHtzY2hlbWF0aWNOYW1lfWApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFxcblRvIHNlZSBoZWxwIGZvciBhIHNjaGVtYXRpYyBydW46YCk7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRlcm1pbmFsLmN5YW4oYCAgbmcgZ2VuZXJhdGUgPHNjaGVtYXRpYz4gLS1oZWxwYCkpO1xuICAgIH1cbiAgfVxufVxuIl19