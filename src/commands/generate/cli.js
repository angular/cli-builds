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
const command_1 = require("../../command-builder/utilities/command");
class GenerateCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    constructor() {
        super(...arguments);
        this.command = 'generate';
        this.aliases = 'g';
        this.describe = 'Generates and/or modifies files based on a schematic.';
    }
    async builder(argv) {
        let localYargs = (await super.builder(argv)).command({
            command: '$0 <schematic>',
            describe: 'Run the provided schematic.',
            builder: (localYargs) => localYargs
                .positional('schematic', {
                describe: 'The [collection:schematic] to run.',
                type: 'string',
                demandOption: true,
            })
                .strict(),
            handler: (options) => this.handler(options),
        });
        const collectionName = await this.getCollectionName();
        const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
        const collection = workflow.engine.createCollection(collectionName);
        const schematicsInCollection = collection.description.schematics;
        // We cannot use `collection.listSchematicNames()` as this doesn't return hidden schematics.
        const schematicNames = new Set(Object.keys(schematicsInCollection).sort());
        const [, schematicNameFromArgs] = this.parseSchematicInfo(
        // positional = [generate, component] or [generate]
        this.context.args.positional[1]);
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
        return localYargs.demandCommand(1, command_1.demandCommandFailureMessage);
    }
    async run(options) {
        const { dryRun, schematic, defaults, force, interactive, ...schematicOptions } = options;
        const [collectionName = await this.getCollectionName(), schematicName = ''] = this.parseSchematicInfo(schematic);
        return this.runSchematic({
            collectionName,
            schematicName,
            schematicOptions,
            executionOptions: {
                dryRun,
                defaults,
                force,
                interactive,
            },
        });
    }
    async getCollectionName() {
        const [collectionName = await this.getDefaultSchematicCollection()] = this.parseSchematicInfo(
        // positional = [generate, component] or [generate]
        this.context.args.positional[1]);
        return collectionName;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2dlbmVyYXRlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBK0M7QUFPL0MsK0ZBR3lEO0FBQ3pELHFFQUFzRjtBQU90RixNQUFhLHFCQUNYLFNBQVEsbURBQXVCO0lBRGpDOztRQUlFLFlBQU8sR0FBRyxVQUFVLENBQUM7UUFDckIsWUFBTyxHQUFHLEdBQUcsQ0FBQztRQUNkLGFBQVEsR0FBRyx1REFBdUQsQ0FBQztJQW9JckUsQ0FBQztJQWpJVSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDL0IsSUFBSSxVQUFVLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQXNCO1lBQ3hFLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsUUFBUSxFQUFFLDZCQUE2QjtZQUN2QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUN0QixVQUFVO2lCQUNQLFVBQVUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3ZCLFFBQVEsRUFBRSxvQ0FBb0M7Z0JBQzlDLElBQUksRUFBRSxRQUFRO2dCQUNkLFlBQVksRUFBRSxJQUFJO2FBQ25CLENBQUM7aUJBQ0QsTUFBTSxFQUFFO1lBQ2IsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUM1QyxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxD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QjtZQUNoRCxDQUFDLENBQUMsdUJBQXVCLENBQUM7UUFFOUIsTUFBTSxjQUFjLEdBQUcsT0FBTzthQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDO2FBQ3pDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ1QsTUFBTSxLQUFLLEdBQUcsR0FBRyxjQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUUvRSxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLENBQUM7UUFDbEQsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRWIsT0FBTyxHQUFHLFdBQVcsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0lBQ3ZFLENBQUM7Q0FDRjtBQTFJRCxzREEwSUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuaW50ZXJmYWNlIEdlbmVyYXRlQ29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBzY2hlbWF0aWM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZUNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxHZW5lcmF0ZUNvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2dlbmVyYXRlJztcbiAgYWxpYXNlcyA9ICdnJztcbiAgZGVzY3JpYmUgPSAnR2VuZXJhdGVzIGFuZC9vciBtb2RpZmllcyBmaWxlcyBiYXNlZCBvbiBhIHNjaGVtYXRpYy4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxHZW5lcmF0ZUNvbW1hbmRBcmdzPj4ge1xuICAgIGxldCBsb2NhbFlhcmdzID0gKGF3YWl0IHN1cGVyLmJ1aWxkZXIoYXJndikpLmNvbW1hbmQ8R2VuZXJhdGVDb21tYW5kQXJncz4oe1xuICAgICAgY29tbWFuZDogJyQwIDxzY2hlbWF0aWM+JyxcbiAgICAgIGRlc2NyaWJlOiAnUnVuIHRoZSBwcm92aWRlZCBzY2hlbWF0aWMuJyxcbiAgICAgIGJ1aWxkZXI6IChsb2NhbFlhcmdzKSA9PlxuICAgICAgICBsb2NhbFlhcmdzXG4gICAgICAgICAgLnBvc2l0aW9uYWwoJ3NjaGVtYXRpYycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnVGhlIFtjb2xsZWN0aW9uOnNjaGVtYXRpY10gdG8gcnVuLicsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHJpY3QoKSxcbiAgICAgIGhhbmRsZXI6IChvcHRpb25zKSA9PiB0aGlzLmhhbmRsZXIob3B0aW9ucyksXG4gICAgfSk7XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbk5hbWUoKTtcbiAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWUpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3Qgc2NoZW1hdGljc0luQ29sbGVjdGlvbiA9IGNvbGxlY3Rpb24uZGVzY3JpcHRpb24uc2NoZW1hdGljcztcblxuICAgIC8vIFdlIGNhbm5vdCB1c2UgYGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKClgIGFzIHRoaXMgZG9lc24ndCByZXR1cm4gaGlkZGVuIHNjaGVtYXRpY3MuXG4gICAgY29uc3Qgc2NoZW1hdGljTmFtZXMgPSBuZXcgU2V0KE9iamVjdC5rZXlzKHNjaGVtYXRpY3NJbkNvbGxlY3Rpb24pLnNvcnQoKSk7XG4gICAgY29uc3QgWywgc2NoZW1hdGljTmFtZUZyb21BcmdzXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICBpZiAoc2NoZW1hdGljTmFtZUZyb21BcmdzICYmIHNjaGVtYXRpY05hbWVzLmhhcyhzY2hlbWF0aWNOYW1lRnJvbUFyZ3MpKSB7XG4gICAgICAvLyBObyBuZWVkIHRvIHByb2Nlc3MgYWxsIHNjaGVtYXRpY3Mgc2luY2Ugd2Uga25vdyB3aGljaCBvbmUgdGhlIHVzZXIgaW52b2tlZC5cbiAgICAgIHNjaGVtYXRpY05hbWVzLmNsZWFyKCk7XG4gICAgICBzY2hlbWF0aWNOYW1lcy5hZGQoc2NoZW1hdGljTmFtZUZyb21BcmdzKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHNjaGVtYXRpY05hbWUgb2Ygc2NoZW1hdGljTmFtZXMpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHsgc2NoZW1hSnNvbiwgYWxpYXNlczogc2NoZW1hdGljQWxpYXNlcywgaGlkZGVuOiBzY2hlbWF0aWNIaWRkZW4gfSxcbiAgICAgIH0gPSBjb2xsZWN0aW9uLmNyZWF0ZVNjaGVtYXRpYyhzY2hlbWF0aWNOYW1lLCB0cnVlKTtcblxuICAgICAgaWYgKCFzY2hlbWFKc29uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAneC1kZXByZWNhdGVkJzogeERlcHJlY2F0ZWQsXG4gICAgICAgIGFsaWFzZXMgPSBzY2hlbWF0aWNBbGlhc2VzLFxuICAgICAgICBoaWRkZW4gPSBzY2hlbWF0aWNIaWRkZW4sXG4gICAgICB9ID0gc2NoZW1hSnNvbjtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbiwgc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5jb21tYW5kKHtcbiAgICAgICAgY29tbWFuZDogYXdhaXQgdGhpcy5nZW5lcmF0ZUNvbW1hbmRTdHJpbmcoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIG9wdGlvbnMpLFxuICAgICAgICAvLyBXaGVuICdkZXNjcmliZScgaXMgc2V0IHRvIGZhbHNlLCBpdCByZXN1bHRzIGluIGEgaGlkZGVuIGNvbW1hbmQuXG4gICAgICAgIGRlc2NyaWJlOiBoaWRkZW4gPT09IHRydWUgPyBmYWxzZSA6IHR5cGVvZiBkZXNjcmlwdGlvbiA9PT0gJ3N0cmluZycgPyBkZXNjcmlwdGlvbiA6ICcnLFxuICAgICAgICBkZXByZWNhdGVkOiB4RGVwcmVjYXRlZCA9PT0gdHJ1ZSB8fCB0eXBlb2YgeERlcHJlY2F0ZWQgPT09ICdzdHJpbmcnID8geERlcHJlY2F0ZWQgOiBmYWxzZSxcbiAgICAgICAgYWxpYXNlczogQXJyYXkuaXNBcnJheShhbGlhc2VzKSA/IChhbGlhc2VzIGFzIHN0cmluZ1tdKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgYnVpbGRlcjogKGxvY2FsWWFyZ3MpID0+IHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBvcHRpb25zKS5zdHJpY3QoKSxcbiAgICAgICAgaGFuZGxlcjogKG9wdGlvbnMpID0+XG4gICAgICAgICAgdGhpcy5oYW5kbGVyKHsgLi4ub3B0aW9ucywgc2NoZW1hdGljOiBgJHtjb2xsZWN0aW9uTmFtZX06JHtzY2hlbWF0aWNOYW1lfWAgfSksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncy5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxHZW5lcmF0ZUNvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgZHJ5UnVuLCBzY2hlbWF0aWMsIGRlZmF1bHRzLCBmb3JjZSwgaW50ZXJhY3RpdmUsIC4uLnNjaGVtYXRpY09wdGlvbnMgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUgPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCksIHNjaGVtYXRpY05hbWUgPSAnJ10gPVxuICAgICAgdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8oc2NoZW1hdGljKTtcblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgZXhlY3V0aW9uT3B0aW9uczoge1xuICAgICAgICBkcnlSdW4sXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBmb3JjZSxcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSA9IGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgY29tbWFuZCBzdHJpbmcgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb21tYW5kIGJ1aWxkZXIuXG4gICAqXG4gICAqIEBleGFtcGxlIGBjb21wb25lbnQgW25hbWVdYCBvciBgQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQgW25hbWVdYC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVDb21tYW5kU3RyaW5nKFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IE9wdGlvbltdLFxuICApOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZUZyb21BcmdzXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICBjb25zdCBkYXNoZXJpemVkU2NoZW1hdGljTmFtZSA9IHN0cmluZ3MuZGFzaGVyaXplKHNjaGVtYXRpY05hbWUpO1xuXG4gICAgLy8gT25seSBhZGQgdGhlIGNvbGxlY3Rpb24gbmFtZSBhcyBwYXJ0IG9mIHRoZSBjb21tYW5kIHdoZW4gaXQncyBub3QgdGhlIGRlZmF1bHQgY29sbGVjdGlvbiBvciB3aGVuIGl0IGhhcyBiZWVuIHByb3ZpZGVkIHZpYSB0aGUgQ0xJLlxuICAgIC8vIEV4OmBuZyBnZW5lcmF0ZSBAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudGBcbiAgICBjb25zdCBjb21tYW5kTmFtZSA9XG4gICAgICAhIWNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgfHxcbiAgICAgIChhd2FpdCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCkpICE9PSAoYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZSgpKVxuICAgICAgICA/IGNvbGxlY3Rpb25OYW1lICsgJzonICsgZGFzaGVyaXplZFNjaGVtYXRpY05hbWVcbiAgICAgICAgOiBkYXNoZXJpemVkU2NoZW1hdGljTmFtZTtcblxuICAgIGNvbnN0IHBvc2l0aW9uYWxBcmdzID0gb3B0aW9uc1xuICAgICAgLmZpbHRlcigobykgPT4gby5wb3NpdGlvbmFsICE9PSB1bmRlZmluZWQpXG4gICAgICAubWFwKChvKSA9PiB7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gYCR7c3RyaW5ncy5kYXNoZXJpemUoby5uYW1lKX0ke28udHlwZSA9PT0gJ2FycmF5JyA/ICcgLi4nIDogJyd9YDtcblxuICAgICAgICByZXR1cm4gby5yZXF1aXJlZCA/IGA8JHtsYWJlbH0+YCA6IGBbJHtsYWJlbH1dYDtcbiAgICAgIH0pXG4gICAgICAuam9pbignICcpO1xuXG4gICAgcmV0dXJuIGAke2NvbW1hbmROYW1lfSR7cG9zaXRpb25hbEFyZ3MgPyAnICcgKyBwb3NpdGlvbmFsQXJncyA6ICcnfWA7XG4gIH1cbn1cbiJdfQ==