import {
  SchematicsCommandModule
} from "./chunk-Q67GOPL7.js";
import "./chunk-JBLF2TH3.js";
import {
  RootCommands
} from "./chunk-LRL5U6GP.js";
import {
  demandCommandFailureMessage
} from "./chunk-G7TRU43D.js";
import {
  CommandModuleError
} from "./chunk-YM7ILCS5.js";
import "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/generate/cli.js
import { strings } from "@angular-devkit/core";
var GenerateCommandModule = class extends SchematicsCommandModule {
  command = "generate";
  aliases = RootCommands["generate"].aliases;
  describe = "Generates and/or modifies files based on a schematic.";
  async builder(argv) {
    let localYargs = (await super.builder(argv)).command({
      command: "$0 <schematic>",
      describe: "Run the provided schematic.",
      builder: (localYargs2) => localYargs2.positional("schematic", {
        describe: "The [collection:schematic] to run.",
        type: "string",
        demandOption: true
      }).strict(),
      handler: (options) => this.handler(options)
    });
    for (const [schematicName, collectionName] of await this.getSchematicsToRegister()) {
      const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
      const collection = workflow.engine.createCollection(collectionName);
      const { description: { schemaJson, aliases: schematicAliases, hidden: schematicHidden, description: schematicDescription } } = collection.createSchematic(schematicName, true);
      if (!schemaJson) {
        continue;
      }
      const { "x-deprecated": xDeprecated, description = schematicDescription, hidden = schematicHidden } = schemaJson;
      const options = await this.getSchematicOptions(collection, schematicName, workflow);
      localYargs = localYargs.command({
        command: await this.generateCommandString(collectionName, schematicName, options),
        // When 'describe' is set to false, it results in a hidden command.
        describe: hidden === true ? false : typeof description === "string" ? description : "",
        deprecated: xDeprecated === true || typeof xDeprecated === "string" ? xDeprecated : false,
        aliases: Array.isArray(schematicAliases) ? await this.generateCommandAliasesStrings(collectionName, schematicAliases) : void 0,
        builder: (localYargs2) => this.addSchemaOptionsToCommand(localYargs2, options).strict(),
        handler: (options2) => this.handler({
          ...options2,
          schematic: `${collectionName}:${schematicName}`
        })
      });
    }
    return localYargs.demandCommand(1, demandCommandFailureMessage);
  }
  async run(options) {
    const { dryRun, schematic, defaults, force, interactive, ...schematicOptions } = options;
    const [collectionName, schematicName] = this.parseSchematicInfo(schematic);
    if (!collectionName || !schematicName) {
      throw new CommandModuleError("A collection and schematic is required during execution.");
    }
    return this.runSchematic({
      collectionName,
      schematicName,
      schematicOptions,
      executionOptions: {
        dryRun,
        defaults,
        force,
        interactive
      }
    });
  }
  async getCollectionNames() {
    const [collectionName] = this.parseSchematicInfo(
      // positional = [generate, component] or [generate]
      this.context.args.positional[1]
    );
    return collectionName ? [collectionName] : [...await this.getSchematicCollections()];
  }
  async shouldAddCollectionNameAsPartOfCommand() {
    const [collectionNameFromArgs] = this.parseSchematicInfo(
      // positional = [generate, component] or [generate]
      this.context.args.positional[1]
    );
    const schematicCollectionsFromConfig = await this.getSchematicCollections();
    const collectionNames = await this.getCollectionNames();
    return !!collectionNameFromArgs || !collectionNames.some((c) => schematicCollectionsFromConfig.has(c));
  }
  /**
   * Generate an aliases string array to be passed to the command builder.
   *
   * @example `[component]` or `[@schematics/angular:component]`.
   */
  async generateCommandAliasesStrings(collectionName, schematicAliases) {
    return await this.shouldAddCollectionNameAsPartOfCommand() ? schematicAliases.map((alias) => `${collectionName}:${alias}`) : schematicAliases;
  }
  /**
   * Generate a command string to be passed to the command builder.
   *
   * @example `component [name]` or `@schematics/angular:component [name]`.
   */
  async generateCommandString(collectionName, schematicName, options) {
    const dasherizedSchematicName = strings.dasherize(schematicName);
    const commandName = await this.shouldAddCollectionNameAsPartOfCommand() ? collectionName + ":" + dasherizedSchematicName : dasherizedSchematicName;
    const positionalArgs = options.filter((o) => o.positional !== void 0).map((o) => {
      const label = `${strings.dasherize(o.name)}${o.type === "array" ? " .." : ""}`;
      return o.required ? `<${label}>` : `[${label}]`;
    }).join(" ");
    return `${commandName}${positionalArgs ? " " + positionalArgs : ""}`;
  }
  /**
   * Get schematics that can to be registered as subcommands.
   */
  async *getSchematics() {
    const seenNames = /* @__PURE__ */ new Set();
    for (const collectionName of await this.getCollectionNames()) {
      const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
      const collection = workflow.engine.createCollection(collectionName);
      for (const schematicName of collection.listSchematicNames(
        true
        /** includeHidden */
      )) {
        if (!seenNames.has(schematicName)) {
          seenNames.add(schematicName);
          yield {
            schematicName,
            collectionName,
            schematicAliases: this.listSchematicAliases(collection, schematicName)
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
    if (collection.baseDescriptions) {
      for (const base of collection.baseDescriptions) {
        const description2 = base.schematics[schematicName];
        if (description2) {
          return description2.aliases && new Set(description2.aliases);
        }
      }
    }
    return void 0;
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
      this.context.args.positional[1]
    );
    for await (const { schematicName, collectionName, schematicAliases } of this.getSchematics()) {
      if (schematicNameFromArgs && (schematicName === schematicNameFromArgs || schematicAliases?.has(schematicNameFromArgs))) {
        return [[schematicName, collectionName]];
      }
      schematicsToRegister.push([schematicName, collectionName]);
    }
    return schematicsToRegister.sort(([nameA], [nameB]) => nameA.localeCompare(nameB, void 0, { sensitivity: "accent" }));
  }
};
export {
  GenerateCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
