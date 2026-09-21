import {
  ArchitectBaseCommandModule
} from "./chunk-DHWVZMLH.js";
import {
  CommandModuleError,
  memoize
} from "./chunk-YM7ILCS5.js";
import {
  getProjectByCwd
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/command-builder/architect-command-module.js
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
var ArchitectCommandModule = (() => {
  let _classSuper = ArchitectBaseCommandModule;
  let _instanceExtraInitializers = [];
  let _getProjectNamesByTarget_decorators;
  return class ArchitectCommandModule extends _classSuper {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
      _getProjectNamesByTarget_decorators = [memoize];
      __esDecorate(this, null, _getProjectNamesByTarget_decorators, { kind: "method", name: "getProjectNamesByTarget", static: false, private: false, access: { has: (obj) => "getProjectNamesByTarget" in obj, get: (obj) => obj.getProjectNamesByTarget }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    async builder(argv) {
      const target = this.getArchitectTarget();
      if (this.findDefaultBuilderName && this.context.workspace) {
        for (const [project2, projectDefinition] of this.context.workspace.projects) {
          const targetDefinition = projectDefinition.targets.get(target);
          if (targetDefinition?.builder) {
            continue;
          }
          const defaultBuilder = await this.findDefaultBuilderName(projectDefinition, {
            project: project2,
            target
          });
          if (!defaultBuilder) {
            continue;
          }
          if (targetDefinition) {
            targetDefinition.builder = defaultBuilder;
          } else {
            projectDefinition.targets.set(target, {
              builder: defaultBuilder
            });
          }
        }
      }
      const project = this.getArchitectProject();
      const { jsonHelp, getYargsCompletions, help } = this.context.args.options;
      const localYargs = argv.positional("project", {
        describe: "The name of the project to build. Can be an application or a library.",
        type: "string",
        // Hide choices from JSON help so that we don't display them in AIO.
        choices: jsonHelp ? void 0 : this.getProjectChoices()
      }).option("configuration", {
        describe: `One or more named builder configurations as a comma-separated list as specified in the "configurations" section in angular.json.
The builder uses the named configurations to run the given target.
For more information, see https://angular.dev/reference/configs/workspace-config#alternate-build-configurations.`,
        alias: "c",
        type: "string",
        // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
        // Also, hide choices from JSON help so that we don't display them in AIO.
        choices: (getYargsCompletions || help) && !jsonHelp && project ? this.getConfigurationChoices(project) : void 0
      }).strict();
      if (!project) {
        return localYargs;
      }
      const schemaOptions = await this.getArchitectTargetOptions({
        project,
        target
      });
      return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
    }
    async run(options) {
      const originalProcessTitle = process.title;
      try {
        const target = this.getArchitectTarget();
        const { configuration = "", project, ...architectOptions } = options;
        if (project) {
          process.title = `${originalProcessTitle} (${project})`;
          return await this.runSingleTarget({ configuration, target, project }, architectOptions);
        }
        let result = 0;
        const projectNames = this.getProjectNamesByTarget(target);
        if (!projectNames) {
          return this.onMissingTarget("Cannot determine project or target for command.");
        }
        for (const project2 of projectNames) {
          process.title = `${originalProcessTitle} (${project2})`;
          result |= await this.runSingleTarget({ configuration, target, project: project2 }, architectOptions);
        }
        return result;
      } finally {
        process.title = originalProcessTitle;
      }
    }
    getArchitectProject() {
      const { options, positional } = this.context.args;
      const [, projectName] = positional;
      if (projectName) {
        return projectName;
      }
      if (typeof options["project"] === "string") {
        return options["project"];
      }
      const target = this.getArchitectTarget();
      const projectFromTarget = this.getProjectNamesByTarget(target);
      return projectFromTarget?.length ? projectFromTarget[0] : void 0;
    }
    getProjectNamesByTarget(target) {
      const workspace = this.getWorkspaceOrThrow();
      const allProjectsForTargetName = [];
      for (const [name, project] of workspace.projects) {
        if (project.targets.has(target)) {
          allProjectsForTargetName.push(name);
        }
      }
      if (allProjectsForTargetName.length === 0) {
        return void 0;
      }
      if (this.multiTarget) {
        return allProjectsForTargetName;
      } else {
        if (allProjectsForTargetName.length === 1) {
          return allProjectsForTargetName;
        }
        const maybeProject = getProjectByCwd(workspace);
        if (maybeProject) {
          return allProjectsForTargetName.includes(maybeProject) ? [maybeProject] : void 0;
        }
        const { getYargsCompletions, help } = this.context.args.options;
        if (!getYargsCompletions && !help) {
          throw new CommandModuleError(`Cannot determine project for command.
This is a multi-project workspace and more than one project supports this command. Run "ng ${this.command}" to execute the command for a specific project or change the current working directory to a project directory.

Available projects are:
${allProjectsForTargetName.sort().map((p) => `- ${p}`).join("\n")}`);
        }
      }
      return void 0;
    }
    /** @returns a sorted list of project names to be used for auto completion. */
    getProjectChoices() {
      const { workspace } = this.context;
      return workspace ? [...workspace.projects.keys()].sort() : void 0;
    }
    /** @returns a sorted list of configuration names to be used for auto completion. */
    getConfigurationChoices(project) {
      const projectDefinition = this.context.workspace?.projects.get(project);
      if (!projectDefinition) {
        return void 0;
      }
      const target = this.getArchitectTarget();
      const configurations = projectDefinition.targets.get(target)?.configurations;
      return configurations ? Object.keys(configurations).sort() : void 0;
    }
    constructor() {
      super(...arguments);
      __runInitializers(this, _instanceExtraInitializers);
    }
  };
})();

export {
  ArchitectCommandModule
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
