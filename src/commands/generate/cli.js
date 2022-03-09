"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateCommandModule = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_command_module_1 = require("../../command-builder/schematics-command-module");
const generate_impl_1 = require("./generate-impl");
class GenerateCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    constructor() {
        super(...arguments);
        this.command = 'generate [schematic]';
        this.aliases = 'g';
        this.describe = 'Generates and/or modifies files based on a schematic.';
    }
    async builder(argv) {
        const [, schematicNameFromArgs] = this.parseSchematicInfo(
        // positional = [generate, component] or [generate]
        this.context.args.positional[1]);
        const baseYargs = await super.builder(argv);
        if (this.schematicName) {
            return baseYargs;
        }
        // When we do know the schematic name we need to add the 'schematic'
        // positional option as the schematic will be accessable as a subcommand.
        let localYargs = schematicNameFromArgs
            ? baseYargs
            : baseYargs.positional('schematic', {
                describe: 'The schematic or collection:schematic to generate.',
                type: 'string',
                demandOption: true,
            });
        const collectionName = await this.getCollectionName();
        const workflow = this.getOrCreateWorkflow(collectionName);
        const collection = workflow.engine.createCollection(collectionName);
        const schematicsInCollection = collection.description.schematics;
        // We cannot use `collection.listSchematicNames()` as this doesn't return hidden schematics.
        const schematicNames = new Set(Object.keys(schematicsInCollection).sort());
        if (schematicNameFromArgs && schematicNames.has(schematicNameFromArgs)) {
            // No need to process all schematics since we know which one the user invoked.
            schematicNames.clear();
            schematicNames.add(schematicNameFromArgs);
        }
        for (const schematicName of schematicNames) {
            const { description: { schemaJson, aliases: schematicAliases, hidden: schematicHidden }, } = collection.createSchematic(schematicName, true);
            if (!schemaJson) {
                continue;
            }
            const { description, 'x-deprecated': xDeprecated, aliases = schematicAliases, hidden = schematicHidden, } = schemaJson;
            const options = await this.getSchematicOptions(collection, schematicName, workflow);
            localYargs = localYargs.command({
                command: await this.generateCommandString(collectionName, schematicName, options),
                // When 'describe' is set to false, it results in a hidden command.
                describe: hidden === true ? false : typeof description === 'string' ? description : '',
                deprecated: xDeprecated === true || typeof xDeprecated === 'string' ? xDeprecated : false,
                aliases: Array.isArray(aliases) ? aliases : undefined,
                builder: (localYargs) => this.addSchemaOptionsToCommand(localYargs, options).strict(),
                handler: (options) => this.handler({ ...options, schematic: `${collectionName}:${schematicName}` }),
            });
        }
        return localYargs;
    }
    run(options) {
        const command = new generate_impl_1.GenerateCommand(this.context, 'generate');
        return command.validateAndRun(options);
    }
    /**
     * Generate a command string to be passed to the command builder.
     *
     * @example `component [name]` or `@schematics/angular:component [name]`.
     */
    async generateCommandString(collectionName, schematicName, options) {
        const [collectionNameFromArgs] = this.parseSchematicInfo(
        // positional = [generate, component] or [generate]
        this.context.args.positional[1]);
        const dasherizedSchematicName = core_1.strings.dasherize(schematicName);
        // Only add the collection name as part of the command when it's not the default collection or when it has been provided via the CLI.
        // Ex:`ng generate @schematics/angular:component`
        const commandName = !!collectionNameFromArgs ||
            (await this.getDefaultSchematicCollection()) !== (await this.getCollectionName())
            ? collectionName + ':' + dasherizedSchematicName
            : dasherizedSchematicName;
        const positionalArgs = options
            .filter((o) => o.positional !== undefined)
            .map((o) => {
            const label = `${core_1.strings.dasherize(o.name)}${o.type === 'array' ? ' ..' : ''}`;
            return o.required ? `<${label}>` : `[${label}]`;
        })
            .join(' ');
        return `${commandName}${positionalArgs ? ' ' + positionalArgs : ''}`;
    }
}
exports.GenerateCommandModule = GenerateCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2dlbmVyYXRlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBK0M7QUFPL0MsK0ZBR3lEO0FBRXpELG1EQUFrRDtBQU1sRCxNQUFhLHFCQUNYLFNBQVEsbURBQXVCO0lBRGpDOztRQUlFLFlBQU8sR0FBRyxzQkFBc0IsQ0FBQztRQUNqQyxZQUFPLEdBQUcsR0FBRyxDQUFDO1FBQ2QsYUFBUSxHQUFHLHVEQUF1RCxDQUFDO0lBa0hyRSxDQUFDO0lBL0dVLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVTtRQUMvQixNQUFNLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0I7UUFDdkQsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FDaEMsQ0FBQztRQUVGLE1BQU0sU0FBUyxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdEIsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFFRCxvRUFBb0U7UUFDcEUseUVBQXlFO1FBQ3pFLElBQUksVUFBVSxHQUFHLHFCQUFxQjtZQUNwQyxDQUFDLENBQUMsU0FBUztZQUNYLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRTtnQkFDaEMsUUFBUSxFQUFFLG9EQUFvRDtnQkFDOUQsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsWUFBWSxFQUFFLElBQUk7YUFDbkIsQ0FBQyxDQUFDO1FBRVAsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FB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InNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgU2NoZW1hdGljc0NvbW1hbmRBcmdzLFxuICBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZSxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3NjaGVtYXRpY3MtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBHZW5lcmF0ZUNvbW1hbmQgfSBmcm9tICcuL2dlbmVyYXRlLWltcGwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlQ29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBzY2hlbWF0aWM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZUNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxHZW5lcmF0ZUNvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2dlbmVyYXRlIFtzY2hlbWF0aWNdJztcbiAgYWxpYXNlcyA9ICdnJztcbiAgZGVzY3JpYmUgPSAnR2VuZXJhdGVzIGFuZC9vciBtb2RpZmllcyBmaWxlcyBiYXNlZCBvbiBhIHNjaGVtYXRpYy4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxHZW5lcmF0ZUNvbW1hbmRBcmdzPj4ge1xuICAgIGNvbnN0IFssIHNjaGVtYXRpY05hbWVGcm9tQXJnc10gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgY29uc3QgYmFzZVlhcmdzID0gYXdhaXQgc3VwZXIuYnVpbGRlcihhcmd2KTtcbiAgICBpZiAodGhpcy5zY2hlbWF0aWNOYW1lKSB7XG4gICAgICByZXR1cm4gYmFzZVlhcmdzO1xuICAgIH1cblxuICAgIC8vIFdoZW4gd2UgZG8ga25vdyB0aGUgc2NoZW1hdGljIG5hbWUgd2UgbmVlZCB0byBhZGQgdGhlICdzY2hlbWF0aWMnXG4gICAgLy8gcG9zaXRpb25hbCBvcHRpb24gYXMgdGhlIHNjaGVtYXRpYyB3aWxsIGJlIGFjY2Vzc2FibGUgYXMgYSBzdWJjb21tYW5kLlxuICAgIGxldCBsb2NhbFlhcmdzID0gc2NoZW1hdGljTmFtZUZyb21BcmdzXG4gICAgICA/IGJhc2VZYXJnc1xuICAgICAgOiBiYXNlWWFyZ3MucG9zaXRpb25hbCgnc2NoZW1hdGljJywge1xuICAgICAgICAgIGRlc2NyaWJlOiAnVGhlIHNjaGVtYXRpYyBvciBjb2xsZWN0aW9uOnNjaGVtYXRpYyB0byBnZW5lcmF0ZS4nLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbk5hbWUoKTtcbiAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvdyhjb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBzY2hlbWF0aWNzSW5Db2xsZWN0aW9uID0gY29sbGVjdGlvbi5kZXNjcmlwdGlvbi5zY2hlbWF0aWNzO1xuXG4gICAgLy8gV2UgY2Fubm90IHVzZSBgY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKWAgYXMgdGhpcyBkb2Vzbid0IHJldHVybiBoaWRkZW4gc2NoZW1hdGljcy5cbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lcyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoc2NoZW1hdGljc0luQ29sbGVjdGlvbikuc29ydCgpKTtcblxuICAgIGlmIChzY2hlbWF0aWNOYW1lRnJvbUFyZ3MgJiYgc2NoZW1hdGljTmFtZXMuaGFzKHNjaGVtYXRpY05hbWVGcm9tQXJncykpIHtcbiAgICAgIC8vIE5vIG5lZWQgdG8gcHJvY2VzcyBhbGwgc2NoZW1hdGljcyBzaW5jZSB3ZSBrbm93IHdoaWNoIG9uZSB0aGUgdXNlciBpbnZva2VkLlxuICAgICAgc2NoZW1hdGljTmFtZXMuY2xlYXIoKTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmFkZChzY2hlbWF0aWNOYW1lRnJvbUFyZ3MpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc2NoZW1hdGljTmFtZSBvZiBzY2hlbWF0aWNOYW1lcykge1xuICAgICAgY29uc3Qge1xuICAgICAgICBkZXNjcmlwdGlvbjogeyBzY2hlbWFKc29uLCBhbGlhc2VzOiBzY2hlbWF0aWNBbGlhc2VzLCBoaWRkZW46IHNjaGVtYXRpY0hpZGRlbiB9LFxuICAgICAgfSA9IGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIHRydWUpO1xuXG4gICAgICBpZiAoIXNjaGVtYUpzb24pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICd4LWRlcHJlY2F0ZWQnOiB4RGVwcmVjYXRlZCxcbiAgICAgICAgYWxpYXNlcyA9IHNjaGVtYXRpY0FsaWFzZXMsXG4gICAgICAgIGhpZGRlbiA9IHNjaGVtYXRpY0hpZGRlbixcbiAgICAgIH0gPSBzY2hlbWFKc29uO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljT3B0aW9ucyhjb2xsZWN0aW9uLCBzY2hlbWF0aWNOYW1lLCB3b3JrZmxvdyk7XG5cbiAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLmNvbW1hbmQoe1xuICAgICAgICBjb21tYW5kOiBhd2FpdCB0aGlzLmdlbmVyYXRlQ29tbWFuZFN0cmluZyhjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZSwgb3B0aW9ucyksXG4gICAgICAgIC8vIFdoZW4gJ2Rlc2NyaWJlJyBpcyBzZXQgdG8gZmFsc2UsIGl0IHJlc3VsdHMgaW4gYSBoaWRkZW4gY29tbWFuZC5cbiAgICAgICAgZGVzY3JpYmU6IGhpZGRlbiA9PT0gdHJ1ZSA/IGZhbHNlIDogdHlwZW9mIGRlc2NyaXB0aW9uID09PSAnc3RyaW5nJyA/IGRlc2NyaXB0aW9uIDogJycsXG4gICAgICAgIGRlcHJlY2F0ZWQ6IHhEZXByZWNhdGVkID09PSB0cnVlIHx8IHR5cGVvZiB4RGVwcmVjYXRlZCA9PT0gJ3N0cmluZycgPyB4RGVwcmVjYXRlZCA6IGZhbHNlLFxuICAgICAgICBhbGlhc2VzOiBBcnJheS5pc0FycmF5KGFsaWFzZXMpID8gKGFsaWFzZXMgYXMgc3RyaW5nW10pIDogdW5kZWZpbmVkLFxuICAgICAgICBidWlsZGVyOiAobG9jYWxZYXJncykgPT4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIG9wdGlvbnMpLnN0cmljdCgpLFxuICAgICAgICBoYW5kbGVyOiAob3B0aW9ucykgPT5cbiAgICAgICAgICB0aGlzLmhhbmRsZXIoeyAuLi5vcHRpb25zLCBzY2hlbWF0aWM6IGAke2NvbGxlY3Rpb25OYW1lfToke3NjaGVtYXRpY05hbWV9YCB9KSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzO1xuICB9XG5cbiAgcnVuKFxuICAgIG9wdGlvbnM6IE9wdGlvbnM8R2VuZXJhdGVDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMsXG4gICk6IG51bWJlciB8IHZvaWQgfCBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdlbmVyYXRlQ29tbWFuZCh0aGlzLmNvbnRleHQsICdnZW5lcmF0ZScpO1xuXG4gICAgcmV0dXJuIGNvbW1hbmQudmFsaWRhdGVBbmRSdW4ob3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBjb21tYW5kIHN0cmluZyB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbW1hbmQgYnVpbGRlci5cbiAgICpcbiAgICogQGV4YW1wbGUgYGNvbXBvbmVudCBbbmFtZV1gIG9yIGBAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCBbbmFtZV1gLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUNvbW1hbmRTdHJpbmcoXG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZyxcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogT3B0aW9uW10sXG4gICk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lRnJvbUFyZ3NdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgICAvLyBwb3NpdGlvbmFsID0gW2dlbmVyYXRlLCBjb21wb25lbnRdIG9yIFtnZW5lcmF0ZV1cbiAgICAgIHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWxbMV0sXG4gICAgKTtcblxuICAgIGNvbnN0IGRhc2hlcml6ZWRTY2hlbWF0aWNOYW1lID0gc3RyaW5ncy5kYXNoZXJpemUoc2NoZW1hdGljTmFtZSk7XG5cbiAgICAvLyBPbmx5IGFkZCB0aGUgY29sbGVjdGlvbiBuYW1lIGFzIHBhcnQgb2YgdGhlIGNvbW1hbmQgd2hlbiBpdCdzIG5vdCB0aGUgZGVmYXVsdCBjb2xsZWN0aW9uIG9yIHdoZW4gaXQgaGFzIGJlZW4gcHJvdmlkZWQgdmlhIHRoZSBDTEkuXG4gICAgLy8gRXg6YG5nIGdlbmVyYXRlIEBzY2hlbWF0aWNzL2FuZ3VsYXI6Y29tcG9uZW50YFxuICAgIGNvbnN0IGNvbW1hbmROYW1lID1cbiAgICAgICEhY29sbGVjdGlvbk5hbWVGcm9tQXJncyB8fFxuICAgICAgKGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKSkgIT09IChhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCkpXG4gICAgICAgID8gY29sbGVjdGlvbk5hbWUgKyAnOicgKyBkYXNoZXJpemVkU2NoZW1hdGljTmFtZVxuICAgICAgICA6IGRhc2hlcml6ZWRTY2hlbWF0aWNOYW1lO1xuXG4gICAgY29uc3QgcG9zaXRpb25hbEFyZ3MgPSBvcHRpb25zXG4gICAgICAuZmlsdGVyKChvKSA9PiBvLnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZClcbiAgICAgIC5tYXAoKG8pID0+IHtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtzdHJpbmdzLmRhc2hlcml6ZShvLm5hbWUpfSR7by50eXBlID09PSAnYXJyYXknID8gJyAuLicgOiAnJ31gO1xuXG4gICAgICAgIHJldHVybiBvLnJlcXVpcmVkID8gYDwke2xhYmVsfT5gIDogYFske2xhYmVsfV1gO1xuICAgICAgfSlcbiAgICAgIC5qb2luKCcgJyk7XG5cbiAgICByZXR1cm4gYCR7Y29tbWFuZE5hbWV9JHtwb3NpdGlvbmFsQXJncyA/ICcgJyArIHBvc2l0aW9uYWxBcmdzIDogJyd9YDtcbiAgfVxufVxuIl19