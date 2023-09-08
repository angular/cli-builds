"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const command_module_1 = require("../../command-builder/command-module");
const schematics_command_module_1 = require("../../command-builder/schematics-command-module");
const command_1 = require("../../command-builder/utilities/command");
const command_config_1 = require("../command-config");
class GenerateCommandModule extends schematics_command_module_1.SchematicsCommandModule {
    command = 'generate';
    aliases = command_config_1.RootCommands['generate'].aliases;
    describe = 'Generates and/or modifies files based on a schematic.';
    longDescriptionPath;
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
        for (const [schematicName, collectionName] of await this.getSchematicsToRegister()) {
            const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
            const collection = workflow.engine.createCollection(collectionName);
            const { description: { schemaJson, aliases: schematicAliases, hidden: schematicHidden, description: schematicDescription, }, } = collection.createSchematic(schematicName, true);
            if (!schemaJson) {
                continue;
            }
            const { 'x-deprecated': xDeprecated, description = schematicDescription, hidden = schematicHidden, } = schemaJson;
            const options = await this.getSchematicOptions(collection, schematicName, workflow);
            localYargs = localYargs.command({
                command: await this.generateCommandString(collectionName, schematicName, options),
                // When 'describe' is set to false, it results in a hidden command.
                describe: hidden === true ? false : typeof description === 'string' ? description : '',
                deprecated: xDeprecated === true || typeof xDeprecated === 'string' ? xDeprecated : false,
                aliases: Array.isArray(schematicAliases)
                    ? await this.generateCommandAliasesStrings(collectionName, schematicAliases)
                    : undefined,
                builder: (localYargs) => this.addSchemaOptionsToCommand(localYargs, options).strict(),
                handler: (options) => this.handler({
                    ...options,
                    schematic: `${collectionName}:${schematicName}`,
                }),
            });
        }
        return localYargs.demandCommand(1, command_1.demandCommandFailureMessage);
    }
    async run(options) {
        const { dryRun, schematic, defaults, force, interactive, ...schematicOptions } = options;
        const [collectionName, schematicName] = this.parseSchematicInfo(schematic);
        if (!collectionName || !schematicName) {
            throw new command_module_1.CommandModuleError('A collection and schematic is required during execution.');
        }
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
    async getCollectionNames() {
        const [collectionName] = this.parseSchematicInfo(
        // positional = [generate, component] or [generate]
        this.context.args.positional[1]);
        return collectionName ? [collectionName] : [...(await this.getSchematicCollections())];
    }
    async shouldAddCollectionNameAsPartOfCommand() {
        const [collectionNameFromArgs] = this.parseSchematicInfo(
        // positional = [generate, component] or [generate]
        this.context.args.positional[1]);
        const schematicCollectionsFromConfig = await this.getSchematicCollections();
        const collectionNames = await this.getCollectionNames();
        // Only add the collection name as part of the command when it's not a known
        // schematics collection or when it has been provided via the CLI.
        // Ex:`ng generate @schematics/angular:c`
        return (!!collectionNameFromArgs ||
            !collectionNames.some((c) => schematicCollectionsFromConfig.has(c)));
    }
    /**
     * Generate an aliases string array to be passed to the command builder.
     *
     * @example `[component]` or `[@schematics/angular:component]`.
     */
    async generateCommandAliasesStrings(collectionName, schematicAliases) {
        // Only add the collection name as part of the command when it's not a known
        // schematics collection or when it has been provided via the CLI.
        // Ex:`ng generate @schematics/angular:c`
        return (await this.shouldAddCollectionNameAsPartOfCommand())
            ? schematicAliases.map((alias) => `${collectionName}:${alias}`)
            : schematicAliases;
    }
    /**
     * Generate a command string to be passed to the command builder.
     *
     * @example `component [name]` or `@schematics/angular:component [name]`.
     */
    async generateCommandString(collectionName, schematicName, options) {
        const dasherizedSchematicName = core_1.strings.dasherize(schematicName);
        // Only add the collection name as part of the command when it's not a known
        // schematics collection or when it has been provided via the CLI.
        // Ex:`ng generate @schematics/angular:component`
        const commandName = (await this.shouldAddCollectionNameAsPartOfCommand())
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
    /**
     * Get schematics that can to be registered as subcommands.
     */
    async *getSchematics() {
        const seenNames = new Set();
        for (const collectionName of await this.getCollectionNames()) {
            const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
            const collection = workflow.engine.createCollection(collectionName);
            for (const schematicName of collection.listSchematicNames(true /** includeHidden */)) {
                // If a schematic with this same name is already registered skip.
                if (!seenNames.has(schematicName)) {
                    seenNames.add(schematicName);
                    yield {
                        schematicName,
                        collectionName,
                        schematicAliases: this.listSchematicAliases(collection, schematicName),
                    };
                }
            }
        }
    }
    listSchematicAliases(collection, schematicName) {
        const description = collection.description.schematics[schematicName];
        if (description) {
            return description.aliases && new Set(description.aliases);
        }
        // Extended collections
        if (collection.baseDescriptions) {
            for (const base of collection.baseDescriptions) {
                const description = base.schematics[schematicName];
                if (description) {
                    return description.aliases && new Set(description.aliases);
                }
            }
        }
        return undefined;
    }
    /**
     * Get schematics that should to be registered as subcommands.
     *
     * @returns a sorted list of schematic that needs to be registered as subcommands.
     */
    async getSchematicsToRegister() {
        const schematicsToRegister = [];
        const [, schematicNameFromArgs] = this.parseSchematicInfo(
        // positional = [generate, component] or [generate]
        this.context.args.positional[1]);
        for await (const { schematicName, collectionName, schematicAliases } of this.getSchematics()) {
            if (schematicNameFromArgs &&
                (schematicName === schematicNameFromArgs || schematicAliases?.has(schematicNameFromArgs))) {
                return [[schematicName, collectionName]];
            }
            schematicsToRegister.push([schematicName, collectionName]);
        }
        // Didn't find the schematic or no schematic name was provided Ex: `ng generate --help`.
        return schematicsToRegister.sort(([nameA], [nameB]) => nameA.localeCompare(nameB, undefined, { sensitivity: 'accent' }));
    }
}
exports.default = GenerateCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2dlbmVyYXRlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtDQUErQztBQU8vQyx5RUFLOEM7QUFDOUMsK0ZBR3lEO0FBQ3pELHFFQUFzRjtBQUV0RixzREFBaUQ7QUFNakQsTUFBcUIscUJBQ25CLFNBQVEsbURBQXVCO0lBRy9CLE9BQU8sR0FBRyxVQUFVLENBQUM7SUFDckIsT0FBTyxHQUFHLDZCQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzNDLFFBQVEsR0FBRyx1REFBdUQsQ0FBQztJQUNuRSxtQkFBbUIsQ0FBc0I7SUFFaEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLElBQUksVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ25ELE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsUUFBUSxFQUFFLDZCQUE2QjtZQUN2QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUN0QixVQUFVO2lCQUNQLFVBQVUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3ZCLFFBQVEsRUFBRSxvQ0FBb0M7Z0JBQzlDLElBQUksRUFBRSxRQUFRO2dCQUNkLFlBQVksRUFBRSxJQUFJO2FBQ25CLENBQUM7aUJBQ0QsTUFBTSxFQUFFO1lBQ2IsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQWtELENBQUM7U0FDdkYsQ0FBQyxDQUFDO1FBRUgsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLEVBQUU7WUFDbEYsTUFBTSxRQUFR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IENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzY3JpcHRpb24sXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjcmlwdGlvbixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgQXJndW1lbnRzQ2FtZWxDYXNlLCBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcbmltcG9ydCB7IFJvb3RDb21tYW5kcyB9IGZyb20gJy4uL2NvbW1hbmQtY29uZmlnJztcblxuaW50ZXJmYWNlIEdlbmVyYXRlQ29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBzY2hlbWF0aWM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdlbmVyYXRlQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEdlbmVyYXRlQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnZ2VuZXJhdGUnO1xuICBhbGlhc2VzID0gUm9vdENvbW1hbmRzWydnZW5lcmF0ZSddLmFsaWFzZXM7XG4gIGRlc2NyaWJlID0gJ0dlbmVyYXRlcyBhbmQvb3IgbW9kaWZpZXMgZmlsZXMgYmFzZWQgb24gYSBzY2hlbWF0aWMuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBvdmVycmlkZSBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8R2VuZXJhdGVDb21tYW5kQXJncz4+IHtcbiAgICBsZXQgbG9jYWxZYXJncyA9IChhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpKS5jb21tYW5kKHtcbiAgICAgIGNvbW1hbmQ6ICckMCA8c2NoZW1hdGljPicsXG4gICAgICBkZXNjcmliZTogJ1J1biB0aGUgcHJvdmlkZWQgc2NoZW1hdGljLicsXG4gICAgICBidWlsZGVyOiAobG9jYWxZYXJncykgPT5cbiAgICAgICAgbG9jYWxZYXJnc1xuICAgICAgICAgIC5wb3NpdGlvbmFsKCdzY2hlbWF0aWMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTogJ1RoZSBbY29sbGVjdGlvbjpzY2hlbWF0aWNdIHRvIHJ1bi4nLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBkZW1hbmRPcHRpb246IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuc3RyaWN0KCksXG4gICAgICBoYW5kbGVyOiAob3B0aW9ucykgPT4gdGhpcy5oYW5kbGVyKG9wdGlvbnMgYXMgQXJndW1lbnRzQ2FtZWxDYXNlPEdlbmVyYXRlQ29tbWFuZEFyZ3M+KSxcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3QgW3NjaGVtYXRpY05hbWUsIGNvbGxlY3Rpb25OYW1lXSBvZiBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY3NUb1JlZ2lzdGVyKCkpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgc2NoZW1hSnNvbixcbiAgICAgICAgICBhbGlhc2VzOiBzY2hlbWF0aWNBbGlhc2VzLFxuICAgICAgICAgIGhpZGRlbjogc2NoZW1hdGljSGlkZGVuLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBzY2hlbWF0aWNEZXNjcmlwdGlvbixcbiAgICAgICAgfSxcbiAgICAgIH0gPSBjb2xsZWN0aW9uLmNyZWF0ZVNjaGVtYXRpYyhzY2hlbWF0aWNOYW1lLCB0cnVlKTtcblxuICAgICAgaWYgKCFzY2hlbWFKc29uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7XG4gICAgICAgICd4LWRlcHJlY2F0ZWQnOiB4RGVwcmVjYXRlZCxcbiAgICAgICAgZGVzY3JpcHRpb24gPSBzY2hlbWF0aWNEZXNjcmlwdGlvbixcbiAgICAgICAgaGlkZGVuID0gc2NoZW1hdGljSGlkZGVuLFxuICAgICAgfSA9IHNjaGVtYUpzb247XG4gICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb24sIHNjaGVtYXRpY05hbWUsIHdvcmtmbG93KTtcblxuICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3MuY29tbWFuZCh7XG4gICAgICAgIGNvbW1hbmQ6IGF3YWl0IHRoaXMuZ2VuZXJhdGVDb21tYW5kU3RyaW5nKGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBvcHRpb25zKSxcbiAgICAgICAgLy8gV2hlbiAnZGVzY3JpYmUnIGlzIHNldCB0byBmYWxzZSwgaXQgcmVzdWx0cyBpbiBhIGhpZGRlbiBjb21tYW5kLlxuICAgICAgICBkZXNjcmliZTogaGlkZGVuID09PSB0cnVlID8gZmFsc2UgOiB0eXBlb2YgZGVzY3JpcHRpb24gPT09ICdzdHJpbmcnID8gZGVzY3JpcHRpb24gOiAnJyxcbiAgICAgICAgZGVwcmVjYXRlZDogeERlcHJlY2F0ZWQgPT09IHRydWUgfHwgdHlwZW9mIHhEZXByZWNhdGVkID09PSAnc3RyaW5nJyA/IHhEZXByZWNhdGVkIDogZmFsc2UsXG4gICAgICAgIGFsaWFzZXM6IEFycmF5LmlzQXJyYXkoc2NoZW1hdGljQWxpYXNlcylcbiAgICAgICAgICA/IGF3YWl0IHRoaXMuZ2VuZXJhdGVDb21tYW5kQWxpYXNlc1N0cmluZ3MoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY0FsaWFzZXMpXG4gICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgIGJ1aWxkZXI6IChsb2NhbFlhcmdzKSA9PiB0aGlzLmFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQobG9jYWxZYXJncywgb3B0aW9ucykuc3RyaWN0KCksXG4gICAgICAgIGhhbmRsZXI6IChvcHRpb25zKSA9PlxuICAgICAgICAgIHRoaXMuaGFuZGxlcih7XG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgc2NoZW1hdGljOiBgJHtjb2xsZWN0aW9uTmFtZX06JHtzY2hlbWF0aWNOYW1lfWAsXG4gICAgICAgICAgfSBhcyBBcmd1bWVudHNDYW1lbENhc2U8XG4gICAgICAgICAgICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MgJiB7XG4gICAgICAgICAgICAgIHNjaGVtYXRpYzogc3RyaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgID4pLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3MuZGVtYW5kQ29tbWFuZCgxLCBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8R2VuZXJhdGVDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGRyeVJ1biwgc2NoZW1hdGljLCBkZWZhdWx0cywgZm9yY2UsIGludGVyYWN0aXZlLCAuLi5zY2hlbWF0aWNPcHRpb25zIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKHNjaGVtYXRpYyk7XG5cbiAgICBpZiAoIWNvbGxlY3Rpb25OYW1lIHx8ICFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdBIGNvbGxlY3Rpb24gYW5kIHNjaGVtYXRpYyBpcyByZXF1aXJlZCBkdXJpbmcgZXhlY3V0aW9uLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgZXhlY3V0aW9uT3B0aW9uczoge1xuICAgICAgICBkcnlSdW4sXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBmb3JjZSxcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZXMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lID8gW2NvbGxlY3Rpb25OYW1lXSA6IFsuLi4oYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNDb2xsZWN0aW9ucygpKV07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNob3VsZEFkZENvbGxlY3Rpb25OYW1lQXNQYXJ0T2ZDb21tYW5kKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZUZyb21BcmdzXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICBjb25zdCBzY2hlbWF0aWNDb2xsZWN0aW9uc0Zyb21Db25maWcgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCk7XG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWVzID0gYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZXMoKTtcblxuICAgIC8vIE9ubHkgYWRkIHRoZSBjb2xsZWN0aW9uIG5hbWUgYXMgcGFydCBvZiB0aGUgY29tbWFuZCB3aGVuIGl0J3Mgbm90IGEga25vd25cbiAgICAvLyBzY2hlbWF0aWNzIGNvbGxlY3Rpb24gb3Igd2hlbiBpdCBoYXMgYmVlbiBwcm92aWRlZCB2aWEgdGhlIENMSS5cbiAgICAvLyBFeDpgbmcgZ2VuZXJhdGUgQHNjaGVtYXRpY3MvYW5ndWxhcjpjYFxuICAgIHJldHVybiAoXG4gICAgICAhIWNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgfHxcbiAgICAgICFjb2xsZWN0aW9uTmFtZXMuc29tZSgoYykgPT4gc2NoZW1hdGljQ29sbGVjdGlvbnNGcm9tQ29uZmlnLmhhcyhjKSlcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGFuIGFsaWFzZXMgc3RyaW5nIGFycmF5IHRvIGJlIHBhc3NlZCB0byB0aGUgY29tbWFuZCBidWlsZGVyLlxuICAgKlxuICAgKiBAZXhhbXBsZSBgW2NvbXBvbmVudF1gIG9yIGBbQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnRdYC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVDb21tYW5kQWxpYXNlc1N0cmluZ3MoXG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZyxcbiAgICBzY2hlbWF0aWNBbGlhc2VzOiBzdHJpbmdbXSxcbiAgKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIC8vIE9ubHkgYWRkIHRoZSBjb2xsZWN0aW9uIG5hbWUgYXMgcGFydCBvZiB0aGUgY29tbWFuZCB3aGVuIGl0J3Mgbm90IGEga25vd25cbiAgICAvLyBzY2hlbWF0aWNzIGNvbGxlY3Rpb24gb3Igd2hlbiBpdCBoYXMgYmVlbiBwcm92aWRlZCB2aWEgdGhlIENMSS5cbiAgICAvLyBFeDpgbmcgZ2VuZXJhdGUgQHNjaGVtYXRpY3MvYW5ndWxhcjpjYFxuICAgIHJldHVybiAoYXdhaXQgdGhpcy5zaG91bGRBZGRDb2xsZWN0aW9uTmFtZUFzUGFydE9mQ29tbWFuZCgpKVxuICAgICAgPyBzY2hlbWF0aWNBbGlhc2VzLm1hcCgoYWxpYXMpID0+IGAke2NvbGxlY3Rpb25OYW1lfToke2FsaWFzfWApXG4gICAgICA6IHNjaGVtYXRpY0FsaWFzZXM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBjb21tYW5kIHN0cmluZyB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbW1hbmQgYnVpbGRlci5cbiAgICpcbiAgICogQGV4YW1wbGUgYGNvbXBvbmVudCBbbmFtZV1gIG9yIGBAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCBbbmFtZV1gLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUNvbW1hbmRTdHJpbmcoXG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZyxcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogT3B0aW9uW10sXG4gICk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgZGFzaGVyaXplZFNjaGVtYXRpY05hbWUgPSBzdHJpbmdzLmRhc2hlcml6ZShzY2hlbWF0aWNOYW1lKTtcblxuICAgIC8vIE9ubHkgYWRkIHRoZSBjb2xsZWN0aW9uIG5hbWUgYXMgcGFydCBvZiB0aGUgY29tbWFuZCB3aGVuIGl0J3Mgbm90IGEga25vd25cbiAgICAvLyBzY2hlbWF0aWNzIGNvbGxlY3Rpb24gb3Igd2hlbiBpdCBoYXMgYmVlbiBwcm92aWRlZCB2aWEgdGhlIENMSS5cbiAgICAvLyBFeDpgbmcgZ2VuZXJhdGUgQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnRgXG4gICAgY29uc3QgY29tbWFuZE5hbWUgPSAoYXdhaXQgdGhpcy5zaG91bGRBZGRDb2xsZWN0aW9uTmFtZUFzUGFydE9mQ29tbWFuZCgpKVxuICAgICAgPyBjb2xsZWN0aW9uTmFtZSArICc6JyArIGRhc2hlcml6ZWRTY2hlbWF0aWNOYW1lXG4gICAgICA6IGRhc2hlcml6ZWRTY2hlbWF0aWNOYW1lO1xuXG4gICAgY29uc3QgcG9zaXRpb25hbEFyZ3MgPSBvcHRpb25zXG4gICAgICAuZmlsdGVyKChvKSA9PiBvLnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZClcbiAgICAgIC5tYXAoKG8pID0+IHtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtzdHJpbmdzLmRhc2hlcml6ZShvLm5hbWUpfSR7by50eXBlID09PSAnYXJyYXknID8gJyAuLicgOiAnJ31gO1xuXG4gICAgICAgIHJldHVybiBvLnJlcXVpcmVkID8gYDwke2xhYmVsfT5gIDogYFske2xhYmVsfV1gO1xuICAgICAgfSlcbiAgICAgIC5qb2luKCcgJyk7XG5cbiAgICByZXR1cm4gYCR7Y29tbWFuZE5hbWV9JHtwb3NpdGlvbmFsQXJncyA/ICcgJyArIHBvc2l0aW9uYWxBcmdzIDogJyd9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2NoZW1hdGljcyB0aGF0IGNhbiB0byBiZSByZWdpc3RlcmVkIGFzIHN1YmNvbW1hbmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyAqZ2V0U2NoZW1hdGljcygpOiBBc3luY0dlbmVyYXRvcjx7XG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nO1xuICAgIHNjaGVtYXRpY0FsaWFzZXM/OiBTZXQ8c3RyaW5nPjtcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICB9PiB7XG4gICAgY29uc3Qgc2Vlbk5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjb2xsZWN0aW9uTmFtZSBvZiBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lcygpKSB7XG4gICAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgICAgZm9yIChjb25zdCBzY2hlbWF0aWNOYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKHRydWUgLyoqIGluY2x1ZGVIaWRkZW4gKi8pKSB7XG4gICAgICAgIC8vIElmIGEgc2NoZW1hdGljIHdpdGggdGhpcyBzYW1lIG5hbWUgaXMgYWxyZWFkeSByZWdpc3RlcmVkIHNraXAuXG4gICAgICAgIGlmICghc2Vlbk5hbWVzLmhhcyhzY2hlbWF0aWNOYW1lKSkge1xuICAgICAgICAgIHNlZW5OYW1lcy5hZGQoc2NoZW1hdGljTmFtZSk7XG5cbiAgICAgICAgICB5aWVsZCB7XG4gICAgICAgICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgICBzY2hlbWF0aWNBbGlhc2VzOiB0aGlzLmxpc3RTY2hlbWF0aWNBbGlhc2VzKGNvbGxlY3Rpb24sIHNjaGVtYXRpY05hbWUpLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxpc3RTY2hlbWF0aWNBbGlhc2VzKFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb248RmlsZVN5c3RlbUNvbGxlY3Rpb25EZXNjcmlwdGlvbiwgRmlsZVN5c3RlbVNjaGVtYXRpY0Rlc2NyaXB0aW9uPixcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICk6IFNldDxzdHJpbmc+IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZXNjcmlwdGlvbiA9IGNvbGxlY3Rpb24uZGVzY3JpcHRpb24uc2NoZW1hdGljc1tzY2hlbWF0aWNOYW1lXTtcbiAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgIHJldHVybiBkZXNjcmlwdGlvbi5hbGlhc2VzICYmIG5ldyBTZXQoZGVzY3JpcHRpb24uYWxpYXNlcyk7XG4gICAgfVxuXG4gICAgLy8gRXh0ZW5kZWQgY29sbGVjdGlvbnNcbiAgICBpZiAoY29sbGVjdGlvbi5iYXNlRGVzY3JpcHRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IGJhc2Ugb2YgY29sbGVjdGlvbi5iYXNlRGVzY3JpcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gYmFzZS5zY2hlbWF0aWNzW3NjaGVtYXRpY05hbWVdO1xuICAgICAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICByZXR1cm4gZGVzY3JpcHRpb24uYWxpYXNlcyAmJiBuZXcgU2V0KGRlc2NyaXB0aW9uLmFsaWFzZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2NoZW1hdGljcyB0aGF0IHNob3VsZCB0byBiZSByZWdpc3RlcmVkIGFzIHN1YmNvbW1hbmRzLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIHNvcnRlZCBsaXN0IG9mIHNjaGVtYXRpYyB0aGF0IG5lZWRzIHRvIGJlIHJlZ2lzdGVyZWQgYXMgc3ViY29tbWFuZHMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGdldFNjaGVtYXRpY3NUb1JlZ2lzdGVyKCk6IFByb21pc2U8XG4gICAgW3NjaGVtYXRpY05hbWU6IHN0cmluZywgY29sbGVjdGlvbk5hbWU6IHN0cmluZ11bXVxuICA+IHtcbiAgICBjb25zdCBzY2hlbWF0aWNzVG9SZWdpc3RlcjogW3NjaGVtYXRpY05hbWU6IHN0cmluZywgY29sbGVjdGlvbk5hbWU6IHN0cmluZ11bXSA9IFtdO1xuICAgIGNvbnN0IFssIHNjaGVtYXRpY05hbWVGcm9tQXJnc10gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgZm9yIGF3YWl0IChjb25zdCB7IHNjaGVtYXRpY05hbWUsIGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNBbGlhc2VzIH0gb2YgdGhpcy5nZXRTY2hlbWF0aWNzKCkpIHtcbiAgICAgIGlmIChcbiAgICAgICAgc2NoZW1hdGljTmFtZUZyb21BcmdzICYmXG4gICAgICAgIChzY2hlbWF0aWNOYW1lID09PSBzY2hlbWF0aWNOYW1lRnJvbUFyZ3MgfHwgc2NoZW1hdGljQWxpYXNlcz8uaGFzKHNjaGVtYXRpY05hbWVGcm9tQXJncykpXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIFtbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdXTtcbiAgICAgIH1cblxuICAgICAgc2NoZW1hdGljc1RvUmVnaXN0ZXIucHVzaChbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdKTtcbiAgICB9XG5cbiAgICAvLyBEaWRuJ3QgZmluZCB0aGUgc2NoZW1hdGljIG9yIG5vIHNjaGVtYXRpYyBuYW1lIHdhcyBwcm92aWRlZCBFeDogYG5nIGdlbmVyYXRlIC0taGVscGAuXG4gICAgcmV0dXJuIHNjaGVtYXRpY3NUb1JlZ2lzdGVyLnNvcnQoKFtuYW1lQV0sIFtuYW1lQl0pID0+XG4gICAgICBuYW1lQS5sb2NhbGVDb21wYXJlKG5hbWVCLCB1bmRlZmluZWQsIHsgc2Vuc2l0aXZpdHk6ICdhY2NlbnQnIH0pLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==