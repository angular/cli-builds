import {
  CommandModule,
  CommandModuleError,
  CommandScope,
  EventCustomDimension,
  EventCustomMetric,
  askConfirmation,
  askQuestion,
  isPackageNameSafeForAnalytics,
  isTTY,
  parseJsonSchemaToOptions
} from "./chunk-YM7ILCS5.js";
import {
  assertIsError
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/command-builder/architect-base-command-module.js
import { Architect } from "@angular-devkit/architect";
import { WorkspaceNodeModulesArchitectHost } from "@angular-devkit/architect/node";
import { json } from "@angular-devkit/core";
import { createRequire } from "node:module";
var ArchitectBaseCommandModule = class extends CommandModule {
  scope = CommandScope.In;
  missingTargetChoices;
  async runSingleTarget(target, options) {
    const architectHost = this.getArchitectHost();
    let builderName;
    try {
      builderName = await architectHost.getBuilderNameForTarget(target);
    } catch (e) {
      assertIsError(e);
      return this.onMissingTarget(e.message);
    }
    const isAngularBuild = builderName.startsWith("@angular/build:");
    const { logger } = this.context;
    const run = await this.getArchitect(isAngularBuild).scheduleTarget(target, options, {
      logger
    });
    const analytics = isPackageNameSafeForAnalytics(builderName) ? await this.getAnalytics() : void 0;
    let outputSubscription;
    if (analytics) {
      analytics.reportArchitectRunEvent({
        [EventCustomDimension.BuilderTarget]: builderName
      });
      let firstRun = true;
      outputSubscription = run.output.subscribe(({ stats }) => {
        const parameters = this.builderStatsToAnalyticsParameters(stats, builderName);
        if (!parameters) {
          return;
        }
        if (firstRun) {
          firstRun = false;
          analytics.reportBuildRunEvent(parameters);
        } else {
          analytics.reportRebuildRunEvent(parameters);
        }
      });
    }
    try {
      const { error, success } = await run.lastOutput;
      if (error) {
        logger.error(error);
      }
      return success ? 0 : 1;
    } finally {
      await run.stop();
      outputSubscription?.unsubscribe();
    }
  }
  builderStatsToAnalyticsParameters(stats, builderName) {
    if (!stats || typeof stats !== "object" || !("durationInMs" in stats)) {
      return void 0;
    }
    const { optimization, allChunksCount, aot, lazyChunksCount, initialChunksCount, durationInMs, changedChunksCount, cssSizeInBytes, jsSizeInBytes, ngComponentCount } = stats;
    return {
      [EventCustomDimension.BuilderTarget]: builderName,
      [EventCustomDimension.Aot]: aot,
      [EventCustomDimension.Optimization]: optimization,
      [EventCustomMetric.AllChunksCount]: allChunksCount,
      [EventCustomMetric.LazyChunksCount]: lazyChunksCount,
      [EventCustomMetric.InitialChunksCount]: initialChunksCount,
      [EventCustomMetric.ChangedChunksCount]: changedChunksCount,
      [EventCustomMetric.DurationInMs]: durationInMs,
      [EventCustomMetric.JsSizeInBytes]: jsSizeInBytes,
      [EventCustomMetric.CssSizeInBytes]: cssSizeInBytes,
      [EventCustomMetric.NgComponentCount]: ngComponentCount
    };
  }
  _architectHost;
  getArchitectHost() {
    if (this._architectHost) {
      return this._architectHost;
    }
    const workspace = this.getWorkspaceOrThrow();
    return this._architectHost = new WorkspaceNodeModulesArchitectHost(workspace, workspace.basePath);
  }
  _architect;
  getArchitect(skipUndefinedArrayTransform) {
    if (this._architect) {
      return this._architect;
    }
    const registry = new json.schema.CoreSchemaRegistry();
    if (skipUndefinedArrayTransform) {
      registry.addPostTransform(json.schema.transforms.addUndefinedObjectDefaults);
    } else {
      registry.addPostTransform(json.schema.transforms.addUndefinedDefaults);
    }
    registry.useXDeprecatedProvider((msg) => this.context.logger.warn(msg));
    const architectHost = this.getArchitectHost();
    return this._architect = new Architect(architectHost, registry);
  }
  async getArchitectTargetOptions(target) {
    const architectHost = this.getArchitectHost();
    let builderConf;
    try {
      builderConf = await architectHost.getBuilderNameForTarget(target);
    } catch {
      return [];
    }
    let builderDesc;
    try {
      builderDesc = await architectHost.resolveBuilder(builderConf);
    } catch (e) {
      assertIsError(e);
      if (e.code === "MODULE_NOT_FOUND") {
        this.warnOnMissingNodeModules();
        throw new CommandModuleError(`Could not find the '${builderConf}' builder's node package.`);
      }
      throw e;
    }
    return parseJsonSchemaToOptions(new json.schema.CoreSchemaRegistry(), builderDesc.optionSchema, true);
  }
  warnOnMissingNodeModules() {
    const basePath = this.context.workspace?.basePath;
    if (!basePath) {
      return;
    }
    const workspaceResolve = createRequire(basePath + "/").resolve;
    try {
      workspaceResolve("@angular/core");
      return;
    } catch {
    }
    this.context.logger.warn(`Node packages may not be installed. Try installing with '${this.context.packageManager.name} install'.`);
  }
  getArchitectTarget() {
    return this.commandName;
  }
  async onMissingTarget(defaultMessage) {
    const { logger } = this.context;
    const choices = this.missingTargetChoices;
    if (!choices?.length) {
      logger.error(defaultMessage);
      return 1;
    }
    const missingTargetMessage = `Cannot find "${this.getArchitectTarget()}" target for the specified project.
You can add a package that implements these capabilities.

For example:
` + choices.map(({ name, value }) => `  ${name}: ng add ${value}`).join("\n") + "\n";
    if (isTTY()) {
      logger.warn(missingTargetMessage);
      const packageToInstall = await this.getMissingTargetPackageToInstall(choices);
      if (packageToInstall) {
        const AddCommandModule = (await import("./cli-PDCEX7HQ.js")).default;
        await new AddCommandModule(this.context).run({
          interactive: true,
          force: false,
          dryRun: false,
          defaults: false,
          collection: packageToInstall
        });
      }
    } else {
      logger.error(missingTargetMessage);
    }
    return 1;
  }
  async getMissingTargetPackageToInstall(choices) {
    if (choices.length === 1) {
      const { name, value } = choices[0];
      if (await askConfirmation(`Would you like to add ${name} now?`, true, false)) {
        return value;
      }
      return null;
    }
    return askQuestion(`Would you like to add a package with "${this.getArchitectTarget()}" capabilities now?`, [
      {
        name: "No",
        value: null
      },
      ...choices
    ], 0, null);
  }
};

export {
  ArchitectBaseCommandModule
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
