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
exports.GenerateCommandModule = GenerateCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2dlbmVyYXRlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBK0M7QUFPL0MseUVBSzhDO0FBQzlDLCtGQUd5RDtBQUN6RCxxRUFBc0Y7QUFPdEYsTUFBYSxxQkFDWCxTQUFRLG1EQUF1QjtJQURqQzs7UUFJRSxZQUFPLEdBQUcsVUFBVSxDQUFDO1FBQ3JCLFlBQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxhQUFRLEdBQUcsdURBQXVELENBQUM7SUFtUHJFLENBQUM7SUFoUFUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLElBQUksVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ25ELE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsUUFBUSxFQUFFLDZCQUE2QjtZQUN2QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUN0QixVQUFVO2lCQUNQLFVBQVUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3ZCLFFBQVEsRUFBRSxvQ0FBb0M7Z0JBQzlDLElBQUksRUFBRSxRQUFRO2dCQUNkLFlBQVksRUFBRSxJQUFJO2FBQ25CLENBQUM7aUJBQ0QsTUFBTSxFQUFFO1lBQ2IsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQWtELENBQUM7U0FDdkYsQ0FBQyxDQUFDO1FBRUgsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLEVBQUU7WUFDbEYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFD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SSxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQzVEO2FBQ0Y7U0FDRjtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssS0FBSyxDQUFDLHVCQUF1QjtRQUduQyxNQUFNLG9CQUFvQixHQUFzRCxFQUFFLENBQUM7UUFDbkYsTUFBTSxDQUFDLEVBQUUscUJBQXFCLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCO1FBQ3ZELG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQ2hDLENBQUM7UUFFRixJQUFJLEtBQUssRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRTtZQUM1RixJQUNFLHFCQUFxQjtnQkFDckIsQ0FBQyxhQUFhLEtBQUsscUJBQXFCLElBQUksZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFDekY7Z0JBQ0EsT0FBTyxDQUFDLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7YUFDMUM7WUFFRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztTQUM1RDtRQUVELHdGQUF3RjtRQUN4RixPQUFPLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQ3BELEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUNqRSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBelBELHNEQXlQQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQ29sbGVjdGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIEZpbGVTeXN0ZW1Db2xsZWN0aW9uRGVzY3JpcHRpb24sXG4gIEZpbGVTeXN0ZW1TY2hlbWF0aWNEZXNjcmlwdGlvbixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdG9vbHMnO1xuaW1wb3J0IHsgQXJndW1lbnRzQ2FtZWxDYXNlLCBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgQ29tbWFuZE1vZHVsZUVycm9yLFxuICBDb21tYW5kTW9kdWxlSW1wbGVtZW50YXRpb24sXG4gIE9wdGlvbnMsXG4gIE90aGVyT3B0aW9ucyxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL2NvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7XG4gIFNjaGVtYXRpY3NDb21tYW5kQXJncyxcbiAgU2NoZW1hdGljc0NvbW1hbmRNb2R1bGUsXG59IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9zY2hlbWF0aWNzLWNvbW1hbmQtbW9kdWxlJztcbmltcG9ydCB7IGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvY29tbWFuZCc7XG5pbXBvcnQgeyBPcHRpb24gfSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvdXRpbGl0aWVzL2pzb24tc2NoZW1hJztcblxuaW50ZXJmYWNlIEdlbmVyYXRlQ29tbWFuZEFyZ3MgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZEFyZ3Mge1xuICBzY2hlbWF0aWM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBHZW5lcmF0ZUNvbW1hbmRNb2R1bGVcbiAgZXh0ZW5kcyBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZVxuICBpbXBsZW1lbnRzIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbjxHZW5lcmF0ZUNvbW1hbmRBcmdzPlxue1xuICBjb21tYW5kID0gJ2dlbmVyYXRlJztcbiAgYWxpYXNlcyA9ICdnJztcbiAgZGVzY3JpYmUgPSAnR2VuZXJhdGVzIGFuZC9vciBtb2RpZmllcyBmaWxlcyBiYXNlZCBvbiBhIHNjaGVtYXRpYy4nO1xuICBsb25nRGVzY3JpcHRpb25QYXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIG92ZXJyaWRlIGFzeW5jIGJ1aWxkZXIoYXJndjogQXJndik6IFByb21pc2U8QXJndjxHZW5lcmF0ZUNvbW1hbmRBcmdzPj4ge1xuICAgIGxldCBsb2NhbFlhcmdzID0gKGF3YWl0IHN1cGVyLmJ1aWxkZXIoYXJndikpLmNvbW1hbmQoe1xuICAgICAgY29tbWFuZDogJyQwIDxzY2hlbWF0aWM+JyxcbiAgICAgIGRlc2NyaWJlOiAnUnVuIHRoZSBwcm92aWRlZCBzY2hlbWF0aWMuJyxcbiAgICAgIGJ1aWxkZXI6IChsb2NhbFlhcmdzKSA9PlxuICAgICAgICBsb2NhbFlhcmdzXG4gICAgICAgICAgLnBvc2l0aW9uYWwoJ3NjaGVtYXRpYycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnVGhlIFtjb2xsZWN0aW9uOnNjaGVtYXRpY10gdG8gcnVuLicsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGRlbWFuZE9wdGlvbjogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHJpY3QoKSxcbiAgICAgIGhhbmRsZXI6IChvcHRpb25zKSA9PiB0aGlzLmhhbmRsZXIob3B0aW9ucyBhcyBBcmd1bWVudHNDYW1lbENhc2U8R2VuZXJhdGVDb21tYW5kQXJncz4pLFxuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdIG9mIGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljc1RvUmVnaXN0ZXIoKSkge1xuICAgICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JCdWlsZGVyKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICBzY2hlbWFKc29uLFxuICAgICAgICAgIGFsaWFzZXM6IHNjaGVtYXRpY0FsaWFzZXMsXG4gICAgICAgICAgaGlkZGVuOiBzY2hlbWF0aWNIaWRkZW4sXG4gICAgICAgICAgZGVzY3JpcHRpb246IHNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICAgICAgICB9LFxuICAgICAgfSA9IGNvbGxlY3Rpb24uY3JlYXRlU2NoZW1hdGljKHNjaGVtYXRpY05hbWUsIHRydWUpO1xuXG4gICAgICBpZiAoIXNjaGVtYUpzb24pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgJ3gtZGVwcmVjYXRlZCc6IHhEZXByZWNhdGVkLFxuICAgICAgICBkZXNjcmlwdGlvbiA9IHNjaGVtYXRpY0Rlc2NyaXB0aW9uLFxuICAgICAgICBoaWRkZW4gPSBzY2hlbWF0aWNIaWRkZW4sXG4gICAgICB9ID0gc2NoZW1hSnNvbjtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbiwgc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5jb21tYW5kKHtcbiAgICAgICAgY29tbWFuZDogYXdhaXQgdGhpcy5nZW5lcmF0ZUNvbW1hbmRTdHJpbmcoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIG9wdGlvbnMpLFxuICAgICAgICAvLyBXaGVuICdkZXNjcmliZScgaXMgc2V0IHRvIGZhbHNlLCBpdCByZXN1bHRzIGluIGEgaGlkZGVuIGNvbW1hbmQuXG4gICAgICAgIGRlc2NyaWJlOiBoaWRkZW4gPT09IHRydWUgPyBmYWxzZSA6IHR5cGVvZiBkZXNjcmlwdGlvbiA9PT0gJ3N0cmluZycgPyBkZXNjcmlwdGlvbiA6ICcnLFxuICAgICAgICBkZXByZWNhdGVkOiB4RGVwcmVjYXRlZCA9PT0gdHJ1ZSB8fCB0eXBlb2YgeERlcHJlY2F0ZWQgPT09ICdzdHJpbmcnID8geERlcHJlY2F0ZWQgOiBmYWxzZSxcbiAgICAgICAgYWxpYXNlczogQXJyYXkuaXNBcnJheShzY2hlbWF0aWNBbGlhc2VzKVxuICAgICAgICAgID8gYXdhaXQgdGhpcy5nZW5lcmF0ZUNvbW1hbmRBbGlhc2VzU3RyaW5ncyhjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljQWxpYXNlcylcbiAgICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgYnVpbGRlcjogKGxvY2FsWWFyZ3MpID0+IHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBvcHRpb25zKS5zdHJpY3QoKSxcbiAgICAgICAgaGFuZGxlcjogKG9wdGlvbnMpID0+XG4gICAgICAgICAgdGhpcy5oYW5kbGVyKHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBzY2hlbWF0aWM6IGAke2NvbGxlY3Rpb25OYW1lfToke3NjaGVtYXRpY05hbWV9YCxcbiAgICAgICAgICB9IGFzIEFyZ3VtZW50c0NhbWVsQ2FzZTxcbiAgICAgICAgICAgIFNjaGVtYXRpY3NDb21tYW5kQXJncyAmIHtcbiAgICAgICAgICAgICAgc2NoZW1hdGljOiBzdHJpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgPiksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncy5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxHZW5lcmF0ZUNvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgZHJ5UnVuLCBzY2hlbWF0aWMsIGRlZmF1bHRzLCBmb3JjZSwgaW50ZXJhY3RpdmUsIC4uLnNjaGVtYXRpY09wdGlvbnMgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8oc2NoZW1hdGljKTtcblxuICAgIGlmICghY29sbGVjdGlvbk5hbWUgfHwgIXNjaGVtYXRpY05hbWUpIHtcbiAgICAgIHRocm93IG5ldyBDb21tYW5kTW9kdWxlRXJyb3IoJ0EgY29sbGVjdGlvbiBhbmQgc2NoZW1hdGljIGlzIHJlcXVpcmVkIGR1cmluZyBleGVjdXRpb24uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuU2NoZW1hdGljKHtcbiAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgIHNjaGVtYXRpY09wdGlvbnMsXG4gICAgICBleGVjdXRpb25PcHRpb25zOiB7XG4gICAgICAgIGRyeVJ1bixcbiAgICAgICAgZGVmYXVsdHMsXG4gICAgICAgIGZvcmNlLFxuICAgICAgICBpbnRlcmFjdGl2ZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldENvbGxlY3Rpb25OYW1lcygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICByZXR1cm4gY29sbGVjdGlvbk5hbWUgPyBbY29sbGVjdGlvbk5hbWVdIDogWy4uLihhd2FpdCB0aGlzLmdldFNjaGVtYXRpY0NvbGxlY3Rpb25zKCkpXTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2hvdWxkQWRkQ29sbGVjdGlvbk5hbWVBc1BhcnRPZkNvbW1hbmQoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgW2NvbGxlY3Rpb25OYW1lRnJvbUFyZ3NdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgICAvLyBwb3NpdGlvbmFsID0gW2dlbmVyYXRlLCBjb21wb25lbnRdIG9yIFtnZW5lcmF0ZV1cbiAgICAgIHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWxbMV0sXG4gICAgKTtcblxuICAgIGNvbnN0IHNjaGVtYXRpY0NvbGxlY3Rpb25zRnJvbUNvbmZpZyA9IGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoKTtcbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZXMgPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lcygpO1xuXG4gICAgLy8gT25seSBhZGQgdGhlIGNvbGxlY3Rpb24gbmFtZSBhcyBwYXJ0IG9mIHRoZSBjb21tYW5kIHdoZW4gaXQncyBub3QgYSBrbm93blxuICAgIC8vIHNjaGVtYXRpY3MgY29sbGVjdGlvbiBvciB3aGVuIGl0IGhhcyBiZWVuIHByb3ZpZGVkIHZpYSB0aGUgQ0xJLlxuICAgIC8vIEV4OmBuZyBnZW5lcmF0ZSBAc2NoZW1hdGljcy9hbmd1bGFyOmNgXG4gICAgcmV0dXJuIChcbiAgICAgICEhY29sbGVjdGlvbk5hbWVGcm9tQXJncyB8fFxuICAgICAgIWNvbGxlY3Rpb25OYW1lcy5zb21lKChjKSA9PiBzY2hlbWF0aWNDb2xsZWN0aW9uc0Zyb21Db25maWcuaGFzKGMpKVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgYW4gYWxpYXNlcyBzdHJpbmcgYXJyYXkgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb21tYW5kIGJ1aWxkZXIuXG4gICAqXG4gICAqIEBleGFtcGxlIGBbY29tcG9uZW50XWAgb3IgYFtAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudF1gLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUNvbW1hbmRBbGlhc2VzU3RyaW5ncyhcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIHNjaGVtYXRpY0FsaWFzZXM6IHN0cmluZ1tdLFxuICApOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgLy8gT25seSBhZGQgdGhlIGNvbGxlY3Rpb24gbmFtZSBhcyBwYXJ0IG9mIHRoZSBjb21tYW5kIHdoZW4gaXQncyBub3QgYSBrbm93blxuICAgIC8vIHNjaGVtYXRpY3MgY29sbGVjdGlvbiBvciB3aGVuIGl0IGhhcyBiZWVuIHByb3ZpZGVkIHZpYSB0aGUgQ0xJLlxuICAgIC8vIEV4OmBuZyBnZW5lcmF0ZSBAc2NoZW1hdGljcy9hbmd1bGFyOmNgXG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLnNob3VsZEFkZENvbGxlY3Rpb25OYW1lQXNQYXJ0T2ZDb21tYW5kKCkpXG4gICAgICA/IHNjaGVtYXRpY0FsaWFzZXMubWFwKChhbGlhcykgPT4gYCR7Y29sbGVjdGlvbk5hbWV9OiR7YWxpYXN9YClcbiAgICAgIDogc2NoZW1hdGljQWxpYXNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBhIGNvbW1hbmQgc3RyaW5nIHRvIGJlIHBhc3NlZCB0byB0aGUgY29tbWFuZCBidWlsZGVyLlxuICAgKlxuICAgKiBAZXhhbXBsZSBgY29tcG9uZW50IFtuYW1lXWAgb3IgYEBzY2hlbWF0aWNzL2FuZ3VsYXI6Y29tcG9uZW50IFtuYW1lXWAuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlQ29tbWFuZFN0cmluZyhcbiAgICBjb2xsZWN0aW9uTmFtZTogc3RyaW5nLFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgICBvcHRpb25zOiBPcHRpb25bXSxcbiAgKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBkYXNoZXJpemVkU2NoZW1hdGljTmFtZSA9IHN0cmluZ3MuZGFzaGVyaXplKHNjaGVtYXRpY05hbWUpO1xuXG4gICAgLy8gT25seSBhZGQgdGhlIGNvbGxlY3Rpb24gbmFtZSBhcyBwYXJ0IG9mIHRoZSBjb21tYW5kIHdoZW4gaXQncyBub3QgYSBrbm93blxuICAgIC8vIHNjaGVtYXRpY3MgY29sbGVjdGlvbiBvciB3aGVuIGl0IGhhcyBiZWVuIHByb3ZpZGVkIHZpYSB0aGUgQ0xJLlxuICAgIC8vIEV4OmBuZyBnZW5lcmF0ZSBAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudGBcbiAgICBjb25zdCBjb21tYW5kTmFtZSA9IChhd2FpdCB0aGlzLnNob3VsZEFkZENvbGxlY3Rpb25OYW1lQXNQYXJ0T2ZDb21tYW5kKCkpXG4gICAgICA/IGNvbGxlY3Rpb25OYW1lICsgJzonICsgZGFzaGVyaXplZFNjaGVtYXRpY05hbWVcbiAgICAgIDogZGFzaGVyaXplZFNjaGVtYXRpY05hbWU7XG5cbiAgICBjb25zdCBwb3NpdGlvbmFsQXJncyA9IG9wdGlvbnNcbiAgICAgIC5maWx0ZXIoKG8pID0+IG8ucG9zaXRpb25hbCAhPT0gdW5kZWZpbmVkKVxuICAgICAgLm1hcCgobykgPT4ge1xuICAgICAgICBjb25zdCBsYWJlbCA9IGAke3N0cmluZ3MuZGFzaGVyaXplKG8ubmFtZSl9JHtvLnR5cGUgPT09ICdhcnJheScgPyAnIC4uJyA6ICcnfWA7XG5cbiAgICAgICAgcmV0dXJuIG8ucmVxdWlyZWQgPyBgPCR7bGFiZWx9PmAgOiBgWyR7bGFiZWx9XWA7XG4gICAgICB9KVxuICAgICAgLmpvaW4oJyAnKTtcblxuICAgIHJldHVybiBgJHtjb21tYW5kTmFtZX0ke3Bvc2l0aW9uYWxBcmdzID8gJyAnICsgcG9zaXRpb25hbEFyZ3MgOiAnJ31gO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzY2hlbWF0aWNzIHRoYXQgY2FuIHRvIGJlIHJlZ2lzdGVyZWQgYXMgc3ViY29tbWFuZHMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jICpnZXRTY2hlbWF0aWNzKCk6IEFzeW5jR2VuZXJhdG9yPHtcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gICAgc2NoZW1hdGljQWxpYXNlcz86IFNldDxzdHJpbmc+O1xuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gIH0+IHtcbiAgICBjb25zdCBzZWVuTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGNvbGxlY3Rpb25OYW1lIG9mIGF3YWl0IHRoaXMuZ2V0Q29sbGVjdGlvbk5hbWVzKCkpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgICBmb3IgKGNvbnN0IHNjaGVtYXRpY05hbWUgb2YgY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXModHJ1ZSAvKiogaW5jbHVkZUhpZGRlbiAqLykpIHtcbiAgICAgICAgLy8gSWYgYSBzY2hlbWF0aWMgd2l0aCB0aGlzIHNhbWUgbmFtZSBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQgc2tpcC5cbiAgICAgICAgaWYgKCFzZWVuTmFtZXMuaGFzKHNjaGVtYXRpY05hbWUpKSB7XG4gICAgICAgICAgc2Vlbk5hbWVzLmFkZChzY2hlbWF0aWNOYW1lKTtcblxuICAgICAgICAgIHlpZWxkIHtcbiAgICAgICAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICAgICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgICAgIHNjaGVtYXRpY0FsaWFzZXM6IHRoaXMubGlzdFNjaGVtYXRpY0FsaWFzZXMoY29sbGVjdGlvbiwgc2NoZW1hdGljTmFtZSksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbGlzdFNjaGVtYXRpY0FsaWFzZXMoXG4gICAgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxGaWxlU3lzdGVtQ29sbGVjdGlvbkRlc2NyaXB0aW9uLCBGaWxlU3lzdGVtU2NoZW1hdGljRGVzY3JpcHRpb24+LFxuICAgIHNjaGVtYXRpY05hbWU6IHN0cmluZyxcbiAgKTogU2V0PHN0cmluZz4gfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gY29sbGVjdGlvbi5kZXNjcmlwdGlvbi5zY2hlbWF0aWNzW3NjaGVtYXRpY05hbWVdO1xuICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgcmV0dXJuIGRlc2NyaXB0aW9uLmFsaWFzZXMgJiYgbmV3IFNldChkZXNjcmlwdGlvbi5hbGlhc2VzKTtcbiAgICB9XG5cbiAgICAvLyBFeHRlbmRlZCBjb2xsZWN0aW9uc1xuICAgIGlmIChjb2xsZWN0aW9uLmJhc2VEZXNjcmlwdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgYmFzZSBvZiBjb2xsZWN0aW9uLmJhc2VEZXNjcmlwdGlvbnMpIHtcbiAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBiYXNlLnNjaGVtYXRpY3Nbc2NoZW1hdGljTmFtZV07XG4gICAgICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICAgIHJldHVybiBkZXNjcmlwdGlvbi5hbGlhc2VzICYmIG5ldyBTZXQoZGVzY3JpcHRpb24uYWxpYXNlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzY2hlbWF0aWNzIHRoYXQgc2hvdWxkIHRvIGJlIHJlZ2lzdGVyZWQgYXMgc3ViY29tbWFuZHMuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgc29ydGVkIGxpc3Qgb2Ygc2NoZW1hdGljIHRoYXQgbmVlZHMgdG8gYmUgcmVnaXN0ZXJlZCBhcyBzdWJjb21tYW5kcy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2V0U2NoZW1hdGljc1RvUmVnaXN0ZXIoKTogUHJvbWlzZTxcbiAgICBbc2NoZW1hdGljTmFtZTogc3RyaW5nLCBjb2xsZWN0aW9uTmFtZTogc3RyaW5nXVtdXG4gID4ge1xuICAgIGNvbnN0IHNjaGVtYXRpY3NUb1JlZ2lzdGVyOiBbc2NoZW1hdGljTmFtZTogc3RyaW5nLCBjb2xsZWN0aW9uTmFtZTogc3RyaW5nXVtdID0gW107XG4gICAgY29uc3QgWywgc2NoZW1hdGljTmFtZUZyb21BcmdzXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICBmb3IgYXdhaXQgKGNvbnN0IHsgc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY0FsaWFzZXMgfSBvZiB0aGlzLmdldFNjaGVtYXRpY3MoKSkge1xuICAgICAgaWYgKFxuICAgICAgICBzY2hlbWF0aWNOYW1lRnJvbUFyZ3MgJiZcbiAgICAgICAgKHNjaGVtYXRpY05hbWUgPT09IHNjaGVtYXRpY05hbWVGcm9tQXJncyB8fCBzY2hlbWF0aWNBbGlhc2VzPy5oYXMoc2NoZW1hdGljTmFtZUZyb21BcmdzKSlcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gW1tzY2hlbWF0aWNOYW1lLCBjb2xsZWN0aW9uTmFtZV1dO1xuICAgICAgfVxuXG4gICAgICBzY2hlbWF0aWNzVG9SZWdpc3Rlci5wdXNoKFtzY2hlbWF0aWNOYW1lLCBjb2xsZWN0aW9uTmFtZV0pO1xuICAgIH1cblxuICAgIC8vIERpZG4ndCBmaW5kIHRoZSBzY2hlbWF0aWMgb3Igbm8gc2NoZW1hdGljIG5hbWUgd2FzIHByb3ZpZGVkIEV4OiBgbmcgZ2VuZXJhdGUgLS1oZWxwYC5cbiAgICByZXR1cm4gc2NoZW1hdGljc1RvUmVnaXN0ZXIuc29ydCgoW25hbWVBXSwgW25hbWVCXSkgPT5cbiAgICAgIG5hbWVBLmxvY2FsZUNvbXBhcmUobmFtZUIsIHVuZGVmaW5lZCwgeyBzZW5zaXRpdml0eTogJ2FjY2VudCcgfSksXG4gICAgKTtcbiAgfVxufVxuIl19