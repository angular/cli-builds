import {
  DEFAULT_SCHEMATICS_COLLECTION,
  SchematicsCommandModule
} from "./chunk-Q67GOPL7.js";
import "./chunk-JBLF2TH3.js";
import {
  RootCommands
} from "./chunk-LRL5U6GP.js";
import {
  CommandScope
} from "./chunk-YM7ILCS5.js";
import {
  VERSION
} from "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/new/long-description.md
var long_description_default = "Creates and initializes a new Angular application that is the default project for a new workspace.\n\nProvides interactive prompts for optional configuration, such as adding routing support.\nAll prompts can safely be allowed to default.\n\n- The new workspace folder is given the specified project name, and contains configuration files at the top level.\n\n- By default, the files for a new initial application (with the same name as the workspace) are placed in the `src/` subfolder.\n- The new application's configuration appears in the `projects` section of the `angular.json` workspace configuration file, under its project name.\n\n- Subsequent applications that you generate in the workspace reside in the `projects/` subfolder.\n\nIf you plan to have multiple applications in the workspace, you can create an empty workspace by using the `--no-create-application` option.\nYou can then use `ng generate application` to create an initial application.\nThis allows a workspace name different from the initial app name, and ensures that all applications reside in the `/projects` subfolder, matching the structure of the configuration file.\n";

// packages/angular/cli/src/commands/new/cli.js
var NewCommandModule = class extends SchematicsCommandModule {
  schematicName = "ng-new";
  scope = CommandScope.Out;
  allowPrivateSchematics = true;
  command = "new [name]";
  aliases = RootCommands["new"].aliases;
  describe = "Creates a new Angular workspace.";
  longDescription = long_description_default;
  async builder(argv) {
    const localYargs = (await super.builder(argv)).option("collection", {
      alias: "c",
      describe: "A collection of schematics to use in generating the initial application.",
      type: "string"
    });
    const { options: { collection: collectionNameFromArgs } } = this.context.args;
    const collectionName = typeof collectionNameFromArgs === "string" ? collectionNameFromArgs : await this.getCollectionFromConfig();
    const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
    const collection = workflow.engine.createCollection(collectionName);
    const options = await this.getSchematicOptions(collection, this.schematicName, workflow);
    return this.addSchemaOptionsToCommand(localYargs, options);
  }
  async run(options) {
    const collectionName = options.collection ?? await this.getCollectionFromConfig();
    const { dryRun, force, interactive, defaults, collection, ...schematicOptions } = options;
    const workflow = await this.getOrCreateWorkflowForExecution(collectionName, {
      dryRun,
      force,
      interactive,
      defaults
    });
    workflow.registry.addSmartDefaultProvider("ng-cli-version", () => VERSION.full);
    workflow.registry.addSmartDefaultProvider("packageManager", () => this.context.packageManager.name);
    return this.runSchematic({
      collectionName,
      schematicName: this.schematicName,
      schematicOptions,
      executionOptions: {
        dryRun,
        force,
        interactive,
        defaults
      }
    });
  }
  /** Find a collection from config that has an `ng-new` schematic. */
  async getCollectionFromConfig() {
    for (const collectionName of await this.getSchematicCollections()) {
      const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
      const collection = workflow.engine.createCollection(collectionName);
      const schematicsInCollection = collection.description.schematics;
      if (Object.keys(schematicsInCollection).includes(this.schematicName)) {
        return collectionName;
      }
    }
    return DEFAULT_SCHEMATICS_COLLECTION;
  }
};
export {
  NewCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
