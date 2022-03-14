"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateCommand = void 0;
const schematic_command_1 = require("../models/schematic-command");
const color_1 = require("../utilities/color");
const json_schema_1 = require("../utilities/json-schema");
class GenerateCommand extends schematic_command_1.SchematicCommand {
    async initialize(options) {
        // Fill up the schematics property of the command description.
        const [collectionName, schematicName] = await this.parseSchematicInfo(options);
        this.collectionName = collectionName;
        this.schematicName = schematicName;
        await super.initialize(options);
        const collection = this.getCollection(collectionName);
        const subcommands = {};
        const schematicNames = schematicName ? [schematicName] : collection.listSchematicNames();
        // Sort as a courtesy for the user.
        schematicNames.sort();
        for (const name of schematicNames) {
            const schematic = this.getSchematic(collection, name, true);
            this.longSchematicName = schematic.description.name;
            let subcommand;
            if (schematic.description.schemaJson) {
                subcommand = await (0, json_schema_1.parseJsonSchemaToSubCommandDescription)(name, schematic.description.path, this._workflow.registry, schematic.description.schemaJson);
            }
            else {
                continue;
            }
            if ((await this.getDefaultSchematicCollection()) == collectionName) {
                subcommands[name] = subcommand;
            }
            else {
                subcommands[`${collectionName}:${name}`] = subcommand;
            }
        }
        this.description.options.forEach((option) => {
            if (option.name == 'schematic') {
                option.subcommands = subcommands;
            }
        });
    }
    async run(options) {
        if (!this.schematicName || !this.collectionName) {
            return this.printHelp();
        }
        return this.runSchematic({
            collectionName: this.collectionName,
            schematicName: this.schematicName,
            schematicOptions: options['--'] || [],
            debug: !!options.debug || false,
            dryRun: !!options.dryRun || false,
            force: !!options.force || false,
        });
    }
    async reportAnalytics(paths, options) {
        if (!this.collectionName || !this.schematicName) {
            return;
        }
        const escapedSchematicName = (this.longSchematicName || this.schematicName).replace(/\//g, '_');
        return super.reportAnalytics(['generate', this.collectionName.replace(/\//g, '_'), escapedSchematicName], options);
    }
    async parseSchematicInfo(options) {
        let collectionName = await this.getDefaultSchematicCollection();
        let schematicName = options.schematic;
        if (schematicName && schematicName.includes(':')) {
            [collectionName, schematicName] = schematicName.split(':', 2);
        }
        return [collectionName, schematicName];
    }
    async printHelp() {
        await super.printHelp();
        this.logger.info('');
        // Find the generate subcommand.
        const subcommand = this.description.options.filter((x) => x.subcommands)[0];
        if (Object.keys((subcommand && subcommand.subcommands) || {}).length == 1) {
            this.logger.info(`\nTo see help for a schematic run:`);
            this.logger.info(color_1.colors.cyan(`  ng generate <schematic> --help`));
        }
        return 0;
    }
}
exports.GenerateCommand = GenerateCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtaW1wbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2dlbmVyYXRlLWltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBR0gsbUVBQStEO0FBQy9ELDhDQUE0QztBQUM1QywwREFBa0Y7QUFHbEYsTUFBYSxlQUFnQixTQUFRLG9DQUF1QztJQUlqRSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQTBDO1FBQ2xFLDhEQUE4RDtRQUM5RCxNQUFNLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBRW5DLE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVoQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sV0FBVyxHQUE4QyxFQUFFLENBQUM7UUFFbEUsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUN6RixtQ0FBbUM7UUFDbkMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXRCLEtBQUssTUFBTSxJQUFJLElBQUksY0FBYyxFQUFFO1lBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7WUFDcEQsSUFB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UUFFeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckIsZ0NBQWdDO1FBQ2hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUN6RSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDO1NBQ25FO1FBRUQsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUF6R0QsMENBeUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cywgU3ViQ29tbWFuZERlc2NyaXB0aW9uIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL3NjaGVtYXRpYy1jb21tYW5kJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4uL3V0aWxpdGllcy9jb2xvcic7XG5pbXBvcnQgeyBwYXJzZUpzb25TY2hlbWFUb1N1YkNvbW1hbmREZXNjcmlwdGlvbiB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgR2VuZXJhdGVDb21tYW5kU2NoZW1hIH0gZnJvbSAnLi9nZW5lcmF0ZSc7XG5cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZUNvbW1hbmQgZXh0ZW5kcyBTY2hlbWF0aWNDb21tYW5kPEdlbmVyYXRlQ29tbWFuZFNjaGVtYT4ge1xuICAvLyBBbGxvd3MgdXMgdG8gcmVzb2x2ZSBhbGlhc2VzIGJlZm9yZSByZXBvcnRpbmcgYW5hbHl0aWNzXG4gIGxvbmdTY2hlbWF0aWNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBHZW5lcmF0ZUNvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMpIHtcbiAgICAvLyBGaWxsIHVwIHRoZSBzY2hlbWF0aWNzIHByb3BlcnR5IG9mIHRoZSBjb21tYW5kIGRlc2NyaXB0aW9uLlxuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSBhd2FpdCB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhvcHRpb25zKTtcbiAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gICAgdGhpcy5zY2hlbWF0aWNOYW1lID0gc2NoZW1hdGljTmFtZTtcblxuICAgIGF3YWl0IHN1cGVyLmluaXRpYWxpemUob3B0aW9ucyk7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uID0gdGhpcy5nZXRDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBzdWJjb21tYW5kczogeyBbbmFtZTogc3RyaW5nXTogU3ViQ29tbWFuZERlc2NyaXB0aW9uIH0gPSB7fTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY05hbWVzID0gc2NoZW1hdGljTmFtZSA/IFtzY2hlbWF0aWNOYW1lXSA6IGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKCk7XG4gICAgLy8gU29ydCBhcyBhIGNvdXJ0ZXN5IGZvciB0aGUgdXNlci5cbiAgICBzY2hlbWF0aWNOYW1lcy5zb3J0KCk7XG5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygc2NoZW1hdGljTmFtZXMpIHtcbiAgICAgIGNvbnN0IHNjaGVtYXRpYyA9IHRoaXMuZ2V0U2NoZW1hdGljKGNvbGxlY3Rpb24sIG5hbWUsIHRydWUpO1xuICAgICAgdGhpcy5sb25nU2NoZW1hdGljTmFtZSA9IHNjaGVtYXRpYy5kZXNjcmlwdGlvbi5uYW1lO1xuICAgICAgbGV0IHN1YmNvbW1hbmQ6IFN1YkNvbW1hbmREZXNjcmlwdGlvbjtcbiAgICAgIGlmIChzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbikge1xuICAgICAgICBzdWJjb21tYW5kID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9TdWJDb21tYW5kRGVzY3JpcHRpb24oXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24ucGF0aCxcbiAgICAgICAgICB0aGlzLl93b3JrZmxvdy5yZWdpc3RyeSxcbiAgICAgICAgICBzY2hlbWF0aWMuZGVzY3JpcHRpb24uc2NoZW1hSnNvbixcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoKGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKSkgPT0gY29sbGVjdGlvbk5hbWUpIHtcbiAgICAgICAgc3ViY29tbWFuZHNbbmFtZV0gPSBzdWJjb21tYW5kO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViY29tbWFuZHNbYCR7Y29sbGVjdGlvbk5hbWV9OiR7bmFtZX1gXSA9IHN1YmNvbW1hbmQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5kZXNjcmlwdGlvbi5vcHRpb25zLmZvckVhY2goKG9wdGlvbikgPT4ge1xuICAgICAgaWYgKG9wdGlvbi5uYW1lID09ICdzY2hlbWF0aWMnKSB7XG4gICAgICAgIG9wdGlvbi5zdWJjb21tYW5kcyA9IHN1YmNvbW1hbmRzO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJ1bihvcHRpb25zOiBHZW5lcmF0ZUNvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMpIHtcbiAgICBpZiAoIXRoaXMuc2NoZW1hdGljTmFtZSB8fCAhdGhpcy5jb2xsZWN0aW9uTmFtZSkge1xuICAgICAgcmV0dXJuIHRoaXMucHJpbnRIZWxwKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lOiB0aGlzLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZTogdGhpcy5zY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9uczogb3B0aW9uc1snLS0nXSB8fCBbXSxcbiAgICAgIGRlYnVnOiAhIW9wdGlvbnMuZGVidWcgfHwgZmFsc2UsXG4gICAgICBkcnlSdW46ICEhb3B0aW9ucy5kcnlSdW4gfHwgZmFsc2UsXG4gICAgICBmb3JjZTogISFvcHRpb25zLmZvcmNlIHx8IGZhbHNlLFxuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgYXN5bmMgcmVwb3J0QW5hbHl0aWNzKFxuICAgIHBhdGhzOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBHZW5lcmF0ZUNvbW1hbmRTY2hlbWEgJiBBcmd1bWVudHMsXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5jb2xsZWN0aW9uTmFtZSB8fCAhdGhpcy5zY2hlbWF0aWNOYW1lKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGVzY2FwZWRTY2hlbWF0aWNOYW1lID0gKHRoaXMubG9uZ1NjaGVtYXRpY05hbWUgfHwgdGhpcy5zY2hlbWF0aWNOYW1lKS5yZXBsYWNlKC9cXC8vZywgJ18nKTtcblxuICAgIHJldHVybiBzdXBlci5yZXBvcnRBbmFseXRpY3MoXG4gICAgICBbJ2dlbmVyYXRlJywgdGhpcy5jb2xsZWN0aW9uTmFtZS5yZXBsYWNlKC9cXC8vZywgJ18nKSwgZXNjYXBlZFNjaGVtYXRpY05hbWVdLFxuICAgICAgb3B0aW9ucyxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgb3B0aW9uczogR2VuZXJhdGVDb21tYW5kU2NoZW1hLFxuICApOiBQcm9taXNlPFtzdHJpbmcsIHN0cmluZyB8IHVuZGVmaW5lZF0+IHtcbiAgICBsZXQgY29sbGVjdGlvbk5hbWUgPSBhd2FpdCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCk7XG5cbiAgICBsZXQgc2NoZW1hdGljTmFtZSA9IG9wdGlvbnMuc2NoZW1hdGljO1xuXG4gICAgaWYgKHNjaGVtYXRpY05hbWUgJiYgc2NoZW1hdGljTmFtZS5pbmNsdWRlcygnOicpKSB7XG4gICAgICBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljTmFtZS5zcGxpdCgnOicsIDIpO1xuICAgIH1cblxuICAgIHJldHVybiBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdO1xuICB9XG5cbiAgcHVibGljIG92ZXJyaWRlIGFzeW5jIHByaW50SGVscCgpIHtcbiAgICBhd2FpdCBzdXBlci5wcmludEhlbHAoKTtcblxuICAgIHRoaXMubG9nZ2VyLmluZm8oJycpO1xuICAgIC8vIEZpbmQgdGhlIGdlbmVyYXRlIHN1YmNvbW1hbmQuXG4gICAgY29uc3Qgc3ViY29tbWFuZCA9IHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5maWx0ZXIoKHgpID0+IHguc3ViY29tbWFuZHMpWzBdO1xuICAgIGlmIChPYmplY3Qua2V5cygoc3ViY29tbWFuZCAmJiBzdWJjb21tYW5kLnN1YmNvbW1hbmRzKSB8fCB7fSkubGVuZ3RoID09IDEpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYFxcblRvIHNlZSBoZWxwIGZvciBhIHNjaGVtYXRpYyBydW46YCk7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKGNvbG9ycy5jeWFuKGAgIG5nIGdlbmVyYXRlIDxzY2hlbWF0aWM+IC0taGVscGApKTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIl19