import {
  SchematicEngineHost,
  formatFiles,
  subscribeToWorkflow
} from "./chunk-JBLF2TH3.js";
import {
  CommandModule,
  CommandScope,
  EventCustomDimension,
  isPackageNameSafeForAnalytics,
  isTTY,
  memoize,
  parseJsonSchemaToOptions
} from "./chunk-YM7ILCS5.js";
import {
  assertIsError,
  getProjectByCwd,
  getSchematicDefaults
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/command-builder/schematics-command-module.js
import { normalize as devkitNormalize, schema } from "@angular-devkit/core";
import { UnsuccessfulWorkflowExecution, formats } from "@angular-devkit/schematics";
import { NodeWorkflow } from "@angular-devkit/schematics/tools";
import { relative } from "node:path";
var __runInitializers = function(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
    value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function")
      throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn)
      context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access)
      context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done)
        throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0)
        continue;
      if (result === null || typeof result !== "object")
        throw new TypeError("Object expected");
      if (_ = accept(result.get))
        descriptor.get = _;
      if (_ = accept(result.set))
        descriptor.set = _;
      if (_ = accept(result.init))
        initializers.unshift(_);
    } else if (_ = accept(result)) {
      if (kind === "field")
        initializers.unshift(_);
      else
        descriptor[key] = _;
    }
  }
  if (target)
    Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};
var DEFAULT_SCHEMATICS_COLLECTION = "@schematics/angular";
var SchematicsCommandModule = (() => {
  let _classSuper = CommandModule;
  let _instanceExtraInitializers = [];
  let _getOrCreateWorkflowForBuilder_decorators;
  let _getOrCreateWorkflowForExecution_decorators;
  let _getSchematicCollections_decorators;
  return class SchematicsCommandModule extends _classSuper {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _getOrCreateWorkflowForBuilder_decorators = [memoize];
      _getOrCreateWorkflowForExecution_decorators = [memoize];
      _getSchematicCollections_decorators = [memoize];
      __esDecorate(this, null, _getOrCreateWorkflowForBuilder_decorators, { kind: "method", name: "getOrCreateWorkflowForBuilder", static: false, private: false, access: { has: (obj) => "getOrCreateWorkflowForBuilder" in obj, get: (obj) => obj.getOrCreateWorkflowForBuilder }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _getOrCreateWorkflowForExecution_decorators, { kind: "method", name: "getOrCreateWorkflowForExecution", static: false, private: false, access: { has: (obj) => "getOrCreateWorkflowForExecution" in obj, get: (obj) => obj.getOrCreateWorkflowForExecution }, metadata: _metadata }, null, _instanceExtraInitializers);
      __esDecorate(this, null, _getSchematicCollections_decorators, { kind: "method", name: "getSchematicCollections", static: false, private: false, access: { has: (obj) => "getSchematicCollections" in obj, get: (obj) => obj.getSchematicCollections }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    scope = (__runInitializers(this, _instanceExtraInitializers), CommandScope.In);
    allowPrivateSchematics = false;
    async builder(argv) {
      return argv.option("interactive", {
        describe: "Enable interactive input prompts.",
        type: "boolean",
        default: true
      }).option("dry-run", {
        describe: "Run through and reports activity without writing out results.",
        type: "boolean",
        alias: ["d"],
        default: false
      }).option("defaults", {
        describe: "Disable interactive input prompts for options with a default.",
        type: "boolean",
        default: false
      }).option("force", {
        describe: "Force overwriting of existing files.",
        type: "boolean",
        default: false
      }).strict();
    }
    /** Get schematic schema options.*/
    async getSchematicOptions(collection, schematicName, workflow) {
      const schematic = collection.createSchematic(schematicName, true);
      const { schemaJson } = schematic.description;
      if (!schemaJson) {
        return [];
      }
      return parseJsonSchemaToOptions(workflow.registry, schemaJson);
    }
    getOrCreateWorkflowForBuilder(collectionName) {
      return new NodeWorkflow(this.context.root, {
        resolvePaths: this.getResolvePaths(collectionName),
        engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths)
      });
    }
    async getOrCreateWorkflowForExecution(collectionName, options) {
      const { logger, root, packageManager } = this.context;
      const { force, dryRun, packageRegistry } = options;
      const workflow = new NodeWorkflow(root, {
        force,
        dryRun,
        packageManager: packageManager.name,
        // A schema registry is required to allow customizing addUndefinedDefaults
        registry: new schema.CoreSchemaRegistry(formats.standardFormats),
        packageRegistry,
        resolvePaths: this.getResolvePaths(collectionName),
        schemaValidation: true,
        optionTransforms: [
          // Add configuration file defaults
          async (schematic, current) => {
            const projectName = typeof current?.project === "string" ? current.project : this.getProjectName();
            return {
              ...await getSchematicDefaults(schematic.collection.name, schematic.name, projectName),
              ...current
            };
          }
        ],
        engineHostCreator: (options2) => new SchematicEngineHost(options2.resolvePaths)
      });
      workflow.registry.addPostTransform(schema.transforms.addUndefinedDefaults);
      workflow.registry.useXDeprecatedProvider((msg) => logger.warn(msg));
      workflow.registry.addSmartDefaultProvider("projectName", () => this.getProjectName());
      const workingDir = devkitNormalize(relative(this.context.root, process.cwd()));
      workflow.registry.addSmartDefaultProvider("workingDirectory", () => workingDir === "" ? void 0 : workingDir);
      workflow.engineHost.registerOptionsTransform(async (schematic, options2) => {
        const { collection: { name: collectionName2 }, name: schematicName } = schematic;
        const analytics = isPackageNameSafeForAnalytics(collectionName2) ? await this.getAnalytics() : void 0;
        analytics?.reportSchematicRunEvent({
          [EventCustomDimension.SchematicCollectionName]: collectionName2,
          [EventCustomDimension.SchematicName]: schematicName,
          ...this.getAnalyticsParameters(options2)
        });
        return options2;
      });
      if (options.interactive !== false && isTTY()) {
        workflow.registry.usePromptProvider(async (definitions) => {
          let prompts;
          const answers = {};
          for (const definition of definitions) {
            if (options.defaults && definition.default !== void 0) {
              continue;
            }
            prompts ??= await import("@inquirer/prompts");
            switch (definition.type) {
              case "confirmation":
                answers[definition.id] = await prompts.confirm({
                  message: definition.message,
                  default: definition.default
                });
                break;
              case "list":
                if (!definition.items?.length) {
                  continue;
                }
                answers[definition.id] = await (definition.multiselect ? prompts.checkbox : prompts.select)({
                  message: definition.message,
                  validate: (values) => {
                    if (!definition.validator) {
                      return true;
                    }
                    return definition.validator(Object.values(values).map(({ value }) => value));
                  },
                  default: definition.multiselect ? void 0 : definition.default,
                  choices: definition.items?.map((item) => typeof item == "string" ? {
                    name: item,
                    value: item,
                    checked: definition.multiselect && Array.isArray(definition.default) ? definition.default?.includes(item) : item === definition.default
                  } : {
                    ...item,
                    name: item.label,
                    value: item.value,
                    checked: definition.multiselect && Array.isArray(definition.default) ? (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      definition.default?.includes(item.value)
                    ) : item.value === definition.default
                  })
                });
                break;
              case "input": {
                let finalValue;
                answers[definition.id] = await prompts.input({
                  message: definition.message,
                  default: definition.default,
                  async validate(value) {
                    if (definition.validator === void 0) {
                      return true;
                    }
                    let lastValidation = false;
                    for (const type of definition.propertyTypes) {
                      let potential;
                      switch (type) {
                        case "string":
                          potential = String(value);
                          break;
                        case "integer":
                        case "number":
                          potential = Number(value);
                          break;
                        default:
                          potential = value;
                          break;
                      }
                      lastValidation = await definition.validator(potential);
                      if (lastValidation === true) {
                        finalValue = potential;
                        return true;
                      }
                    }
                    return lastValidation;
                  }
                });
                if (finalValue !== void 0) {
                  answers[definition.id] = finalValue;
                }
                break;
              }
            }
          }
          return answers;
        });
      }
      return workflow;
    }
    async getSchematicCollections() {
      const getSchematicCollections = (configSection) => {
        if (!configSection) {
          return void 0;
        }
        const { schematicCollections } = configSection;
        if (Array.isArray(schematicCollections)) {
          return new Set(schematicCollections);
        }
        return void 0;
      };
      const { workspace, globalConfiguration } = this.context;
      if (workspace) {
        const project = getProjectByCwd(workspace);
        if (project) {
          const value2 = getSchematicCollections(workspace.getProjectCli(project));
          if (value2) {
            return value2;
          }
        }
      }
      const value = getSchematicCollections(workspace?.getCli()) ?? getSchematicCollections(globalConfiguration.getCli());
      if (value) {
        return value;
      }
      return /* @__PURE__ */ new Set([DEFAULT_SCHEMATICS_COLLECTION]);
    }
    parseSchematicInfo(schematic) {
      if (schematic?.includes(":")) {
        const [collectionName, schematicName] = schematic.split(":", 2);
        return [collectionName, schematicName];
      }
      return [void 0, schematic];
    }
    async runSchematic(options) {
      const { logger } = this.context;
      const { schematicOptions, executionOptions, collectionName, schematicName } = options;
      const workflow = await this.getOrCreateWorkflowForExecution(collectionName, executionOptions);
      if (!schematicName) {
        throw new Error("schematicName cannot be undefined.");
      }
      const { unsubscribe, files } = subscribeToWorkflow(workflow, logger);
      try {
        await workflow.execute({
          collection: collectionName,
          schematic: schematicName,
          options: schematicOptions,
          logger,
          allowPrivate: this.allowPrivateSchematics
        }).toPromise();
        if (!files.size) {
          logger.info("Nothing to be done.");
        }
        if (executionOptions.dryRun) {
          logger.warn(`
NOTE: The "--dry-run" option means no changes were made.`);
          return 0;
        }
        if (files.size) {
          try {
            await formatFiles(this.context.root, files);
          } catch (error) {
            assertIsError(error);
            logger.warn(`WARNING: Formatting of files failed with the following error: ${error.message}`);
          }
        }
        return 0;
      } catch (err) {
        if (err instanceof UnsuccessfulWorkflowExecution) {
          logger.fatal("The Schematic workflow failed. See above.");
        } else {
          assertIsError(err);
          logger.fatal(err.message);
        }
        return 1;
      } finally {
        unsubscribe();
      }
    }
    getProjectName() {
      const { workspace } = this.context;
      if (!workspace) {
        return void 0;
      }
      const projectName = getProjectByCwd(workspace);
      if (projectName) {
        return projectName;
      }
      return void 0;
    }
    getResolvePaths(collectionName) {
      const { workspace, root } = this.context;
      if (collectionName[0] === ".") {
        return [root];
      }
      return workspace ? (
        // Workspace
        collectionName === DEFAULT_SCHEMATICS_COLLECTION ? (
          // Favor import.meta.dirname for @schematics/angular to use the build-in version
          [import.meta.dirname, process.cwd(), root]
        ) : [process.cwd(), root, import.meta.dirname]
      ) : (
        // Global
        [import.meta.dirname, process.cwd()]
      );
    }
  };
})();

export {
  DEFAULT_SCHEMATICS_COLLECTION,
  SchematicsCommandModule
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
