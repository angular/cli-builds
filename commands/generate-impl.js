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
const schematic_command_1 = require("../models/schematic-command");
class GenerateCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
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
                this.addOptions(schematicOptions);
            }
        });
    }
    validate(options) {
        if (!options.schematic) {
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
        delete options.schematic;
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
        let collectionName = this.getDefaultSchematicCollection();
        let schematicName = options.schematic;
        if (schematicName) {
            if (schematicName.includes(':')) {
                [collectionName, schematicName] = schematicName.split(':', 2);
            }
        }
        return [collectionName, schematicName];
    }
    printHelp(_name, _description, options) {
        const schematicName = options._[0];
        if (schematicName) {
            const optsWithoutSchematic = this.options
                .filter(o => !(o.name === 'schematic' && this.isArgument(o)));
            this.printHelpUsage(`generate ${schematicName}`, optsWithoutSchematic);
            this.printHelpOptions(this.options);
        }
        else {
            this.printHelpUsage('generate', this.options);
            const engineHost = this.getEngineHost();
            const [collectionName] = this.parseSchematicInfo(options);
            const collection = this.getCollection(collectionName);
            const schematicNames = engineHost.listSchematicNames(collection.description);
            this.logger.info('Available schematics:');
            schematicNames.forEach(schematicName => {
                this.logger.info(`    ${schematicName}`);
            });
            this.logger.warn(`\nTo see help for a schematic run:`);
            this.logger.info(core_1.terminal.cyan(`  ng generate <schematic> --help`));
        }
    }
}
exports.GenerateCommand = GenerateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZ2VuZXJhdGUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELCtDQUFzRDtBQUN0RCxtRUFBK0Q7QUFHL0QscUJBQTZCLFNBQVEsb0NBQWdCO0lBQXJEOztRQUNVLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBbUY5QixDQUFDO0lBbEZjLFVBQVUsQ0FBQyxPQUFZOzs7WUFDbEMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNwQixPQUFPO2FBQ1I7WUFDRCxNQUFNLG9CQUFnQixZQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBRXhCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pFLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRTtnQkFDbkIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUM7b0JBQzdDLGFBQWE7b0JBQ2IsY0FBYztpQkFDZixDQUFDLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ25DO1FBQ0gsQ0FBQztLQUFBO0lBRUQsUUFBUSxDQUFDLE9BQVk7UUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7WUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTs7O3lDQUdLLENBQUMsQ0FBQztZQUVyQyxPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU0sR0FBRyxDQUFDLE9BQVk7UUFDckIsTUFBTSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFekUsNkNBQTZDO1FBQzdDLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUV6QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkIsY0FBYztZQUNkLGFBQWE7WUFDYixnQkFBZ0IsRUFBRSxPQUFPO1lBQ3pCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1NBQ3JCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxPQUFZO1FBQ3JDLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBRTFELElBQUksYUFBYSxHQUFXLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFFOUMsSUFBSSxhQUFhLEVBQUU7WUFDakIsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMvRDtTQUNGO1FBRUQsT0FBTyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRU0sU0FBUyxDQUFDLEtBQWEsRUFBRSxZQUFvQixFQUFFLE9BQVk7UUFDaEUsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFJLGFBQWEsRUFBRTtZQUNqQixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxPQUFPO2lCQUN0QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLGFBQWEsRUFBRSxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNyQzthQUFNO1lBQ0wsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzlDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdEQsTUFBTSxjQUFjLEdBQWEsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sYUFBYSxFQUFFLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBUSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7U0FDckU7SUFDSCxDQUFDO0NBQ0Y7QUFwRkQsMENBb0ZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyB0YWdzLCB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuXG5cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZUNvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kIHtcbiAgcHJpdmF0ZSBpbml0aWFsaXplZCA9IGZhbHNlO1xuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAodGhpcy5pbml0aWFsaXplZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKG9wdGlvbnMpO1xuICAgIGlmICghIXNjaGVtYXRpY05hbWUpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpY09wdGlvbnMgPSBhd2FpdCB0aGlzLmdldE9wdGlvbnMoe1xuICAgICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hZGRPcHRpb25zKHNjaGVtYXRpY09wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHZhbGlkYXRlKG9wdGlvbnM6IGFueSk6IGJvb2xlYW4gfCBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIW9wdGlvbnMuc2NoZW1hdGljKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcih0YWdzLm9uZUxpbmVgXG4gICAgICAgIFRoZSBcIm5nIGdlbmVyYXRlXCIgY29tbWFuZCByZXF1aXJlcyBhXG4gICAgICAgIHNjaGVtYXRpYyBuYW1lIHRvIGJlIHNwZWNpZmllZC5cbiAgICAgICAgRm9yIG1vcmUgZGV0YWlscywgdXNlIFwibmcgaGVscFwiLmApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwdWJsaWMgcnVuKG9wdGlvbnM6IGFueSkge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcblxuICAgIC8vIHJlbW92ZSB0aGUgc2NoZW1hdGljIG5hbWUgZnJvbSB0aGUgb3B0aW9uc1xuICAgIGRlbGV0ZSBvcHRpb25zLnNjaGVtYXRpYztcblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgZGVidWc6IG9wdGlvbnMuZGVidWcsXG4gICAgICBkcnlSdW46IG9wdGlvbnMuZHJ5UnVuLFxuICAgICAgZm9yY2U6IG9wdGlvbnMuZm9yY2UsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zOiBhbnkpIHtcbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG5cbiAgICBsZXQgc2NoZW1hdGljTmFtZTogc3RyaW5nID0gb3B0aW9ucy5zY2hlbWF0aWM7XG5cbiAgICBpZiAoc2NoZW1hdGljTmFtZSkge1xuICAgICAgaWYgKHNjaGVtYXRpY05hbWUuaW5jbHVkZXMoJzonKSkge1xuICAgICAgICBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljTmFtZS5zcGxpdCgnOicsIDIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICB9XG5cbiAgcHVibGljIHByaW50SGVscChfbmFtZTogc3RyaW5nLCBfZGVzY3JpcHRpb246IHN0cmluZywgb3B0aW9uczogYW55KSB7XG4gICAgY29uc3Qgc2NoZW1hdGljTmFtZSA9IG9wdGlvbnMuX1swXTtcbiAgICBpZiAoc2NoZW1hdGljTmFtZSkge1xuICAgICAgY29uc3Qgb3B0c1dpdGhvdXRTY2hlbWF0aWMgPSB0aGlzLm9wdGlvbnNcbiAgICAgICAgLmZpbHRlcihvID0+ICEoby5uYW1lID09PSAnc2NoZW1hdGljJyAmJiB0aGlzLmlzQXJndW1lbnQobykpKTtcbiAgICAgIHRoaXMucHJpbnRIZWxwVXNhZ2UoYGdlbmVyYXRlICR7c2NoZW1hdGljTmFtZX1gLCBvcHRzV2l0aG91dFNjaGVtYXRpYyk7XG4gICAgICB0aGlzLnByaW50SGVscE9wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcmludEhlbHBVc2FnZSgnZ2VuZXJhdGUnLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgY29uc3QgZW5naW5lSG9zdCA9IHRoaXMuZ2V0RW5naW5lSG9zdCgpO1xuICAgICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKG9wdGlvbnMpO1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBzY2hlbWF0aWNOYW1lczogc3RyaW5nW10gPSBlbmdpbmVIb3N0Lmxpc3RTY2hlbWF0aWNOYW1lcyhjb2xsZWN0aW9uLmRlc2NyaXB0aW9uKTtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ0F2YWlsYWJsZSBzY2hlbWF0aWNzOicpO1xuICAgICAgc2NoZW1hdGljTmFtZXMuZm9yRWFjaChzY2hlbWF0aWNOYW1lID0+IHtcbiAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgICAgICR7c2NoZW1hdGljTmFtZX1gKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmxvZ2dlci53YXJuKGBcXG5UbyBzZWUgaGVscCBmb3IgYSBzY2hlbWF0aWMgcnVuOmApO1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyh0ZXJtaW5hbC5jeWFuKGAgIG5nIGdlbmVyYXRlIDxzY2hlbWF0aWM+IC0taGVscGApKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==