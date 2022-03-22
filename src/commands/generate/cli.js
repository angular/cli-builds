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
                aliases: Array.isArray(aliases) ? aliases : undefined,
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
        const schematicCollectionsFromConfig = await this.getSchematicCollections();
        const collectionNames = await this.getCollectionNames();
        // Only add the collection name as part of the command when it's not a known
        // schematics collection or when it has been provided via the CLI.
        // Ex:`ng generate @schematics/angular:component`
        const commandName = !!collectionNameFromArgs ||
            !collectionNames.some((c) => schematicCollectionsFromConfig.has(c))
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
                    yield { schematicName, collectionName };
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
        for await (const { schematicName, collectionName } of this.getSchematics()) {
            if (schematicName === schematicNameFromArgs) {
                return [[schematicName, collectionName]];
            }
            schematicsToRegister.push([schematicName, collectionName]);
        }
        // Didn't find the schematic or no schematic name was provided Ex: `ng generate --help`.
        return schematicsToRegister.sort(([nameA], [nameB]) => nameA.localeCompare(nameB, undefined, { sensitivity: 'accent' }));
    }
}
exports.GenerateCommandModule = GenerateCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2dlbmVyYXRlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBK0M7QUFFL0MseUVBSzhDO0FBQzlDLCtGQUd5RDtBQUN6RCxxRUFBc0Y7QUFPdEYsTUFBYSxxQkFDWCxTQUFRLG1EQUF1QjtJQURqQzs7UUFJRSxZQUFPLEdBQUcsVUFBVSxDQUFDO1FBQ3JCLFlBQU8sR0FBRyxHQUFHLENBQUM7UUFDZCxhQUFRLEdBQUcsdURBQXVELENBQUM7SUFrTHJFLENBQUM7SUEvS1UsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFVO1FBQy9CLElBQUksVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFzQjtZQUN4RSxPQUFPLEVBQUUsZ0JBQWdCO1lBQ3pCLFFBQVEsRUFBRSw2QkFBNkI7WUFDdkMsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDdEIsVUFBVTtpQkFDUCxVQUFVLENBQUMsV0FBVyxFQUFFO2dCQUN2QixRQUFRLEVBQUUsb0NBQW9DO2dCQUM5QyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxZQUFZLEVBQUUsSUFBSTthQUNuQixDQUFDO2lCQUNELE1BQU0sRUFBRTtZQUNiLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDNUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLEVBQUU7WUFDbEYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFD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Ozs7T0FJRztJQUNLLEtBQUssQ0FBQyx1QkFBdUI7UUFHbkMsTUFBTSxvQkFBb0IsR0FBc0QsRUFBRSxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxFQUFFLHFCQUFxQixDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQjtRQUN2RCxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUNoQyxDQUFDO1FBRUYsSUFBSSxLQUFLLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDMUUsSUFBSSxhQUFhLEtBQUsscUJBQXFCLEVBQUU7Z0JBQzNDLE9BQU8sQ0FBQyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO2FBQzFDO1lBRUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7U0FDNUQ7UUFFRCx3RkFBd0Y7UUFDeEYsT0FBTyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUNwRCxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FDakUsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXhMRCxzREF3TEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IEFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQge1xuICBDb21tYW5kTW9kdWxlRXJyb3IsXG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgU2NoZW1hdGljc0NvbW1hbmRBcmdzLFxuICBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZSxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3NjaGVtYXRpY3MtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9jb21tYW5kJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5pbnRlcmZhY2UgR2VuZXJhdGVDb21tYW5kQXJncyBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIHNjaGVtYXRpYz86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEdlbmVyYXRlQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEdlbmVyYXRlQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnZ2VuZXJhdGUnO1xuICBhbGlhc2VzID0gJ2cnO1xuICBkZXNjcmliZSA9ICdHZW5lcmF0ZXMgYW5kL29yIG1vZGlmaWVzIGZpbGVzIGJhc2VkIG9uIGEgc2NoZW1hdGljLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PEdlbmVyYXRlQ29tbWFuZEFyZ3M+PiB7XG4gICAgbGV0IGxvY2FsWWFyZ3MgPSAoYXdhaXQgc3VwZXIuYnVpbGRlcihhcmd2KSkuY29tbWFuZDxHZW5lcmF0ZUNvbW1hbmRBcmdzPih7XG4gICAgICBjb21tYW5kOiAnJDAgPHNjaGVtYXRpYz4nLFxuICAgICAgZGVzY3JpYmU6ICdSdW4gdGhlIHByb3ZpZGVkIHNjaGVtYXRpYy4nLFxuICAgICAgYnVpbGRlcjogKGxvY2FsWWFyZ3MpID0+XG4gICAgICAgIGxvY2FsWWFyZ3NcbiAgICAgICAgICAucG9zaXRpb25hbCgnc2NoZW1hdGljJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6ICdUaGUgW2NvbGxlY3Rpb246c2NoZW1hdGljXSB0byBydW4uJyxcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgZGVtYW5kT3B0aW9uOiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnN0cmljdCgpLFxuICAgICAgaGFuZGxlcjogKG9wdGlvbnMpID0+IHRoaXMuaGFuZGxlcihvcHRpb25zKSxcbiAgICB9KTtcblxuICAgIGZvciAoY29uc3QgW3NjaGVtYXRpY05hbWUsIGNvbGxlY3Rpb25OYW1lXSBvZiBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY3NUb1JlZ2lzdGVyKCkpIHtcbiAgICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgICBjb25zdCBjb2xsZWN0aW9uID0gd29ya2Zsb3cuZW5naW5lLmNyZWF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgc2NoZW1hSnNvbixcbiAgICAgICAgICBhbGlhc2VzOiBzY2hlbWF0aWNBbGlhc2VzLFxuICAgICAgICAgIGhpZGRlbjogc2NoZW1hdGljSGlkZGVuLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBzY2hlbWF0aWNEZXNjcmlwdGlvbixcbiAgICAgICAgfSxcbiAgICAgIH0gPSBjb2xsZWN0aW9uLmNyZWF0ZVNjaGVtYXRpYyhzY2hlbWF0aWNOYW1lLCB0cnVlKTtcblxuICAgICAgaWYgKCFzY2hlbWFKc29uKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7XG4gICAgICAgICd4LWRlcHJlY2F0ZWQnOiB4RGVwcmVjYXRlZCxcbiAgICAgICAgZGVzY3JpcHRpb24gPSBzY2hlbWF0aWNEZXNjcmlwdGlvbixcbiAgICAgICAgYWxpYXNlcyA9IHNjaGVtYXRpY0FsaWFzZXMsXG4gICAgICAgIGhpZGRlbiA9IHNjaGVtYXRpY0hpZGRlbixcbiAgICAgIH0gPSBzY2hlbWFKc29uO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljT3B0aW9ucyhjb2xsZWN0aW9uLCBzY2hlbWF0aWNOYW1lLCB3b3JrZmxvdyk7XG5cbiAgICAgIGxvY2FsWWFyZ3MgPSBsb2NhbFlhcmdzLmNvbW1hbmQoe1xuICAgICAgICBjb21tYW5kOiBhd2FpdCB0aGlzLmdlbmVyYXRlQ29tbWFuZFN0cmluZyhjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZSwgb3B0aW9ucyksXG4gICAgICAgIC8vIFdoZW4gJ2Rlc2NyaWJlJyBpcyBzZXQgdG8gZmFsc2UsIGl0IHJlc3VsdHMgaW4gYSBoaWRkZW4gY29tbWFuZC5cbiAgICAgICAgZGVzY3JpYmU6IGhpZGRlbiA9PT0gdHJ1ZSA/IGZhbHNlIDogdHlwZW9mIGRlc2NyaXB0aW9uID09PSAnc3RyaW5nJyA/IGRlc2NyaXB0aW9uIDogJycsXG4gICAgICAgIGRlcHJlY2F0ZWQ6IHhEZXByZWNhdGVkID09PSB0cnVlIHx8IHR5cGVvZiB4RGVwcmVjYXRlZCA9PT0gJ3N0cmluZycgPyB4RGVwcmVjYXRlZCA6IGZhbHNlLFxuICAgICAgICBhbGlhc2VzOiBBcnJheS5pc0FycmF5KGFsaWFzZXMpID8gKGFsaWFzZXMgYXMgc3RyaW5nW10pIDogdW5kZWZpbmVkLFxuICAgICAgICBidWlsZGVyOiAobG9jYWxZYXJncykgPT4gdGhpcy5hZGRTY2hlbWFPcHRpb25zVG9Db21tYW5kKGxvY2FsWWFyZ3MsIG9wdGlvbnMpLnN0cmljdCgpLFxuICAgICAgICBoYW5kbGVyOiAob3B0aW9ucykgPT5cbiAgICAgICAgICB0aGlzLmhhbmRsZXIoeyAuLi5vcHRpb25zLCBzY2hlbWF0aWM6IGAke2NvbGxlY3Rpb25OYW1lfToke3NjaGVtYXRpY05hbWV9YCB9KSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBsb2NhbFlhcmdzLmRlbWFuZENvbW1hbmQoMSwgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bihvcHRpb25zOiBPcHRpb25zPEdlbmVyYXRlQ29tbWFuZEFyZ3M+ICYgT3RoZXJPcHRpb25zKTogUHJvbWlzZTxudW1iZXIgfCB2b2lkPiB7XG4gICAgY29uc3QgeyBkcnlSdW4sIHNjaGVtYXRpYywgZGVmYXVsdHMsIGZvcmNlLCBpbnRlcmFjdGl2ZSwgLi4uc2NoZW1hdGljT3B0aW9ucyB9ID0gb3B0aW9ucztcblxuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSwgc2NoZW1hdGljTmFtZV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhzY2hlbWF0aWMpO1xuXG4gICAgaWYgKCFjb2xsZWN0aW9uTmFtZSB8fCAhc2NoZW1hdGljTmFtZSkge1xuICAgICAgdGhyb3cgbmV3IENvbW1hbmRNb2R1bGVFcnJvcignQSBjb2xsZWN0aW9uIGFuZCBzY2hlbWF0aWMgaXMgcmVxdWlyZWQgZHVyaW5nIGV4ZWN1dGlvbi4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydW5TY2hlbWF0aWMoe1xuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgc2NoZW1hdGljT3B0aW9ucyxcbiAgICAgIGV4ZWN1dGlvbk9wdGlvbnM6IHtcbiAgICAgICAgZHJ5UnVuLFxuICAgICAgICBkZWZhdWx0cyxcbiAgICAgICAgZm9yY2UsXG4gICAgICAgIGludGVyYWN0aXZlLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0Q29sbGVjdGlvbk5hbWVzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWVdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgICAvLyBwb3NpdGlvbmFsID0gW2dlbmVyYXRlLCBjb21wb25lbnRdIG9yIFtnZW5lcmF0ZV1cbiAgICAgIHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWxbMV0sXG4gICAgKTtcblxuICAgIHJldHVybiBjb2xsZWN0aW9uTmFtZSA/IFtjb2xsZWN0aW9uTmFtZV0gOiBbLi4uKGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoKSldO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgY29tbWFuZCBzdHJpbmcgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb21tYW5kIGJ1aWxkZXIuXG4gICAqXG4gICAqIEBleGFtcGxlIGBjb21wb25lbnQgW25hbWVdYCBvciBgQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQgW25hbWVdYC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVDb21tYW5kU3RyaW5nKFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IE9wdGlvbltdLFxuICApOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZUZyb21BcmdzXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICBjb25zdCBkYXNoZXJpemVkU2NoZW1hdGljTmFtZSA9IHN0cmluZ3MuZGFzaGVyaXplKHNjaGVtYXRpY05hbWUpO1xuICAgIGNvbnN0IHNjaGVtYXRpY0NvbGxlY3Rpb25zRnJvbUNvbmZpZyA9IGF3YWl0IHRoaXMuZ2V0U2NoZW1hdGljQ29sbGVjdGlvbnMoKTtcbiAgICBjb25zdCBjb2xsZWN0aW9uTmFtZXMgPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lcygpO1xuXG4gICAgLy8gT25seSBhZGQgdGhlIGNvbGxlY3Rpb24gbmFtZSBhcyBwYXJ0IG9mIHRoZSBjb21tYW5kIHdoZW4gaXQncyBub3QgYSBrbm93blxuICAgIC8vIHNjaGVtYXRpY3MgY29sbGVjdGlvbiBvciB3aGVuIGl0IGhhcyBiZWVuIHByb3ZpZGVkIHZpYSB0aGUgQ0xJLlxuICAgIC8vIEV4OmBuZyBnZW5lcmF0ZSBAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudGBcbiAgICBjb25zdCBjb21tYW5kTmFtZSA9XG4gICAgICAhIWNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgfHxcbiAgICAgICFjb2xsZWN0aW9uTmFtZXMuc29tZSgoYykgPT4gc2NoZW1hdGljQ29sbGVjdGlvbnNGcm9tQ29uZmlnLmhhcyhjKSlcbiAgICAgICAgPyBjb2xsZWN0aW9uTmFtZSArICc6JyArIGRhc2hlcml6ZWRTY2hlbWF0aWNOYW1lXG4gICAgICAgIDogZGFzaGVyaXplZFNjaGVtYXRpY05hbWU7XG5cbiAgICBjb25zdCBwb3NpdGlvbmFsQXJncyA9IG9wdGlvbnNcbiAgICAgIC5maWx0ZXIoKG8pID0+IG8ucG9zaXRpb25hbCAhPT0gdW5kZWZpbmVkKVxuICAgICAgLm1hcCgobykgPT4ge1xuICAgICAgICBjb25zdCBsYWJlbCA9IGAke3N0cmluZ3MuZGFzaGVyaXplKG8ubmFtZSl9JHtvLnR5cGUgPT09ICdhcnJheScgPyAnIC4uJyA6ICcnfWA7XG5cbiAgICAgICAgcmV0dXJuIG8ucmVxdWlyZWQgPyBgPCR7bGFiZWx9PmAgOiBgWyR7bGFiZWx9XWA7XG4gICAgICB9KVxuICAgICAgLmpvaW4oJyAnKTtcblxuICAgIHJldHVybiBgJHtjb21tYW5kTmFtZX0ke3Bvc2l0aW9uYWxBcmdzID8gJyAnICsgcG9zaXRpb25hbEFyZ3MgOiAnJ31gO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzY2hlbWF0aWNzIHRoYXQgY2FuIHRvIGJlIHJlZ2lzdGVyZWQgYXMgc3ViY29tbWFuZHMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jICpnZXRTY2hlbWF0aWNzKCk6IEFzeW5jR2VuZXJhdG9yPHtcbiAgICBzY2hlbWF0aWNOYW1lOiBzdHJpbmc7XG4gICAgY29sbGVjdGlvbk5hbWU6IHN0cmluZztcbiAgfT4ge1xuICAgIGNvbnN0IHNlZW5OYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgY29sbGVjdGlvbk5hbWUgb2YgYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZXMoKSkge1xuICAgICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLmdldE9yQ3JlYXRlV29ya2Zsb3dGb3JCdWlsZGVyKGNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB3b3JrZmxvdy5lbmdpbmUuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG5cbiAgICAgIGZvciAoY29uc3Qgc2NoZW1hdGljTmFtZSBvZiBjb2xsZWN0aW9uLmxpc3RTY2hlbWF0aWNOYW1lcyh0cnVlIC8qKiBpbmNsdWRlSGlkZGVuICovKSkge1xuICAgICAgICAvLyBJZiBhIHNjaGVtYXRpYyB3aXRoIHRoaXMgc2FtZSBuYW1lIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCBza2lwLlxuICAgICAgICBpZiAoIXNlZW5OYW1lcy5oYXMoc2NoZW1hdGljTmFtZSkpIHtcbiAgICAgICAgICBzZWVuTmFtZXMuYWRkKHNjaGVtYXRpY05hbWUpO1xuICAgICAgICAgIHlpZWxkIHsgc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWUgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2NoZW1hdGljcyB0aGF0IHNob3VsZCB0byBiZSByZWdpc3RlcmVkIGFzIHN1YmNvbW1hbmRzLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIHNvcnRlZCBsaXN0IG9mIHNjaGVtYXRpYyB0aGF0IG5lZWRzIHRvIGJlIHJlZ2lzdGVyZWQgYXMgc3ViY29tbWFuZHMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGdldFNjaGVtYXRpY3NUb1JlZ2lzdGVyKCk6IFByb21pc2U8XG4gICAgW3NjaGVtYXRpY05hbWU6IHN0cmluZywgY29sbGVjdGlvbk5hbWU6IHN0cmluZ11bXVxuICA+IHtcbiAgICBjb25zdCBzY2hlbWF0aWNzVG9SZWdpc3RlcjogW3NjaGVtYXRpY05hbWU6IHN0cmluZywgY29sbGVjdGlvbk5hbWU6IHN0cmluZ11bXSA9IFtdO1xuICAgIGNvbnN0IFssIHNjaGVtYXRpY05hbWVGcm9tQXJnc10gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgZm9yIGF3YWl0IChjb25zdCB7IHNjaGVtYXRpY05hbWUsIGNvbGxlY3Rpb25OYW1lIH0gb2YgdGhpcy5nZXRTY2hlbWF0aWNzKCkpIHtcbiAgICAgIGlmIChzY2hlbWF0aWNOYW1lID09PSBzY2hlbWF0aWNOYW1lRnJvbUFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIFtbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdXTtcbiAgICAgIH1cblxuICAgICAgc2NoZW1hdGljc1RvUmVnaXN0ZXIucHVzaChbc2NoZW1hdGljTmFtZSwgY29sbGVjdGlvbk5hbWVdKTtcbiAgICB9XG5cbiAgICAvLyBEaWRuJ3QgZmluZCB0aGUgc2NoZW1hdGljIG9yIG5vIHNjaGVtYXRpYyBuYW1lIHdhcyBwcm92aWRlZCBFeDogYG5nIGdlbmVyYXRlIC0taGVscGAuXG4gICAgcmV0dXJuIHNjaGVtYXRpY3NUb1JlZ2lzdGVyLnNvcnQoKFtuYW1lQV0sIFtuYW1lQl0pID0+XG4gICAgICBuYW1lQS5sb2NhbGVDb21wYXJlKG5hbWVCLCB1bmRlZmluZWQsIHsgc2Vuc2l0aXZpdHk6ICdhY2NlbnQnIH0pLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==