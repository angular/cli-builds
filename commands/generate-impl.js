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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZ2VuZXJhdGUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELCtDQUFnRDtBQUVoRCxtRUFBcUY7QUFDckYsMERBQW9FO0FBTXBFLHFCQUVFLFNBQVEsb0NBQW1CO0lBQ3JCLFVBQVUsQ0FBQyxPQUFVOzs7WUFDekIsTUFBTSxvQkFBZ0IsWUFBQyxPQUFPLENBQUMsQ0FBQztZQUVoQyw4REFBOEQ7WUFDOUQsTUFBTSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFekUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFFakMsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUV6RixLQUFLLE1BQU0sSUFBSSxJQUFJLGNBQWMsRUFBRTtnQkFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1RCxJQUFJLE9BQU8sR0FBYSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUU7b0JBQ3BDLE9BQU8sR0FBRyxNQUFNLHNDQUF3QixDQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFDdkIsU0FBUyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQ2pDLENBQUM7aUJBQ0g7Z0JBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxjQUFjLElBQUksSUFBSSxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUM7YUFDcEU7WUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3hDLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxXQUFXLEVBQUU7b0JBQzlCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDO2lCQUMzQjtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRVksR0FBRyxDQUFDLE9BQVU7O1lBQ3pCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXpFLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNoQztZQUVELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztnQkFDdkIsY0FBYztnQkFDZCxhQUFhO2dCQUNiLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNyQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksS0FBSztnQkFDL0IsTUFBTSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLEtBQUs7Z0JBQ2pDLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxLQUFLO2FBQ2hDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FBQTtJQUVPLGtCQUFrQixDQUFDLE9BQStCO1FBQ3hELElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBRTFELElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFFdEMsSUFBSSxhQUFhLEVBQUU7WUFDakIsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMvQixDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMvRDtTQUNGO1FBRUQsT0FBTyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRVksU0FBUyxDQUFDLE9BQVU7OztZQUMvQixNQUFNLG1CQUFlLFlBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQVEsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDO2FBQ3JFO1lBRUQsT0FBTyxDQUFDLENBQUM7UUFDWCxDQUFDO0tBQUE7Q0FDRjtBQTVFRCwwQ0E0RUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIHRzbGludDpkaXNhYmxlOm5vLWdsb2JhbC10c2xpbnQtZGlzYWJsZSBuby1hbnlcbmltcG9ydCB7IHRlcm1pbmFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBCYXNlU2NoZW1hdGljT3B0aW9ucywgU2NoZW1hdGljQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9zY2hlbWF0aWMtY29tbWFuZCc7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnMgfSBmcm9tICcuLi91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlQ29tbWFuZE9wdGlvbnMgZXh0ZW5kcyBCYXNlU2NoZW1hdGljT3B0aW9ucyB7XG4gIHNjaGVtYXRpYz86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEdlbmVyYXRlQ29tbWFuZDxcbiAgVCBleHRlbmRzIEdlbmVyYXRlQ29tbWFuZE9wdGlvbnMgPSBHZW5lcmF0ZUNvbW1hbmRPcHRpb25zLFxuPiBleHRlbmRzIFNjaGVtYXRpY0NvbW1hbmQ8VD4ge1xuICBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IFQpIHtcbiAgICBhd2FpdCBzdXBlci5pbml0aWFsaXplKG9wdGlvbnMpO1xuXG4gICAgLy8gRmlsbCB1cCB0aGUgc2NoZW1hdGljcyBwcm9wZXJ0eSBvZiB0aGUgY29tbWFuZCBkZXNjcmlwdGlvbi5cbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9ucyk7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5nZXRDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICB0aGlzLmRlc2NyaXB0aW9uLnN1Ym9wdGlvbnMgPSB7fTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzID0gc2NoZW1hdGljTmFtZSA/IFtzY2hlbWF0aWNOYW1lXSA6IGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCk7XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygc2NoZW1hdGljTmFtZXMpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHRoaXMuZ2V0U2NoZW1hdGljKGNvbGxlY3Rpb24sIG5hbWUsIHRydWUpO1xuICAgICAgbGV0IG9wdGlvbnM6IE9wdGlvbltdID0gW107XG4gICAgICBpZiAoc2NoZW1hdGljLmRlc2NyaXB0aW9uLnNjaGVtYUpzb24pIHtcbiAgICAgICAgb3B0aW9ucyA9IGF3YWl0IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyhcbiAgICAgICAgICB0aGlzLl93b3JrZmxvdy5yZWdpc3RyeSxcbiAgICAgICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbixcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kZXNjcmlwdGlvbi5zdWJvcHRpb25zW2Ake2NvbGxlY3Rpb25OYW1lfToke25hbWV9YF0gPSBvcHRpb25zO1xuICAgIH1cblxuICAgIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICBpZiAob3B0aW9uLm5hbWUgPT0gJ3NjaGVtYXRpYycpIHtcbiAgICAgICAgb3B0aW9uLnR5cGUgPSAnc3Vib3B0aW9uJztcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogVCkge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcblxuICAgIGlmICghc2NoZW1hdGljTmFtZSB8fCAhY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnByaW50SGVscChvcHRpb25zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogb3B0aW9uc1snLS0nXSB8fCBbXSxcbiAgICAgIGRlYnVnOiAhIW9wdGlvbnMuZGVidWcgfHwgZmFsc2UsXG4gICAgICBkcnlSdW46ICEhb3B0aW9ucy5kcnlSdW4gfHwgZmFsc2UsXG4gICAgICBmb3JjZTogISFvcHRpb25zLmZvcmNlIHx8IGZhbHNlLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9uczogeyBzY2hlbWF0aWM/OiBzdHJpbmcgfSk6IFtzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZF0ge1xuICAgIGxldCBjb2xsZWN0aW9uTmFtZSA9IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKTtcblxuICAgIGxldCBzY2hlbWF0aWNOYW1lID0gb3B0aW9ucy5zY2hlbWF0aWM7XG5cbiAgICBpZiAoc2NoZW1hdGljTmFtZSkge1xuICAgICAgaWYgKHNjaGVtYXRpY05hbWUuaW5jbHVkZXMoJzonKSkge1xuICAgICAgICBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljTmFtZS5zcGxpdCgnOicsIDIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHByaW50SGVscChvcHRpb25zOiBUKSB7XG4gICAgYXdhaXQgc3VwZXIucHJpbnRIZWxwKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5sb2dnZXIuaW5mbygnJyk7XG4gICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuZGVzY3JpcHRpb24uc3Vib3B0aW9ucyB8fCB7fSkubGVuZ3RoID09IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYFxcblRvIHNlZSBoZWxwIGZvciBhIHNjaGVtYXRpYyBydW46YCk7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHRlcm1pbmFsLmN5YW4oYCAgbmcgZ2VuZXJhdGUgPHNjaGVtYXRpYz4gLS1oZWxwYCkpO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG59XG4iXX0=