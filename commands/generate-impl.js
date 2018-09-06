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
const json_schema_1 = require("../utilities/json-schema");
class GenerateCommand extends schematic_command_1.SchematicCommand {
    initialize(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("initialize").call(this, options);
            // Fill up the schematics property of the command description.
            const [collectionName, schematicName] = this.parseSchematicInfo(options);
            const collection = this.getCollection(collectionName);
            this.description.suboptions = {};
            const schematicNames = schematicName ? [schematicName] : collection.listSchematicNames();
            for (const name of schematicNames) {
                const schematic = this.getSchematic(collection, name, true);
                let options = [];
                if (schematic.description.schemaJson) {
                    options = yield json_schema_1.parseJsonSchemaToOptions(this._workflow.registry, schematic.description.schemaJson);
                }
                this.description.suboptions[`${collectionName}:${name}`] = options;
            }
            this.description.options.forEach(option => {
                if (option.name == 'schematic') {
                    option.type = 'suboption';
                }
            });
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const [collectionName, schematicName] = this.parseSchematicInfo(options);
            if (!schematicName || !collectionName) {
                return this.printHelp(options);
            }
            return this.runSchematic({
                collectionName,
                schematicName,
                schematicOptions: options['--'] || [],
                debug: !!options.debug || false,
                dryRun: !!options.dryRun || false,
                force: !!options.force || false,
            });
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
    printHelp(options) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("printHelp").call(this, options);
            this.logger.info('');
            if (Object.keys(this.description.suboptions || {}).length == 1) {
                this.logger.info(`\nTo see help for a schematic run:`);
                this.logger.info(core_1.terminal.cyan(`  ng generate <schematic> --help`));
            }
            return 0;
        });
    }
}
exports.GenerateCommand = GenerateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZ2VuZXJhdGUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELCtDQUFnRDtBQUVoRCxtRUFBcUY7QUFDckYsMERBQW9FO0FBTXBFLE1BQWEsZUFFWCxTQUFRLG9DQUFtQjtJQUNyQixVQUFVLENBQUMsT0FBVTs7O1lBQ3pCLE1BQU0sb0JBQWdCLFlBQUMsT0FBTyxDQUFDLENBQUM7WUFFaEMsOERBQThEO1lBQzlELE1BQU0sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXpFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDdEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1lBRWpDLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFFekYsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUU7Z0JBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxPQUFPLEdBQWEsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFO29CQUNwQyxPQUFPLEdBQUcsTUFBTSxzQ0FBd0IsQ0FDdEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQ3ZCLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUNqQyxDQUFDO2lCQUNIO2dCQUVELElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsY0FBYyxJQUFJLElBQUksRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDO2FBQ3BFO1lBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN4QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksV0FBVyxFQUFFO29CQUM5QixNQUFNLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQztpQkFDM0I7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVZLEdBQUcsQ0FBQyxPQUFVOztZQUN6QixNQUFNLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV6RSxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUNyQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDaEM7WUFFRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ3ZCLGNBQWM7Z0JBQ2QsYUFBYTtnQkFDYixnQkFBZ0IsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDckMsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEtBQUs7Z0JBQy9CLE1BQU0sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxLQUFLO2dCQUNqQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksS0FBSzthQUNoQyxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQUE7SUFFTyxrQkFBa0IsQ0FBQyxPQUErQjtRQUN4RCxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztRQUUxRCxJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDO1FBRXRDLElBQUksYUFBYSxFQUFFO1lBQ2pCLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDL0IsQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDL0Q7U0FDRjtRQUVELE9BQU8sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVZLFNBQVMsQ0FBQyxPQUFVOzs7WUFDL0IsTUFBTSxtQkFBZSxZQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRS9CLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JCLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO2dCQUM5RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFRLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQzthQUNyRTtZQUVELE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQztLQUFBO0NBQ0Y7QUE1RUQsMENBNEVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQgeyB0ZXJtaW5hbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgQmFzZVNjaGVtYXRpY09wdGlvbnMsIFNjaGVtYXRpY0NvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvc2NoZW1hdGljLWNvbW1hbmQnO1xuaW1wb3J0IHsgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuZXhwb3J0IGludGVyZmFjZSBHZW5lcmF0ZUNvbW1hbmRPcHRpb25zIGV4dGVuZHMgQmFzZVNjaGVtYXRpY09wdGlvbnMge1xuICBzY2hlbWF0aWM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZUNvbW1hbmQ8XG4gIFQgZXh0ZW5kcyBHZW5lcmF0ZUNvbW1hbmRPcHRpb25zID0gR2VuZXJhdGVDb21tYW5kT3B0aW9ucyxcbj4gZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPFQ+IHtcbiAgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBUKSB7XG4gICAgYXdhaXQgc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcblxuICAgIC8vIEZpbGwgdXAgdGhlIHNjaGVtYXRpY3MgcHJvcGVydHkgb2YgdGhlIGNvbW1hbmQgZGVzY3JpcHRpb24uXG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKG9wdGlvbnMpO1xuXG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuZ2V0Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgdGhpcy5kZXNjcmlwdGlvbi5zdWJvcHRpb25zID0ge307XG5cbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lcyA9IHNjaGVtYXRpY05hbWUgPyBbc2NoZW1hdGljTmFtZV0gOiBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcygpO1xuXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNjaGVtYXRpY05hbWVzKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWMgPSB0aGlzLmdldFNjaGVtYXRpYyhjb2xsZWN0aW9uLCBuYW1lLCB0cnVlKTtcbiAgICAgIGxldCBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuICAgICAgaWYgKHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5zY2hlbWFKc29uKSB7XG4gICAgICAgIG9wdGlvbnMgPSBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMoXG4gICAgICAgICAgdGhpcy5fd29ya2Zsb3cucmVnaXN0cnksXG4gICAgICAgICAgc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24sXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZGVzY3JpcHRpb24uc3Vib3B0aW9uc1tgJHtjb2xsZWN0aW9uTmFtZX06JHtuYW1lfWBdID0gb3B0aW9ucztcbiAgICB9XG5cbiAgICB0aGlzLmRlc2NyaXB0aW9uLm9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgaWYgKG9wdGlvbi5uYW1lID09ICdzY2hlbWF0aWMnKSB7XG4gICAgICAgIG9wdGlvbi50eXBlID0gJ3N1Ym9wdGlvbic7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IFQpIHtcbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9ucyk7XG5cbiAgICBpZiAoIXNjaGVtYXRpY05hbWUgfHwgIWNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcmludEhlbHAob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnM6IG9wdGlvbnNbJy0tJ10gfHwgW10sXG4gICAgICBkZWJ1ZzogISFvcHRpb25zLmRlYnVnIHx8IGZhbHNlLFxuICAgICAgZHJ5UnVuOiAhIW9wdGlvbnMuZHJ5UnVuIHx8IGZhbHNlLFxuICAgICAgZm9yY2U6ICEhb3B0aW9ucy5mb3JjZSB8fCBmYWxzZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VTY2hlbWF0aWNJbmZvKG9wdGlvbnM6IHsgc2NoZW1hdGljPzogc3RyaW5nIH0pOiBbc3RyaW5nLCBzdHJpbmcgfCB1bmRlZmluZWRdIHtcbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG5cbiAgICBsZXQgc2NoZW1hdGljTmFtZSA9IG9wdGlvbnMuc2NoZW1hdGljO1xuXG4gICAgaWYgKHNjaGVtYXRpY05hbWUpIHtcbiAgICAgIGlmIChzY2hlbWF0aWNOYW1lLmluY2x1ZGVzKCc6JykpIHtcbiAgICAgICAgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpY05hbWUuc3BsaXQoJzonLCAyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBwcmludEhlbHAob3B0aW9uczogVCkge1xuICAgIGF3YWl0IHN1cGVyLnByaW50SGVscChvcHRpb25zKTtcblxuICAgIHRoaXMubG9nZ2VyLmluZm8oJycpO1xuICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLmRlc2NyaXB0aW9uLnN1Ym9wdGlvbnMgfHwge30pLmxlbmd0aCA9PSAxKSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGBcXG5UbyBzZWUgaGVscCBmb3IgYSBzY2hlbWF0aWMgcnVuOmApO1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyh0ZXJtaW5hbC5jeWFuKGAgIG5nIGdlbmVyYXRlIDxzY2hlbWF0aWM+IC0taGVscGApKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIl19