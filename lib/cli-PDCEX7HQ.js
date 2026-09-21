import {
  SchematicsCommandModule
} from "./chunk-Q67GOPL7.js";
import "./chunk-JBLF2TH3.js";
import {
  CommandModuleError,
  isTTY
} from "./chunk-YM7ILCS5.js";
import {
  VERSION
} from "./chunk-XG3HVNIL.js";
import "./chunk-GHUUJYOY.js";
import {
  assertIsError
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/add/cli.js
import { Listr, color, figures } from "listr2";
import assert from "node:assert";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import npa from "npm-package-arg";
import semver, { compare, intersects, prerelease, satisfies, valid } from "semver";

// packages/angular/cli/src/commands/add/long-description.md
var long_description_default = "Adds the npm package for a published library to your workspace, and configures\nthe project in the current working directory to use that library, as specified by the library's schematic.\nFor example, adding `@angular/pwa` configures your project for PWA support:\n\n```bash\nng add @angular/pwa\n```\n";

// packages/angular/cli/src/commands/add/cli.js
var CommandError = class extends Error {
};
var packageVersionExclusions = {
  // @angular/localize@9.x and earlier versions as well as @angular/localize@10.0 prereleases do not have peer dependencies setup.
  "@angular/localize": "<10.0.0",
  // @angular/material@7.x versions have unbounded peer dependency ranges (>=7.0.0).
  "@angular/material": "7.x"
};
var DEFAULT_CONFLICT_DISPLAY_LIMIT = 5;
var BUILT_IN_SCHEMATICS = {
  tailwindcss: {
    collection: "@schematics/angular",
    name: "tailwind"
  },
  "@vitest/browser-playwright": {
    collection: "@schematics/angular",
    name: "vitest-browser"
  },
  "@vitest/browser-webdriverio": {
    collection: "@schematics/angular",
    name: "vitest-browser"
  },
  "@vitest/browser-preview": {
    collection: "@schematics/angular",
    name: "vitest-browser"
  }
};
var AddCommandModule = class extends SchematicsCommandModule {
  command = "add <collection>";
  describe = "Adds support for an external library to your project.";
  longDescription = long_description_default;
  allowPrivateSchematics = true;
  schematicName = "ng-add";
  rootRequire = createRequire(this.context.root + "/");
  #projectVersionCache = /* @__PURE__ */ new Map();
  #rootManifestCache = null;
  async builder(argv) {
    const localYargs = (await super.builder(argv)).positional("collection", {
      description: "The package to be added.",
      type: "string",
      demandOption: true
    }).option("registry", { description: "The NPM registry to use.", type: "string" }).option("verbose", {
      description: "Display additional details about internal operations during execution.",
      type: "boolean",
      default: false
    }).option("skip-confirmation", {
      description: "Skip asking a confirmation prompt before installing and executing the package. Ensure package name is correct prior to using this option.",
      type: "boolean",
      default: false
    }).check(({ registry }) => {
      if (registry === void 0) {
        return true;
      }
      if (typeof registry === "string" && URL.canParse(registry)) {
        return true;
      }
      throw new CommandModuleError("Option --registry must be a valid URL.");
    }).strict(false);
    const collectionName = this.getCollectionName();
    if (!collectionName) {
      return localYargs;
    }
    const workflow = this.getOrCreateWorkflowForBuilder(collectionName);
    try {
      const collection = workflow.engine.createCollection(collectionName);
      const options = await this.getSchematicOptions(collection, this.schematicName, workflow);
      return this.addSchemaOptionsToCommand(localYargs, options);
    } catch (error) {
    }
    return localYargs;
  }
  async run(options) {
    this.#projectVersionCache.clear();
    this.#rootManifestCache = null;
    const { logger } = this.context;
    const { collection, skipConfirmation } = options;
    let packageIdentifier;
    try {
      packageIdentifier = npa(collection);
    } catch (e) {
      assertIsError(e);
      logger.error(e.message);
      return 1;
    }
    if (packageIdentifier.name && packageIdentifier.registry && this.isPackageInstalled(packageIdentifier.name)) {
      const validVersion = await this.isProjectVersionValid(packageIdentifier);
      if (validVersion) {
        logger.info("Skipping installation: Package already installed");
        return this.executeSchematic({ ...options, collection: packageIdentifier.name });
      }
    }
    const taskContext = {
      packageIdentifier,
      isExactVersion: packageIdentifier.type === "version",
      executeSchematic: this.executeSchematic.bind(this),
      getPeerDependencyConflicts: this.getPeerDependencyConflicts.bind(this),
      dryRun: options.dryRun
    };
    const tasks = new Listr([
      {
        title: "Determining Package Manager",
        task: (_context, task) => task.output = `Using package manager: ${color.dim(this.context.packageManager.name)}`,
        rendererOptions: { persistentOutput: true }
      },
      {
        title: "Searching for compatible package version",
        enabled: packageIdentifier.type === "range" && packageIdentifier.rawSpec === "*",
        task: (context, task) => this.findCompatiblePackageVersionTask(context, task, options),
        rendererOptions: { persistentOutput: true }
      },
      {
        title: "Loading package information",
        task: (context, task) => this.loadPackageInfoTask(context, task, options),
        rendererOptions: { persistentOutput: true }
      },
      {
        title: "Confirming installation",
        enabled: !skipConfirmation && !options.dryRun,
        task: (context, task) => this.confirmInstallationTask(context, task),
        rendererOptions: { persistentOutput: true }
      },
      {
        title: "Installing package",
        skip: (context) => {
          if (context.dryRun) {
            return `Skipping package installation. Would install package ${color.blue(context.packageIdentifier.toString())}.`;
          }
          return false;
        },
        task: (context, task) => this.installPackageTask(context, task, options),
        rendererOptions: { bottomBar: Infinity }
      }
      // TODO: Rework schematic execution as a task and insert here
    ], {
      /* options */
    });
    try {
      const result = await tasks.run(taskContext);
      assert(result.collectionName, "Collection name should always be available");
      let shouldCleanUp = false;
      if (!result.hasSchematics && !options.dryRun) {
        const packageJsonPath = this.resolvePackageJson(result.collectionName);
        if (packageJsonPath && existsSync(packageJsonPath)) {
          try {
            const localManifest = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
            if (localManifest.schematics) {
              result.hasSchematics = true;
              if (localManifest["ng-add"]?.save === false) {
                shouldCleanUp = true;
              }
            } else {
              await this.cleanUpTemporaryDependency(result.collectionName);
              shouldCleanUp = false;
            }
          } catch {
          }
        }
      }
      if (result.hasSchematics && !options.dryRun) {
        const workflow = this.getOrCreateWorkflowForBuilder(result.collectionName);
        const collection2 = workflow.engine.createCollection(result.collectionName);
        try {
          collection2.createSchematic(this.schematicName, true);
        } catch {
          result.hasSchematics = false;
        }
      }
      if (!result.hasSchematics) {
        const packageName = result.packageIdentifier.name;
        if (packageName) {
          const builtInSchematic = BUILT_IN_SCHEMATICS[packageName];
          if (builtInSchematic) {
            logger.info(`The ${color.blue(packageName)} package does not provide \`ng add\` actions.`);
            logger.info("The Angular CLI will use built-in actions to add it to your project.");
            return this.executeSchematic({
              ...options,
              collection: builtInSchematic.collection,
              schematicName: builtInSchematic.name,
              package: packageName
            });
          }
        }
        let message = options.dryRun ? "The package does not provide any `ng add` actions, so no further actions would be taken." : "Package installed successfully. The package does not provide any `ng add` actions, so no further actions were taken.";
        if (result.homepage) {
          message += `
For more information about this package, visit its homepage at ${result.homepage}`;
        }
        logger.info(message);
        return;
      }
      if (options.dryRun) {
        logger.info("The package's `ng add` actions would be executed next.");
        return;
      }
      const schematicExitCode = await this.executeSchematic({
        ...options,
        collection: result.collectionName
      });
      if (shouldCleanUp) {
        await this.cleanUpTemporaryDependency(result.collectionName);
      }
      return schematicExitCode;
    } catch (e) {
      if (e instanceof CommandError) {
        logger.error(e.message);
        return 1;
      }
      throw e;
    }
  }
  async findCompatiblePackageVersionTask(context, task, options) {
    const { registry, verbose } = options;
    const { packageIdentifier } = context;
    const { packageManager } = this.context;
    const packageName = packageIdentifier.name;
    assert(packageName, "Registry package identifiers should always have a name.");
    const rejectionReasons = [];
    try {
      const latestManifest = await packageManager.getManifest(`${packageName}@latest`, {
        registry
      });
      if (latestManifest) {
        const conflicts = await this.getPeerDependencyConflicts(latestManifest);
        if (!conflicts) {
          context.packageIdentifier = npa.resolve(latestManifest.name, latestManifest.version);
          task.output = `Found compatible package version: ${color.blue(latestManifest.version)}.`;
          return;
        }
        rejectionReasons.push(...conflicts);
      }
    } catch (e) {
      assertIsError(e);
      throw new CommandError(`Unable to load package information from registry: ${e.message}`);
    }
    task.output = "Could not find a compatible version with `latest`. Searching for a compatible version.";
    let packageMetadata;
    try {
      packageMetadata = await packageManager.getRegistryMetadata(packageName, {
        registry
      });
    } catch (e) {
      assertIsError(e);
      throw new CommandError(`Unable to load package information from registry: ${e.message}`);
    }
    if (!packageMetadata) {
      throw new CommandError("Unable to load package information from registry.");
    }
    const allowPrereleases = !!prerelease(VERSION.full) || VERSION.full === "0.0.0";
    const potentialVersions = this.#getPotentialVersions(packageMetadata, allowPrereleases);
    const majorVersions = this.#getMajorVersions(potentialVersions);
    let found = await this.#findCompatibleVersion(context, majorVersions, {
      registry,
      verbose,
      rejectionReasons
    });
    if (!found) {
      const checkedVersions = new Set(majorVersions);
      const remainingVersions = potentialVersions.filter((v) => !checkedVersions.has(v));
      found = await this.#findCompatibleVersion(context, remainingVersions, {
        registry,
        verbose,
        rejectionReasons
      });
    }
    if (!found) {
      let message = `Unable to find compatible package.`;
      if (rejectionReasons.length > 0) {
        message += "\nThis is often because of incompatible peer dependencies.\nThese versions were rejected due to the following conflicts:\n" + rejectionReasons.slice(0, verbose ? void 0 : DEFAULT_CONFLICT_DISPLAY_LIMIT).map((r) => `  - ${r}`).join("\n");
      }
      task.output = message;
    } else {
      task.output = `Found compatible package version: ${color.blue(context.packageIdentifier.toString())}.`;
    }
  }
  async #findCompatibleVersion(context, versions, options) {
    const { packageIdentifier } = context;
    const { packageManager } = this.context;
    const { registry, verbose, rejectionReasons } = options;
    const packageName = packageIdentifier.name;
    assert(packageName, "Package name must be defined.");
    for (const version of versions) {
      const manifest = await packageManager.getManifest(`${packageName}@${version}`, {
        registry
      });
      if (!manifest) {
        continue;
      }
      const conflicts = await this.getPeerDependencyConflicts(manifest);
      if (conflicts) {
        if (verbose || rejectionReasons.length < DEFAULT_CONFLICT_DISPLAY_LIMIT) {
          rejectionReasons.push(...conflicts);
        }
        continue;
      }
      context.packageIdentifier = npa.resolve(manifest.name, manifest.version);
      return manifest;
    }
    return null;
  }
  #getPotentialVersions(packageMetadata, allowPrereleases) {
    const versionExclusions = packageVersionExclusions[packageMetadata.name];
    const latestVersion = packageMetadata["dist-tags"]["latest"];
    const versions = Object.values(packageMetadata.versions).filter((version) => {
      if (latestVersion && version === latestVersion) {
        return false;
      }
      if (!allowPrereleases && prerelease(version)) {
        return false;
      }
      if (versionExclusions && satisfies(version, versionExclusions, { includePrerelease: true })) {
        return false;
      }
      return true;
    });
    return versions.sort((a, b) => compare(b, a, true));
  }
  #getMajorVersions(versions) {
    const majorVersions = /* @__PURE__ */ new Map();
    for (const version of versions) {
      const major = semver.major(version);
      const existing = majorVersions.get(major);
      if (!existing || semver.gt(version, existing)) {
        majorVersions.set(major, version);
      }
    }
    return [...majorVersions.values()].sort((a, b) => compare(b, a, true));
  }
  async loadPackageInfoTask(context, task, options) {
    const { registry } = options;
    let manifest;
    try {
      manifest = await this.context.packageManager.getManifest(context.packageIdentifier, {
        registry
      });
    } catch (e) {
      assertIsError(e);
      throw new CommandError(`Unable to fetch package information for '${context.packageIdentifier}': ${e.message}`);
    }
    if (!manifest) {
      throw new CommandError(`Unable to fetch package information for '${context.packageIdentifier}'.`);
    }
    if (context.packageIdentifier.registry) {
      assert(context.packageIdentifier.name, "Registry package identifier must have a name");
      context.packageIdentifier = npa.resolve(
        context.packageIdentifier.name,
        // `save-prefix` option is ignored by some package managers so the caret is needed to ensure
        // that the value in the project package.json is correct.
        (context.isExactVersion ? "" : "^") + manifest.version
      );
    }
    context.hasSchematics = !!manifest.schematics;
    context.savePackage = manifest["ng-add"]?.save;
    context.collectionName = manifest.name;
    context.homepage = manifest.homepage;
    if (await this.getPeerDependencyConflicts(manifest)) {
      task.output = color.yellow(figures.warning + " Package has unmet peer dependencies. Adding the package may not succeed.");
    }
  }
  async confirmInstallationTask(context, task) {
    if (!isTTY()) {
      task.output = `'--skip-confirmation' can be used to bypass installation confirmation. Ensure package name is correct prior to '--skip-confirmation' option usage.`;
      throw new CommandError("No terminal detected");
    }
    const { ListrInquirerPromptAdapter } = await import("@listr2/prompt-adapter-inquirer");
    const { confirm } = await import("@inquirer/prompts");
    const shouldProceed = await task.prompt(ListrInquirerPromptAdapter).run(confirm, {
      message: `The package ${color.blue(context.packageIdentifier.toString())} will be installed and executed.
Would you like to proceed?`,
      default: true,
      theme: { prefix: "" }
    });
    if (!shouldProceed) {
      throw new CommandError("Command aborted");
    }
  }
  async cleanUpTemporaryDependency(packageName) {
    try {
      this.context.logger.info(`Cleaning up temporary dependency '${packageName}'...`);
      const projectManifest = await this.getProjectManifest();
      if (projectManifest) {
        if (projectManifest.dependencies) {
          delete projectManifest.dependencies[packageName];
        }
        if (projectManifest.devDependencies) {
          delete projectManifest.devDependencies[packageName];
        }
        await fs.writeFile(join(this.context.root, "package.json"), JSON.stringify(projectManifest, null, 2) + "\n");
      }
      await this.context.packageManager.install({ ignoreScripts: true });
    } catch (error) {
      this.context.logger.warn(`Failed to clean up temporary dependency '${packageName}': ${error instanceof Error ? error.message : error}`);
    }
  }
  async installPackageTask(context, task, options) {
    const { registry } = options;
    const { packageIdentifier, savePackage } = context;
    const { packageManager } = this.context;
    task.title = "Installing package";
    if (context.savePackage === false) {
      task.title += " in temporary location";
      const { workingDirectory } = await packageManager.acquireTempPackage(packageIdentifier.toString(), {
        registry
      });
      const tempRequire = createRequire(workingDirectory + "/");
      assert(context.collectionName, "Collection name should always be available");
      const resolvedCollectionPath = tempRequire.resolve(join(context.collectionName, "package.json"));
      context.collectionName = dirname(resolvedCollectionPath);
    } else {
      await packageManager.add(packageIdentifier.toString(), "none", savePackage === "devDependencies", false, true, {
        registry
      });
    }
  }
  async isProjectVersionValid(packageIdentifier) {
    if (!packageIdentifier.name) {
      return false;
    }
    const installedVersion = await this.findProjectVersion(packageIdentifier.name);
    if (!installedVersion) {
      return false;
    }
    if (packageIdentifier.rawSpec === "*") {
      return true;
    }
    if (packageIdentifier.type === "range" && packageIdentifier.fetchSpec && packageIdentifier.fetchSpec !== "*") {
      return satisfies(installedVersion, packageIdentifier.fetchSpec);
    }
    if (packageIdentifier.type === "version") {
      const v1 = valid(packageIdentifier.fetchSpec);
      const v2 = valid(installedVersion);
      return v1 !== null && v1 === v2;
    }
    return false;
  }
  getCollectionName() {
    const [, collectionName] = this.context.args.positional;
    if (!collectionName) {
      return void 0;
    }
    try {
      const packageName = npa(collectionName).name;
      if (packageName) {
        return packageName;
      }
    } catch (e) {
      assertIsError(e);
      this.context.logger.error(e.message);
    }
    return collectionName;
  }
  isPackageInstalled(name) {
    return !!this.resolvePackageJson(name);
  }
  executeSchematic(options) {
    const { verbose, skipConfirmation, interactive, force, dryRun, registry, defaults, collection: collectionName, schematicName, ...schematicOptions } = options;
    return this.runSchematic({
      schematicOptions,
      schematicName: schematicName ?? this.schematicName,
      collectionName,
      executionOptions: {
        interactive,
        force,
        dryRun,
        defaults,
        packageRegistry: registry
      }
    });
  }
  async findProjectVersion(name) {
    const cachedVersion = this.#projectVersionCache.get(name);
    if (cachedVersion !== void 0) {
      return cachedVersion;
    }
    const installedPackagePath = this.resolvePackageJson(name);
    if (installedPackagePath) {
      try {
        const installedPackage = JSON.parse(await fs.readFile(installedPackagePath, "utf-8"));
        this.#projectVersionCache.set(name, installedPackage.version);
        return installedPackage.version;
      } catch {
      }
    }
    const projectManifest = await this.getProjectManifest();
    if (projectManifest) {
      const version = projectManifest.dependencies?.[name] || projectManifest.devDependencies?.[name];
      if (version) {
        this.#projectVersionCache.set(name, version);
        return version;
      }
    }
    this.#projectVersionCache.set(name, null);
    return null;
  }
  async getProjectManifest() {
    if (this.#rootManifestCache) {
      return this.#rootManifestCache;
    }
    const { root } = this.context;
    try {
      this.#rootManifestCache = JSON.parse(await fs.readFile(join(root, "package.json"), "utf-8"));
      return this.#rootManifestCache;
    } catch {
      return null;
    }
  }
  resolvePackageJson(name) {
    try {
      return this.rootRequire.resolve(join(name, "package.json"));
    } catch (e) {
      assertIsError(e);
      if (e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        try {
          const mainPath = this.rootRequire.resolve(name);
          let directory = dirname(mainPath);
          while (directory && basename(directory) !== "node_modules") {
            const packageJsonPath = join(directory, "package.json");
            if (existsSync(packageJsonPath)) {
              return packageJsonPath;
            }
            const parent = dirname(directory);
            if (parent === directory) {
              break;
            }
            directory = parent;
          }
        } catch (e2) {
          assertIsError(e2);
          this.context.logger.debug(`Failed to resolve package '${name}' during fallback: ${e2.message}`);
        }
      }
    }
    return void 0;
  }
  async getPeerDependencyConflicts(manifest) {
    if (!manifest.peerDependencies) {
      return false;
    }
    const checks = Object.entries(manifest.peerDependencies).map(async ([peer, range]) => {
      let peerIdentifier;
      try {
        peerIdentifier = npa.resolve(peer, range);
      } catch {
        this.context.logger.warn(`Invalid peer dependency ${peer} found in package.`);
        return null;
      }
      if (peerIdentifier.type !== "version" && peerIdentifier.type !== "range") {
        return null;
      }
      try {
        const version = await this.findProjectVersion(peer);
        if (!version) {
          return null;
        }
        const options = { includePrerelease: true };
        if (!intersects(version, peerIdentifier.rawSpec, options) && !satisfies(version, peerIdentifier.rawSpec, options)) {
          return `Package "${manifest.name}@${manifest.version}" has an incompatible peer dependency to "${peer}@${peerIdentifier.rawSpec}" (requires "${version}" in project).`;
        }
      } catch {
      }
      return null;
    });
    const conflicts = (await Promise.all(checks)).filter((result) => !!result);
    return conflicts.length > 0 && conflicts;
  }
};
export {
  AddCommandModule as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
