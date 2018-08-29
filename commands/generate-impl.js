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
            schematicOptions: this.removeLocalOptions(options),
            debug: options.debug,
            dryRun: options.dryRun,
            force: options.force,
            interactive: options.interactive,
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
    removeLocalOptions(options) {
        const opts = Object.assign({}, options);
        delete opts.interactive;
        return opts;
    }
}
exports.GenerateCommand = GenerateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvYW5ndWxhci9jbGkvY29tbWFuZHMvZ2VuZXJhdGUtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELCtDQUFzRDtBQUN0RCxtRUFBK0Q7QUFHL0QscUJBQTZCLFNBQVEsb0NBQWdCO0lBQXJEOztRQUNVLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBMkY5QixDQUFDO0lBMUZjLFVBQVUsQ0FBQyxPQUFZOzs7WUFDbEMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNwQixPQUFPO2FBQ1I7WUFDRCxNQUFNLG9CQUFnQixZQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1lBRXhCLE1BQU0sQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pFLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRTtnQkFDbkIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUM7b0JBQzdDLGFBQWE7b0JBQ2IsY0FBYztpQkFDZixDQUFDLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ25DO1FBQ0gsQ0FBQztLQUFBO0lBRUQsUUFBUSxDQUFDLE9BQVk7UUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7WUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTs7O3lDQUdLLENBQUMsQ0FBQztZQUVyQyxPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU0sR0FBRyxDQUFDLE9BQVk7UUFDckIsTUFBTSxDQUFD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T0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBRXhCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBNUZELDBDQTRGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIG5vLWFueVxuaW1wb3J0IHsgdGFncywgdGVybWluYWwgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcblxuXG5leHBvcnQgY2xhc3MgR2VuZXJhdGVDb21tYW5kIGV4dGVuZHMgU2NoZW1hdGljQ29tbWFuZCB7XG4gIHByaXZhdGUgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogYW55KSB7XG4gICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcbiAgICBpZiAoISFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICBjb25zdCBzY2hlbWF0aWNPcHRpb25zID0gYXdhaXQgdGhpcy5nZXRPcHRpb25zKHtcbiAgICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICB9KTtcbiAgICAgIHRoaXMuYWRkT3B0aW9ucyhzY2hlbWF0aWNPcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICB2YWxpZGF0ZShvcHRpb25zOiBhbnkpOiBib29sZWFuIHwgUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCFvcHRpb25zLnNjaGVtYXRpYykge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICBUaGUgXCJuZyBnZW5lcmF0ZVwiIGNvbW1hbmQgcmVxdWlyZXMgYVxuICAgICAgICBzY2hlbWF0aWMgbmFtZSB0byBiZSBzcGVjaWZpZWQuXG4gICAgICAgIEZvciBtb3JlIGRldGFpbHMsIHVzZSBcIm5nIGhlbHBcIi5gKTtcblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHVibGljIHJ1bihvcHRpb25zOiBhbnkpIHtcbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9ucyk7XG5cbiAgICAvLyByZW1vdmUgdGhlIHNjaGVtYXRpYyBuYW1lIGZyb20gdGhlIG9wdGlvbnNcbiAgICBkZWxldGUgb3B0aW9ucy5zY2hlbWF0aWM7XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogdGhpcy5yZW1vdmVMb2NhbE9wdGlvbnMob3B0aW9ucyksXG4gICAgICBkZWJ1Zzogb3B0aW9ucy5kZWJ1ZyxcbiAgICAgIGRyeVJ1bjogb3B0aW9ucy5kcnlSdW4sXG4gICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgIGludGVyYWN0aXZlOiBvcHRpb25zLmludGVyYWN0aXZlLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZVNjaGVtYXRpY0luZm8ob3B0aW9uczogYW55KSB7XG4gICAgbGV0IGNvbGxlY3Rpb25OYW1lID0gdGhpcy5nZXREZWZhdWx0U2NoZW1hdGljQ29sbGVjdGlvbigpO1xuXG4gICAgbGV0IHNjaGVtYXRpY05hbWU6IHN0cmluZyA9IG9wdGlvbnMuc2NoZW1hdGljO1xuXG4gICAgaWYgKHNjaGVtYXRpY05hbWUpIHtcbiAgICAgIGlmIChzY2hlbWF0aWNOYW1lLmluY2x1ZGVzKCc6JykpIHtcbiAgICAgICAgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpY05hbWUuc3BsaXQoJzonLCAyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXTtcbiAgfVxuXG4gIHB1YmxpYyBwcmludEhlbHAoX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIG9wdGlvbnM6IGFueSkge1xuICAgIGNvbnN0IHNjaGVtYXRpY05hbWUgPSBvcHRpb25zLl9bMF07XG4gICAgaWYgKHNjaGVtYXRpY05hbWUpIHtcbiAgICAgIGNvbnN0IG9wdHNXaXRob3V0U2NoZW1hdGljID0gdGhpcy5vcHRpb25zXG4gICAgICAgIC5maWx0ZXIobyA9PiAhKG8ubmFtZSA9PT0gJ3NjaGVtYXRpYycgJiYgdGhpcy5pc0FyZ3VtZW50KG8pKSk7XG4gICAgICB0aGlzLnByaW50SGVscFVzYWdlKGBnZW5lcmF0ZSAke3NjaGVtYXRpY05hbWV9YCwgb3B0c1dpdGhvdXRTY2hlbWF0aWMpO1xuICAgICAgdGhpcy5wcmludEhlbHBPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucHJpbnRIZWxwVXNhZ2UoJ2dlbmVyYXRlJywgdGhpcy5vcHRpb25zKTtcbiAgICAgIGNvbnN0IGVuZ2luZUhvc3QgPSB0aGlzLmdldEVuZ2luZUhvc3QoKTtcbiAgICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLmdldENvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3Qgc2NoZW1hdGljTmFtZXM6IHN0cmluZ1tdID0gZW5naW5lSG9zdC5saXN0U2NoZW1hdGljTmFtZXMoY29sbGVjdGlvbi5kZXNjcmlwdGlvbik7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKCdBdmFpbGFibGUgc2NoZW1hdGljczonKTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmZvckVhY2goc2NoZW1hdGljTmFtZSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYCAgICAke3NjaGVtYXRpY05hbWV9YCk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIud2FybihgXFxuVG8gc2VlIGhlbHAgZm9yIGEgc2NoZW1hdGljIHJ1bjpgKTtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8odGVybWluYWwuY3lhbihgICBuZyBnZW5lcmF0ZSA8c2NoZW1hdGljPiAtLWhlbHBgKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVMb2NhbE9wdGlvbnMob3B0aW9uczogYW55KTogYW55IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG4gICAgZGVsZXRlIG9wdHMuaW50ZXJhY3RpdmU7XG5cbiAgICByZXR1cm4gb3B0cztcbiAgfVxufVxuIl19