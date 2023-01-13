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
const command_module_1 = require("../../command-builder/command-module");
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
        for (const [schematicName, collectionName] of await this.getSchematicsToRegister()) {
            const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
            const collection = workflow.engine.createCollection(collectionName);
            const { description: { schemaJson, aliases: schematicAliases, hidden: schematicHidden, description: schematicDescription, }, } = collection.createSchematic(schematicName, true);
            if (!schemaJson) {
                continue;
            }
            const { 'x-deprecated': xDeprecated, description = schematicDescription, aliases = schematicAliases, hidden = schematicHidden, } = schemaJson;
            const options = await this.getSchematicOptions(collection, schematicName, workflow);
            localYargs = localYargs.command({
                command: await this.generateCommandString(collectionName, schematicName, options),
                // When 'describe' is set to false, it results in a hidden command.
                describe: hidden === true ? false : typeof description === 'string' ? description : '',
                deprecated: xDeprecated === true || typeof xDeprecated === 'string' ? xDeprecated : false,
                aliases: Array.isArray(aliases)
                    ? await this.generateCommandAliasesStrings(collectionName, aliases)
                    : undefined,
                builder: (localYargs) => this.addSchemaOptionsToCommand(localYargs, options).strict(),
                handler: (options) => this.handler({ ...options, schematic: `${collectionName}:${schematicName}` }),
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
                    const { aliases } = collection.description.schematics[schematicName];
                    const schematicAliases = aliases && new Set(aliases);
                    yield { schematicName, schematicAliases, collectionName };
                }
            }
        }
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
                (schematicName === schematicNameFromArgs || (schematicAliases === null || schematicAliases === void 0 ? void 0 : schematicAliases.has(schematicNameFromArgs)))) {
                return [[schematicName, collectionName]];
            }
            schematicsToRegister.push([schematicName, collectionName]);
        }
        // Didn't find the schematic or no schematic name was provided Ex: `ng generate --help`.
        return schematicsToRegister.sort(([nameA], [nameB]) => nameA.localeCompare(nameB, undefined, { sensitivity: 'accent' }));
    }
}
exports.GenerateCommandModule = GenerateCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2dlbmVyYXRlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBK0M7QUFFL0MseUVBSzhDO0FBQzlDLCtGQUd5RDtBQUN6RCxxRUFBc0Y7QUFPdEYsTUFBYSxxQkFDWCxTQUFRLG1EQUF1QjtJQURqQzs7UUFJRSxZQUFPLEdBQUcsVUFBVSxDQUFDO1FBQ3JCLFlBQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxhQUFRLEdBQUcsdURBQXVELENBQUM7SUFxTnJFLENBQUM7SUFsTlUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLElBQUksVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFzQjtZQUN4RSxPQUFPLEVBQUUsZ0JBQWdCO1lBQ3pCLFFBQVEsRUFBRSw2QkFBNkI7WUFDdkMsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDdEIsVUFBVTtpQkFDUCxVQUFVLENBQUMsV0FBVyxFQUFFO2dCQUN2QixRQUFRLEVBQUUsb0NBQW9DO2dCQUM5QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxZQUFZLEVBQUUsSUFBSTthQUNuQixDQUFDO2lCQUNELE1BQU0sRUFBRTtZQUNiLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDNUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLEVBQUU7WUFDbEYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFD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QUU7WUFDNUYsSUFDRSxxQkFBcUI7Z0JBQ3JCLENBQUMsYUFBYSxLQUFLLHFCQUFxQixLQUFJLGdCQUFnQixhQUFoQixnQkFBZ0IsdUJBQWhCLGdCQUFnQixDQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBLENBQUMsRUFDekY7Z0JBQ0EsT0FBTyxDQUFDLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7YUFDMUM7WUFFRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztTQUM1RDtRQUVELHdGQUF3RjtRQUN4RixPQUFPLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQ3BELEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUNqRSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBM05ELHNEQTJOQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGVFcnJvcixcbiAgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uLFxuICBPcHRpb25zLFxuICBPdGhlck9wdGlvbnMsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQge1xuICBTY2hlbWF0aWNzQ29tbWFuZEFyZ3MsXG4gIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvc2NoZW1hdGljcy1jb21tYW5kLW1vZHVsZSc7XG5pbXBvcnQgeyBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UgfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL2NvbW1hbmQnO1xuaW1wb3J0IHsgT3B0aW9uIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5cbmludGVyZmFjZSBHZW5lcmF0ZUNvbW1hbmRBcmdzIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRBcmdzIHtcbiAgc2NoZW1hdGljPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgR2VuZXJhdGVDb21tYW5kTW9kdWxlXG4gIGV4dGVuZHMgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGVcbiAgaW1wbGVtZW50cyBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb248R2VuZXJhdGVDb21tYW5kQXJncz5cbntcbiAgY29tbWFuZCA9ICdnZW5lcmF0ZSc7XG4gIGFsaWFzZXMgPSAnZyc7XG4gIGRlc2NyaWJlID0gJ0dlbmVyYXRlcyBhbmQvb3IgbW9kaWZpZXMgZmlsZXMgYmFzZWQgb24gYSBzY2hlbWF0aWMuJztcbiAgbG9uZ0Rlc2NyaXB0aW9uUGF0aD86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBvdmVycmlkZSBhc3luYyBidWlsZGVyKGFyZ3Y6IEFyZ3YpOiBQcm9taXNlPEFyZ3Y8R2VuZXJhdGVDb21tYW5kQXJncz4+IHtcbiAgICBsZXQgbG9jYWxZYXJncyA9IChhd2FpdCBzdXBlci5idWlsZGVyKGFyZ3YpKS5jb21tYW5kPEdlbmVyYXRlQ29tbWFuZEFyZ3M+KHtcbiAgICAgIGNvbW1hbmQ6ICckMCA8c2NoZW1hdGljPicsXG4gICAgICBkZXNjcmliZTogJ1J1biB0aGUgcHJvdmlkZWQgc2NoZW1hdGljLicsXG4gICAgICBidWlsZGVyOiAobG9jYWxZYXJncykgPT5cbiAgICAgICAgbG9jYWxZYXJnc1xuICAgICAgICAgIC5wb3NpdGlvbmFsKCdzY2hlbWF0aWMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTogJ1RoZSBbY29sbGVjdGlvbjpzY2hlbWF0aWNdIHRvIHJ1bi4nLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBkZW1hbmRPcHRpb246IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuc3RyaWN0KCksXG4gICAgICBoYW5kbGVyOiAob3B0aW9ucykgPT4gdGhpcy5oYW5kbGVyKG9wdGlvbnMpLFxuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdIG9mIGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljc1RvUmVnaXN0ZXIoKSkge1xuICAgICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JCdWlsZGVyKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICBzY2hlbWFKc29uLFxuICAgICAgICAgIGFsaWFzZXM6IHNjaGVtYXRpY0FsaWFzZXMsXG4gICAgICAgICAgaGlkZGVuOiBzY2hlbWF0aWNIaWRkZW4sXG4gICAgICAgICAgZGVzY3JpcHRpb246IHNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICAgICAgICB9LFxuICAgICAgfSA9IGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIHRydWUpO1xuXG4gICAgICBpZiAoIXNjaGVtYUpzb24pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgJ3gtZGVwcmVjYXRlZCc6IHhEZXByZWNhdGVkLFxuICAgICAgICBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICAgICAgICBhbGlhc2VzID0gc2NoZW1hdGljQWxpYXNlcyxcbiAgICAgICAgaGlkZGVuID0gc2NoZW1hdGljSGlkZGVuLFxuICAgICAgfSA9IHNjaGVtYUpzb247XG4gICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNPcHRpb25zKGNvbGxlY3Rpb24sIHNjaGVtYXRpY05hbWUsIHdvcmtmbG93KTtcblxuICAgICAgbG9jYWxZYXJncyA9IGxvY2FsWWFyZ3MuY29tbWFuZCh7XG4gICAgICAgIGNvbW1hbmQ6IGF3YWl0IHRoaXMuZ2VuZXJhdGVDb21tYW5kU3RyaW5nKGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lLCBvcHRpb25zKSxcbiAgICAgICAgLy8gV2hlbiAnZGVzY3JpYmUnIGlzIHNldCB0byBmYWxzZSwgaXQgcmVzdWx0cyBpbiBhIGhpZGRlbiBjb21tYW5kLlxuICAgICAgICBkZXNjcmliZTogaGlkZGVuID09PSB0cnVlID8gZmFsc2UgOiB0eXBlb2YgZGVzY3JpcHRpb24gPT09ICdzdHJpbmcnID8gZGVzY3JpcHRpb24gOiAnJyxcbiAgICAgICAgZGVwcmVjYXRlZDogeERlcHJlY2F0ZWQgPT09IHRydWUgfHwgdHlwZW9mIHhEZXByZWNhdGVkID09PSAnc3RyaW5nJyA/IHhEZXByZWNhdGVkIDogZmFsc2UsXG4gICAgICAgIGFsaWFzZXM6IEFycmF5LmlzQXJyYXkoYWxpYXNlcylcbiAgICAgICAgICA/IGF3YWl0IHRoaXMuZ2VuZXJhdGVDb21tYW5kQWxpYXNlc1N0cmluZ3MoY29sbGVjdGlvbk5hbWUsIGFsaWFzZXMgYXMgc3RyaW5nW10pXG4gICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgIGJ1aWxkZXI6IChsb2NhbFlhcmdzKSA9PiB0aGlzLmFkZFNjaGVtYU9wdGlvbnNUb0NvbW1hbmQobG9jYWxZYXJncywgb3B0aW9ucykuc3RyaWN0KCksXG4gICAgICAgIGhhbmRsZXI6IChvcHRpb25zKSA9PlxuICAgICAgICAgIHRoaXMuaGFuZGxlcih7IC4uLm9wdGlvbnMsIHNjaGVtYXRpYzogYCR7Y29sbGVjdGlvbk5hbWV9OiR7c2NoZW1hdGljTmFtZX1gIH0pLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsWWFyZ3MuZGVtYW5kQ29tbWFuZCgxLCBkZW1hbmRDb21tYW5kRmFpbHVyZU1lc3NhZ2UpO1xuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnM8R2VuZXJhdGVDb21tYW5kQXJncz4gJiBPdGhlck9wdGlvbnMpOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBjb25zdCB7IGRyeVJ1biwgc2NoZW1hdGljLCBkZWZhdWx0cywgZm9yY2UsIGludGVyYWN0aXZlLCAuLi5zY2hlbWF0aWNPcHRpb25zIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNOYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKHNjaGVtYXRpYyk7XG5cbiAgICBpZiAoIWNvbGxlY3Rpb25OYW1lIHx8ICFzY2hlbWF0aWNOYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgQ29tbWFuZE1vZHVsZUVycm9yKCdBIGNvbGxlY3Rpb24gYW5kIHNjaGVtYXRpYyBpcyByZXF1aXJlZCBkdXJpbmcgZXhlY3V0aW9uLicpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgZXhlY3V0aW9uT3B0aW9uczoge1xuICAgICAgICBkcnlSdW4sXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBmb3JjZSxcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZXMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lID8gW2NvbGxlY3Rpb25OYW1lXSA6IFsuLi4oYXdhaXQgdGhpcy5nZXRTY2hlbWF0aWNDb2xsZWN0aW9ucygpKV07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNob3VsZEFkZENvbGxlY3Rpb25OYW1lQXNQYXJ0T2ZDb21tYW5kKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZUZyb21BcmdzXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICBjb25zdCBzY2hlbWF0aWNDb2xsZWN0aW9uc0Zyb21Db25maWcgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCk7XG4gICAgY29uc3QgY29sbGVjdGlvbk5hbWVzID0gYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZXMoKTtcblxuICAgIC8vIE9ubHkgYWRkIHRoZSBjb2xsZWN0aW9uIG5hbWUgYXMgcGFydCBvZiB0aGUgY29tbWFuZCB3aGVuIGl0J3Mgbm90IGEga25vd25cbiAgICAvLyBzY2hlbWF0aWNzIGNvbGxlY3Rpb24gb3Igd2hlbiBpdCBoYXMgYmVlbiBwcm92aWRlZCB2aWEgdGhlIENMSS5cbiAgICAvLyBFeDpgbmcgZ2VuZXJhdGUgQHNjaGVtYXRpY3MvYW5ndWxhcjpjYFxuICAgIHJldHVybiAoXG4gICAgICAhIWNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgfHxcbiAgICAgICFjb2xsZWN0aW9uTmFtZXMuc29tZSgoYykgPT4gc2NoZW1hdGljQ29sbGVjdGlvbnNGcm9tQ29uZmlnLmhhcyhjKSlcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGFuIGFsaWFzZXMgc3RyaW5nIGFycmF5IHRvIGJlIHBhc3NlZCB0byB0aGUgY29tbWFuZCBidWlsZGVyLlxuICAgKlxuICAgKiBAZXhhbXBsZSBgW2NvbXBvbmVudF1gIG9yIGBbQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnRdYC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVDb21tYW5kQWxpYXNlc1N0cmluZ3MoXG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZyxcbiAgICBzY2hlbWF0aWNBbGlhc2VzOiBzdHJpbmdbXSxcbiAgKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIC8vIE9ubHkgYWRkIHRoZSBjb2xsZWN0aW9uIG5hbWUgYXMgcGFydCBvZiB0aGUgY29tbWFuZCB3aGVuIGl0J3Mgbm90IGEga25vd25cbiAgICAvLyBzY2hlbWF0aWNzIGNvbGxlY3Rpb24gb3Igd2hlbiBpdCBoYXMgYmVlbiBwcm92aWRlZCB2aWEgdGhlIENMSS5cbiAgICAvLyBFeDpgbmcgZ2VuZXJhdGUgQHNjaGVtYXRpY3MvYW5ndWxhcjpjYFxuICAgIHJldHVybiAoYXdhaXQgdGhpcy5zaG91bGRBZGRDb2xsZWN0aW9uTmFtZUFzUGFydE9mQ29tbWFuZCgpKVxuICAgICAgPyBzY2hlbWF0aWNBbGlhc2VzLm1hcCgoYWxpYXMpID0+IGAke2NvbGxlY3Rpb25OYW1lfToke2FsaWFzfWApXG4gICAgICA6IHNjaGVtYXRpY0FsaWFzZXM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBjb21tYW5kIHN0cmluZyB0byBiZSBwYXNzZWQgdG8gdGhlIGNvbW1hbmQgYnVpbGRlci5cbiAgICpcbiAgICogQGV4YW1wbGUgYGNvbXBvbmVudCBbbmFtZV1gIG9yIGBAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCBbbmFtZV1gLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUNvbW1hbmRTdHJpbmcoXG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZyxcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogT3B0aW9uW10sXG4gICk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgZGFzaGVyaXplZFNjaGVtYXRpY05hbWUgPSBzdHJpbmdzLmRhc2hlcml6ZShzY2hlbWF0aWNOYW1lKTtcblxuICAgIC8vIE9ubHkgYWRkIHRoZSBjb2xsZWN0aW9uIG5hbWUgYXMgcGFydCBvZiB0aGUgY29tbWFuZCB3aGVuIGl0J3Mgbm90IGEga25vd25cbiAgICAvLyBzY2hlbWF0aWNzIGNvbGxlY3Rpb24gb3Igd2hlbiBpdCBoYXMgYmVlbiBwcm92aWRlZCB2aWEgdGhlIENMSS5cbiAgICAvLyBFeDpgbmcgZ2VuZXJhdGUgQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnRgXG4gICAgY29uc3QgY29tbWFuZE5hbWUgPSAoYXdhaXQgdGhpcy5zaG91bGRBZGRDb2xsZWN0aW9uTmFtZUFzUGFydE9mQ29tbWFuZCgpKVxuICAgICAgPyBjb2xsZWN0aW9uTmFtZSArICc6JyArIGRhc2hlcml6ZWRTY2hlbWF0aWNOYW1lXG4gICAgICA6IGRhc2hlcml6ZWRTY2hlbWF0aWNOYW1lO1xuXG4gICAgY29uc3QgcG9zaXRpb25hbEFyZ3MgPSBvcHRpb25zXG4gICAgICAuZmlsdGVyKChvKSA9PiBvLnBvc2l0aW9uYWwgIT09IHVuZGVmaW5lZClcbiAgICAgIC5tYXAoKG8pID0+IHtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBgJHtzdHJpbmdzLmRhc2hlcml6ZShvLm5hbWUpfSR7by50eXBlID09PSAnYXJyYXknID8gJyAuLicgOiAnJ31gO1xuXG4gICAgICAgIHJldHVybiBvLnJlcXVpcmVkID8gYDwke2xhYmVsfT5gIDogYFske2xhYmVsfV1gO1xuICAgICAgfSlcbiAgICAgIC5qb2luKCcgJyk7XG5cbiAgICByZXR1cm4gYCR7Y29tbWFuZE5hbWV9JHtwb3NpdGlvbmFsQXJncyA/ICcgJyArIHBvc2l0aW9uYWxBcmdzIDogJyd9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2NoZW1hdGljcyB0aGF0IGNhbiB0byBiZSByZWdpc3RlcmVkIGFzIHN1YmNvbW1hbmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyAqZ2V0U2NoZW1hdGljcygpOiBBc3luY0dlbmVyYXRvcjx7XG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nO1xuICAgIHNjaGVtYXRpY0FsaWFzZXM/OiBTZXQ8c3RyaW5nPjtcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICB9PiB7XG4gICAgY29uc3Qgc2Vlbk5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjb2xsZWN0aW9uTmFtZSBvZiBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lcygpKSB7XG4gICAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuZ2V0T3JDcmVhdGVXb3JrZmxvd0ZvckJ1aWxkZXIoY29sbGVjdGlvbk5hbWUpO1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcblxuICAgICAgZm9yIChjb25zdCBzY2hlbWF0aWNOYW1lIG9mIGNvbGxlY3Rpb24ubGlzdFNjaGVtYXRpY05hbWVzKHRydWUgLyoqIGluY2x1ZGVIaWRkZW4gKi8pKSB7XG4gICAgICAgIC8vIElmIGEgc2NoZW1hdGljIHdpdGggdGhpcyBzYW1lIG5hbWUgaXMgYWxyZWFkeSByZWdpc3RlcmVkIHNraXAuXG4gICAgICAgIGlmICghc2Vlbk5hbWVzLmhhcyhzY2hlbWF0aWNOYW1lKSkge1xuICAgICAgICAgIHNlZW5OYW1lcy5hZGQoc2NoZW1hdGljTmFtZSk7XG4gICAgICAgICAgY29uc3QgeyBhbGlhc2VzIH0gPSBjb2xsZWN0aW9uLmRlc2NyaXB0aW9uLnNjaGVtYXRpY3Nbc2NoZW1hdGljTmFtZV07XG4gICAgICAgICAgY29uc3Qgc2NoZW1hdGljQWxpYXNlcyA9IGFsaWFzZXMgJiYgbmV3IFNldChhbGlhc2VzKTtcblxuICAgICAgICAgIHlpZWxkIHsgc2NoZW1hdGljTmFtZSwgc2NoZW1hdGljQWxpYXNlcywgY29sbGVjdGlvbk5hbWUgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2NoZW1hdGljcyB0aGF0IHNob3VsZCB0byBiZSByZWdpc3RlcmVkIGFzIHN1YmNvbW1hbmRzLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIHNvcnRlZCBsaXN0IG9mIHNjaGVtYXRpYyB0aGF0IG5lZWRzIHRvIGJlIHJlZ2lzdGVyZWQgYXMgc3ViY29tbWFuZHMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGdldFNjaGVtYXRpY3NUb1JlZ2lzdGVyKCk6IFByb21pc2U8XG4gICAgW3NjaGVtYXRpY05hbWU6IHN0cmluZywgY29sbGVjdGlvbk5hbWU6IHN0cmluZ11bXVxuICA+IHtcbiAgICBjb25zdCBzY2hlbWF0aWNzVG9SZWdpc3RlcjogW3NjaGVtYXRpY05hbWU6IHN0cmluZywgY29sbGVjdGlvbk5hbWU6IHN0cmluZ11bXSA9IFtdO1xuICAgIGNvbnN0IFssIHNjaGVtYXRpY05hbWVGcm9tQXJnc10gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgZm9yIGF3YWl0IChjb25zdCB7IHNjaGVtYXRpY05hbWUsIGNvbGxlY3Rpb25OYW1lLCBzY2hlbWF0aWNBbGlhc2VzIH0gb2YgdGhpcy5nZXRTY2hlbWF0aWNzKCkpIHtcbiAgICAgIGlmIChcbiAgICAgICAgc2NoZW1hdGljTmFtZUZyb21BcmdzICYmXG4gICAgICAgIChzY2hlbWF0aWNOYW1lID09PSBzY2hlbWF0aWNOYW1lRnJvbUFyZ3MgfHwgc2NoZW1hdGljQWxpYXNlcz8uaGFzKHNjaGVtYXRpY05hbWVGcm9tQXJncykpXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIFtbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdXTtcbiAgICAgIH1cblxuICAgICAgc2NoZW1hdGljc1RvUmVnaXN0ZXIucHVzaChbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdKTtcbiAgICB9XG5cbiAgICAvLyBEaWRuJ3QgZmluZCB0aGUgc2NoZW1hdGljIG9yIG5vIHNjaGVtYXRpYyBuYW1lIHdhcyBwcm92aWRlZCBFeDogYG5nIGdlbmVyYXRlIC0taGVscGAuXG4gICAgcmV0dXJuIHNjaGVtYXRpY3NUb1JlZ2lzdGVyLnNvcnQoKFtuYW1lQV0sIFtuYW1lQl0pID0+XG4gICAgICBuYW1lQS5sb2NhbGVDb21wYXJlKG5hbWVCLCB1bmRlZmluZWQsIHsgc2Vuc2l0aXZpdHk6ICdhY2NlbnQnIH0pLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==