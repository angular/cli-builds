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
            if (schematicsInCollection[schematicName].private) {
                continue;
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2dlbmVyYXRlL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBK0M7QUFPL0MsK0ZBR3lEO0FBQ3pELHFFQUFzRjtBQU90RixNQUFhLHFCQUNYLFNBQVEsbURBQXVCO0lBRGpDOztRQUlFLFlBQU8sR0FBRyxVQUFVLENBQUM7UUFDckIsWUFBTyxHQUFHLEdBQUcsQ0FBQztRQUNkLGFBQVEsR0FBRyx1REFBdUQsQ0FBQztJQTZJckUsQ0FBQztJQTFJVSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVU7UUFDL0IsSUFBSSxVQUFVLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQXNCO1lBQ3hFLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsUUFBUSxFQUFFLDZCQUE2QjtZQUN2QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUN0QixVQUFVO2lCQUNQLFVBQVUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3ZCLFFBQVEsRUFBRSxvQ0FBb0M7Z0JBQzlDLElBQUksRUFBRSxRQUFRO2dCQUNkLFlBQVksRUFBRSxJQUFJO2FBQ25CLENBQUM7aUJBQ0QsTUFBTSxFQUFFO1lBQ2IsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUM1QyxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sc0JBQXNCLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUM7UUFFakUsNEZBQTRGO1FBQzVGLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxFQUFFLHFCQUFxQixDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQjtRQUN2RCxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUNoQyxDQUFDO1FBRUYsSUFBSSxxQkFBcUIsSUFBSSxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEVBQUU7WUFDdEUsOEVBQThFO1lBQzlFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QixjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7U0FDM0M7UUFFRCxLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRTtZQUMxQyxJQUFJLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sRUFBRTtnQkFDakQsU0FBUzthQUNWO1lBRUQsTUFBTSxFQUNKLFdBQVcsRUFBRSxFQUNYLFVBQVUsRUFDVixPQUFPLEVBQUUsZ0JBQWdCLEVBQ3pCLE1BQU0sRUFBRSxlQUFlLEVBQ3ZCLFdBQVcsRUFBRSxvQkFBb0IsR0FDbEMsR0FDRixHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRXBELElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsU0FBUzthQUNWO1lBRUQsTUFBTSxFQUNKLGNBQWMsRUFBRSxXQUFXLEVBQzNCLFdBQVcsR0FBRyxvQkFBb0IsRUFDbEMsT0FBTyxHQUFHLGdCQUFnQixFQUMxQixNQUFNLEdBQUcsZUFBZSxHQUN6QixHQUFHLFVBQVUsQ0FBQztZQUNmLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFFcEYsVUFBVSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUM7Z0JBQzlCLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQztnQkFDakYsbUVBQW1FO2dCQUNuRSxRQUFRLEVBQUUsTUFBTSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDdEYsVUFBVSxFQUFFLFdBQVcsS0FBSyxJQUFJLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUs7Z0JBQ3pGLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBRSxPQUFvQixDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUNuRSxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUNyRixPQUFPLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUNuQixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxPQUFPLEVBQUUsU0FBUyxFQUFFLEdBQUcsY0FBYyxJQUFJLGFBQWEsRUFBRSxFQUFFLENBQUM7YUFDaEYsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxPQUFPLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLHFDQUEyQixDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBb0Q7UUFDNUQsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsR0FBRyxnQkFBZ0IsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUV6RixNQUFNLENBQUMsY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsYUFBYSxHQUFHLEVBQUUsQ0FBQyxHQUN6RSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFckMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ3ZCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsZ0JBQWdCO1lBQ2hCLGdCQUFnQixFQUFFO2dCQUNoQixNQUFNO2dCQUNOLFFBQVE7Z0JBQ1IsS0FBSztnQkFDTCxXQUFXO2FBQ1o7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQjtRQUM3QixNQUFNLENBQUMsY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCO1FBQzNGLG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQ2hDLENBQUM7UUFFRixPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLEtBQUssQ0FBQyxxQkFBcUIsQ0FDakMsY0FBc0IsRUFDdEIsYUFBcUIsRUFDckIsT0FBaUI7UUFFakIsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQjtRQUN0RCxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUNoQyxDQUFDO1FBRUYsTUFBTSx1QkFBdUIsR0FBRyxjQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWpFLHFJQUFxSTtRQUNySSxpREFBaUQ7UUFDakQsTUFBTSxXQUFXLEdBQ2YsQ0FBQyxDQUFDLHNCQUFzQjtZQUN4QixDQUFDLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDL0UsQ0FBQyxDQUFDLGNBQWMsR0FBRyxHQUFHLEdBQUcsdUJBQXVCO1lBQ2hELENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztRQUU5QixNQUFNLGNBQWMsR0FBRyxPQUFPO2FBQzNCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUM7YUFDekMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDVCxNQUFNLEtBQUssR0FBRyxHQUFHLGNBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBRS9FLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztRQUNsRCxDQUFDLENBQUM7YUFDRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFYixPQUFPLEdBQUcsV0FBVyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDdkUsQ0FBQztDQUNGO0FBbkpELHNEQW1KQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgQXJndiB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7XG4gIENvbW1hbmRNb2R1bGVJbXBsZW1lbnRhdGlvbixcbiAgT3B0aW9ucyxcbiAgT3RoZXJPcHRpb25zLFxufSBmcm9tICcuLi8uLi9jb21tYW5kLWJ1aWxkZXIvY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHtcbiAgU2NoZW1hdGljc0NvbW1hbmRBcmdzLFxuICBTY2hlbWF0aWNzQ29tbWFuZE1vZHVsZSxcbn0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3NjaGVtYXRpY3MtY29tbWFuZC1tb2R1bGUnO1xuaW1wb3J0IHsgZGVtYW5kQ29tbWFuZEZhaWx1cmVNZXNzYWdlIH0gZnJvbSAnLi4vLi4vY29tbWFuZC1idWlsZGVyL3V0aWxpdGllcy9jb21tYW5kJztcbmltcG9ydCB7IE9wdGlvbiB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci91dGlsaXRpZXMvanNvbi1zY2hlbWEnO1xuXG5pbnRlcmZhY2UgR2VuZXJhdGVDb21tYW5kQXJncyBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kQXJncyB7XG4gIHNjaGVtYXRpYz86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEdlbmVyYXRlQ29tbWFuZE1vZHVsZVxuICBleHRlbmRzIFNjaGVtYXRpY3NDb21tYW5kTW9kdWxlXG4gIGltcGxlbWVudHMgQ29tbWFuZE1vZHVsZUltcGxlbWVudGF0aW9uPEdlbmVyYXRlQ29tbWFuZEFyZ3M+XG57XG4gIGNvbW1hbmQgPSAnZ2VuZXJhdGUnO1xuICBhbGlhc2VzID0gJ2cnO1xuICBkZXNjcmliZSA9ICdHZW5lcmF0ZXMgYW5kL29yIG1vZGlmaWVzIGZpbGVzIGJhc2VkIG9uIGEgc2NoZW1hdGljLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgb3ZlcnJpZGUgYXN5bmMgYnVpbGRlcihhcmd2OiBBcmd2KTogUHJvbWlzZTxBcmd2PEdlbmVyYXRlQ29tbWFuZEFyZ3M+PiB7XG4gICAgbGV0IGxvY2FsWWFyZ3MgPSAoYXdhaXQgc3VwZXIuYnVpbGRlcihhcmd2KSkuY29tbWFuZDxHZW5lcmF0ZUNvbW1hbmRBcmdzPih7XG4gICAgICBjb21tYW5kOiAnJDAgPHNjaGVtYXRpYz4nLFxuICAgICAgZGVzY3JpYmU6ICdSdW4gdGhlIHByb3ZpZGVkIHNjaGVtYXRpYy4nLFxuICAgICAgYnVpbGRlcjogKGxvY2FsWWFyZ3MpID0+XG4gICAgICAgIGxvY2FsWWFyZ3NcbiAgICAgICAgICAucG9zaXRpb25hbCgnc2NoZW1hdGljJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6ICdUaGUgW2NvbGxlY3Rpb246c2NoZW1hdGljXSB0byBydW4uJyxcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgZGVtYW5kT3B0aW9uOiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnN0cmljdCgpLFxuICAgICAgaGFuZGxlcjogKG9wdGlvbnMpID0+IHRoaXMuaGFuZGxlcihvcHRpb25zKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZSgpO1xuICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5nZXRPckNyZWF0ZVdvcmtmbG93Rm9yQnVpbGRlcihjb2xsZWN0aW9uTmFtZSk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHdvcmtmbG93LmVuZ2luZS5jcmVhdGVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb25zdCBzY2hlbWF0aWNzSW5Db2xsZWN0aW9uID0gY29sbGVjdGlvbi5kZXNjcmlwdGlvbi5zY2hlbWF0aWNzO1xuXG4gICAgLy8gV2UgY2Fubm90IHVzZSBgY29sbGVjdGlvbi5saXN0U2NoZW1hdGljTmFtZXMoKWAgYXMgdGhpcyBkb2Vzbid0IHJldHVybiBoaWRkZW4gc2NoZW1hdGljcy5cbiAgICBjb25zdCBzY2hlbWF0aWNOYW1lcyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoc2NoZW1hdGljc0luQ29sbGVjdGlvbikuc29ydCgpKTtcbiAgICBjb25zdCBbLCBzY2hlbWF0aWNOYW1lRnJvbUFyZ3NdID0gdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8oXG4gICAgICAvLyBwb3NpdGlvbmFsID0gW2dlbmVyYXRlLCBjb21wb25lbnRdIG9yIFtnZW5lcmF0ZV1cbiAgICAgIHRoaXMuY29udGV4dC5hcmdzLnBvc2l0aW9uYWxbMV0sXG4gICAgKTtcblxuICAgIGlmIChzY2hlbWF0aWNOYW1lRnJvbUFyZ3MgJiYgc2NoZW1hdGljTmFtZXMuaGFzKHNjaGVtYXRpY05hbWVGcm9tQXJncykpIHtcbiAgICAgIC8vIE5vIG5lZWQgdG8gcHJvY2VzcyBhbGwgc2NoZW1hdGljcyBzaW5jZSB3ZSBrbm93IHdoaWNoIG9uZSB0aGUgdXNlciBpbnZva2VkLlxuICAgICAgc2NoZW1hdGljTmFtZXMuY2xlYXIoKTtcbiAgICAgIHNjaGVtYXRpY05hbWVzLmFkZChzY2hlbWF0aWNOYW1lRnJvbUFyZ3MpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc2NoZW1hdGljTmFtZSBvZiBzY2hlbWF0aWNOYW1lcykge1xuICAgICAgaWYgKHNjaGVtYXRpY3NJbkNvbGxlY3Rpb25bc2NoZW1hdGljTmFtZV0ucHJpdmF0ZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge1xuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgIHNjaGVtYUpzb24sXG4gICAgICAgICAgYWxpYXNlczogc2NoZW1hdGljQWxpYXNlcyxcbiAgICAgICAgICBoaWRkZW46IHNjaGVtYXRpY0hpZGRlbixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogc2NoZW1hdGljRGVzY3JpcHRpb24sXG4gICAgICAgIH0sXG4gICAgICB9ID0gY29sbGVjdGlvbi5jcmVhdGVTY2hlbWF0aWMoc2NoZW1hdGljTmFtZSwgdHJ1ZSk7XG5cbiAgICAgIGlmICghc2NoZW1hSnNvbikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge1xuICAgICAgICAneC1kZXByZWNhdGVkJzogeERlcHJlY2F0ZWQsXG4gICAgICAgIGRlc2NyaXB0aW9uID0gc2NoZW1hdGljRGVzY3JpcHRpb24sXG4gICAgICAgIGFsaWFzZXMgPSBzY2hlbWF0aWNBbGlhc2VzLFxuICAgICAgICBoaWRkZW4gPSBzY2hlbWF0aWNIaWRkZW4sXG4gICAgICB9ID0gc2NoZW1hSnNvbjtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCB0aGlzLmdldFNjaGVtYXRpY09wdGlvbnMoY29sbGVjdGlvbiwgc2NoZW1hdGljTmFtZSwgd29ya2Zsb3cpO1xuXG4gICAgICBsb2NhbFlhcmdzID0gbG9jYWxZYXJncy5jb21tYW5kKHtcbiAgICAgICAgY29tbWFuZDogYXdhaXQgdGhpcy5nZW5lcmF0ZUNvbW1hbmRTdHJpbmcoY29sbGVjdGlvbk5hbWUsIHNjaGVtYXRpY05hbWUsIG9wdGlvbnMpLFxuICAgICAgICAvLyBXaGVuICdkZXNjcmliZScgaXMgc2V0IHRvIGZhbHNlLCBpdCByZXN1bHRzIGluIGEgaGlkZGVuIGNvbW1hbmQuXG4gICAgICAgIGRlc2NyaWJlOiBoaWRkZW4gPT09IHRydWUgPyBmYWxzZSA6IHR5cGVvZiBkZXNjcmlwdGlvbiA9PT0gJ3N0cmluZycgPyBkZXNjcmlwdGlvbiA6ICcnLFxuICAgICAgICBkZXByZWNhdGVkOiB4RGVwcmVjYXRlZCA9PT0gdHJ1ZSB8fCB0eXBlb2YgeERlcHJlY2F0ZWQgPT09ICdzdHJpbmcnID8geERlcHJlY2F0ZWQgOiBmYWxzZSxcbiAgICAgICAgYWxpYXNlczogQXJyYXkuaXNBcnJheShhbGlhc2VzKSA/IChhbGlhc2VzIGFzIHN0cmluZ1tdKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgYnVpbGRlcjogKGxvY2FsWWFyZ3MpID0+IHRoaXMuYWRkU2NoZW1hT3B0aW9uc1RvQ29tbWFuZChsb2NhbFlhcmdzLCBvcHRpb25zKS5zdHJpY3QoKSxcbiAgICAgICAgaGFuZGxlcjogKG9wdGlvbnMpID0+XG4gICAgICAgICAgdGhpcy5oYW5kbGVyKHsgLi4ub3B0aW9ucywgc2NoZW1hdGljOiBgJHtjb2xsZWN0aW9uTmFtZX06JHtzY2hlbWF0aWNOYW1lfWAgfSksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxZYXJncy5kZW1hbmRDb21tYW5kKDEsIGRlbWFuZENvbW1hbmRGYWlsdXJlTWVzc2FnZSk7XG4gIH1cblxuICBhc3luYyBydW4ob3B0aW9uczogT3B0aW9uczxHZW5lcmF0ZUNvbW1hbmRBcmdzPiAmIE90aGVyT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHsgZHJ5UnVuLCBzY2hlbWF0aWMsIGRlZmF1bHRzLCBmb3JjZSwgaW50ZXJhY3RpdmUsIC4uLnNjaGVtYXRpY09wdGlvbnMgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBbY29sbGVjdGlvbk5hbWUgPSBhd2FpdCB0aGlzLmdldENvbGxlY3Rpb25OYW1lKCksIHNjaGVtYXRpY05hbWUgPSAnJ10gPVxuICAgICAgdGhpcy5wYXJzZVNjaGVtYXRpY0luZm8oc2NoZW1hdGljKTtcblxuICAgIHJldHVybiB0aGlzLnJ1blNjaGVtYXRpYyh7XG4gICAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICBzY2hlbWF0aWNPcHRpb25zLFxuICAgICAgZXhlY3V0aW9uT3B0aW9uczoge1xuICAgICAgICBkcnlSdW4sXG4gICAgICAgIGRlZmF1bHRzLFxuICAgICAgICBmb3JjZSxcbiAgICAgICAgaW50ZXJhY3RpdmUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRDb2xsZWN0aW9uTmFtZSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZSA9IGF3YWl0IHRoaXMuZ2V0RGVmYXVsdFNjaGVtYXRpY0NvbGxlY3Rpb24oKV0gPSB0aGlzLnBhcnNlU2NoZW1hdGljSW5mbyhcbiAgICAgIC8vIHBvc2l0aW9uYWwgPSBbZ2VuZXJhdGUsIGNvbXBvbmVudF0gb3IgW2dlbmVyYXRlXVxuICAgICAgdGhpcy5jb250ZXh0LmFyZ3MucG9zaXRpb25hbFsxXSxcbiAgICApO1xuXG4gICAgcmV0dXJuIGNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGEgY29tbWFuZCBzdHJpbmcgdG8gYmUgcGFzc2VkIHRvIHRoZSBjb21tYW5kIGJ1aWxkZXIuXG4gICAqXG4gICAqIEBleGFtcGxlIGBjb21wb25lbnQgW25hbWVdYCBvciBgQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQgW25hbWVdYC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVDb21tYW5kU3RyaW5nKFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgc2NoZW1hdGljTmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IE9wdGlvbltdLFxuICApOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IFtjb2xsZWN0aW9uTmFtZUZyb21BcmdzXSA9IHRoaXMucGFyc2VTY2hlbWF0aWNJbmZvKFxuICAgICAgLy8gcG9zaXRpb25hbCA9IFtnZW5lcmF0ZSwgY29tcG9uZW50XSBvciBbZ2VuZXJhdGVdXG4gICAgICB0aGlzLmNvbnRleHQuYXJncy5wb3NpdGlvbmFsWzFdLFxuICAgICk7XG5cbiAgICBjb25zdCBkYXNoZXJpemVkU2NoZW1hdGljTmFtZSA9IHN0cmluZ3MuZGFzaGVyaXplKHNjaGVtYXRpY05hbWUpO1xuXG4gICAgLy8gT25seSBhZGQgdGhlIGNvbGxlY3Rpb24gbmFtZSBhcyBwYXJ0IG9mIHRoZSBjb21tYW5kIHdoZW4gaXQncyBub3QgdGhlIGRlZmF1bHQgY29sbGVjdGlvbiBvciB3aGVuIGl0IGhhcyBiZWVuIHByb3ZpZGVkIHZpYSB0aGUgQ0xJLlxuICAgIC8vIEV4OmBuZyBnZW5lcmF0ZSBAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudGBcbiAgICBjb25zdCBjb21tYW5kTmFtZSA9XG4gICAgICAhIWNvbGxlY3Rpb25OYW1lRnJvbUFyZ3MgfHxcbiAgICAgIChhd2FpdCB0aGlzLmdldERlZmF1bHRTY2hlbWF0aWNDb2xsZWN0aW9uKCkpICE9PSAoYXdhaXQgdGhpcy5nZXRDb2xsZWN0aW9uTmFtZSgpKVxuICAgICAgICA/IGNvbGxlY3Rpb25OYW1lICsgJzonICsgZGFzaGVyaXplZFNjaGVtYXRpY05hbWVcbiAgICAgICAgOiBkYXNoZXJpemVkU2NoZW1hdGljTmFtZTtcblxuICAgIGNvbnN0IHBvc2l0aW9uYWxBcmdzID0gb3B0aW9uc1xuICAgICAgLmZpbHRlcigobykgPT4gby5wb3NpdGlvbmFsICE9PSB1bmRlZmluZWQpXG4gICAgICAubWFwKChvKSA9PiB7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gYCR7c3RyaW5ncy5kYXNoZXJpemUoby5uYW1lKX0ke28udHlwZSA9PT0gJ2FycmF5JyA/ICcgLi4nIDogJyd9YDtcblxuICAgICAgICByZXR1cm4gby5yZXF1aXJlZCA/IGA8JHtsYWJlbH0+YCA6IGBbJHtsYWJlbH1dYDtcbiAgICAgIH0pXG4gICAgICAuam9pbignICcpO1xuXG4gICAgcmV0dXJuIGAke2NvbW1hbmROYW1lfSR7cG9zaXRpb25hbEFyZ3MgPyAnICcgKyBwb3NpdGlvbmFsQXJncyA6ICcnfWA7XG4gIH1cbn1cbiJdfQ==