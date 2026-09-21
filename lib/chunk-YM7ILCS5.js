import {
  VERSION,
  analyticsDisabled,
  forceAutocomplete,
  forceTty,
  isCI,
  ngDebug
} from "./chunk-XG3HVNIL.js";
import {
  colors
} from "./chunk-GHUUJYOY.js";
import {
  assertIsError,
  getWorkspace
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/utilities/tty.js
function isTTY(stream = process.stdout) {
  return forceTty ?? (!!stream.isTTY && !isCI);
}

// packages/angular/cli/src/utilities/completion.js
import { json } from "@angular-devkit/core";
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { env } from "node:process";

// packages/angular/cli/src/utilities/prompt.js
async function askConfirmation(message, defaultResponse, noTTYResponse) {
  if (!isTTY()) {
    return noTTYResponse ?? defaultResponse;
  }
  const { confirm } = await import("@inquirer/prompts");
  const answer = await confirm({
    message,
    default: defaultResponse,
    theme: {
      prefix: ""
    }
  });
  return answer;
}
async function askQuestion(message, choices, defaultResponseIndex, noTTYResponse) {
  if (!isTTY()) {
    return noTTYResponse;
  }
  const { select } = await import("@inquirer/prompts");
  const answer = await select({
    message,
    choices,
    default: choices[defaultResponseIndex].value,
    theme: {
      prefix: ""
    }
  });
  return answer;
}
async function askChoices(message, choices, noTTYResponse) {
  if (!isTTY()) {
    return noTTYResponse;
  }
  const { checkbox } = await import("@inquirer/prompts");
  const answers = await checkbox({
    message,
    choices,
    theme: {
      prefix: ""
    }
  });
  return answers;
}

// packages/angular/cli/src/utilities/completion.js
async function considerSettingUpAutocompletion(command, logger) {
  const completionConfig = await getCompletionConfig();
  if (!await shouldPromptForAutocompletionSetup(command, completionConfig)) {
    return void 0;
  }
  const shouldSetupAutocompletion = await promptForAutocompletion();
  if (!shouldSetupAutocompletion) {
    logger.info(`
Ok, you won't be prompted again. Should you change your mind, the following command will set up autocompletion for you:

    ${colors.yellow(`ng completion`)}
    `.trim());
    await setCompletionConfig({ ...completionConfig, prompted: true });
    return void 0;
  }
  let rcFile;
  try {
    rcFile = await initializeAutocomplete();
  } catch (err) {
    assertIsError(err);
    logger.error(err.message);
    return 1;
  }
  logger.info(`
Appended \`source <(ng completion script)\` to \`${rcFile}\`. Restart your terminal or run the following to autocomplete \`ng\` commands:

    ${colors.yellow(`source <(ng completion script)`)}
    `.trim());
  if (!await hasGlobalCliInstall()) {
    logger.warn("Setup completed successfully, but there does not seem to be a global install of the Angular CLI. For autocompletion to work, the CLI will need to be on your `$PATH`, which is typically done with the `-g` flag in `npm install -g @angular/cli`.\n\nFor more information, see https://angular.dev/cli/completion#global-install");
  }
  await setCompletionConfig({ ...completionConfig, prompted: true });
  return void 0;
}
async function getCompletionConfig() {
  const wksp = await getWorkspace("global");
  return wksp?.getCli()?.["completion"];
}
async function setCompletionConfig(config) {
  const wksp = await getWorkspace("global");
  if (!wksp) {
    throw new Error(`Could not find global workspace`);
  }
  wksp.extensions["cli"] ??= {};
  const cli = wksp.extensions["cli"];
  if (!json.isJsonObject(cli)) {
    throw new Error(`Invalid config found at ${wksp.filePath}. \`extensions.cli\` should be an object.`);
  }
  cli.completion = config;
  await wksp.save();
}
async function shouldPromptForAutocompletionSetup(command, config) {
  if (forceAutocomplete !== void 0) {
    return forceAutocomplete;
  }
  if (["version", "update", "completion"].includes(command)) {
    return false;
  }
  if (!isTTY()) {
    return false;
  }
  if (config?.prompted) {
    return false;
  }
  const home = env["HOME"];
  if (!home) {
    return false;
  }
  const shell = env["SHELL"];
  if (!shell) {
    return false;
  }
  const rcFiles = getShellRunCommandCandidates(shell, home);
  if (!rcFiles) {
    return false;
  }
  if (await hasGlobalCliInstall() === false) {
    return false;
  }
  for (const rcFile of rcFiles) {
    const contents = await fs.readFile(rcFile, "utf-8").catch(() => void 0);
    if (contents?.includes("ng completion script")) {
      return false;
    }
  }
  return true;
}
async function promptForAutocompletion() {
  const autocomplete = await askConfirmation(`
Would you like to enable autocompletion? This will set up your terminal so pressing TAB while typing
Angular CLI commands will show possible options and autocomplete arguments. (Enabling autocompletion
will modify configuration files in your home directory.)
        `.split("\n").join(" ").trim(), true);
  return autocomplete;
}
async function initializeAutocomplete() {
  const shell = env["SHELL"];
  if (!shell) {
    throw new Error("`$SHELL` environment variable not set. Angular CLI autocompletion only supports Bash or Zsh. If you're on Windows, Cmd and Powershell don't support command autocompletion, but Git Bash or Windows Subsystem for Linux should work, so please try again in one of those environments.");
  }
  const home = env["HOME"];
  if (!home) {
    throw new Error("`$HOME` environment variable not set. Setting up autocompletion modifies configuration files in the home directory and must be set.");
  }
  const runCommandCandidates = getShellRunCommandCandidates(shell, home);
  if (!runCommandCandidates) {
    throw new Error(`Unknown \`$SHELL\` environment variable value (${shell}). Angular CLI autocompletion only supports Bash or Zsh.`);
  }
  const candidates = await Promise.allSettled(runCommandCandidates.map((rcFile2) => fs.access(rcFile2).then(() => rcFile2)));
  const rcFile = candidates.find((result) => result.status === "fulfilled")?.value ?? runCommandCandidates[0];
  try {
    await fs.appendFile(rcFile, "\n\n# Load Angular CLI autocompletion.\nsource <(ng completion script)\n");
  } catch (err) {
    assertIsError(err);
    throw new Error(`Failed to append autocompletion setup to \`${rcFile}\`.`, { cause: err });
  }
  return rcFile;
}
function getShellRunCommandCandidates(shell, home) {
  if (shell.toLowerCase().includes("bash")) {
    return [".bashrc", ".bash_profile", ".profile"].map((file) => path.join(home, file));
  } else if (shell.toLowerCase().includes("zsh")) {
    return [".zshrc", ".zsh_profile", ".profile"].map((file) => path.join(home, file));
  } else {
    return void 0;
  }
}
function hasGlobalCliInstall() {
  return new Promise((resolve2) => {
    execFile("which", ["-a", "ng"], (error, stdout) => {
      if (error) {
        resolve2(false);
        return;
      }
      const lines = stdout.split("\n").filter((line) => line !== "");
      const hasGlobalInstall = lines.some((line) => {
        const parent = path.parse(path.parse(line).dir);
        const grandparent = path.parse(parent.dir);
        const localInstall = grandparent.base === "node_modules" && parent.base === ".bin";
        return !localInstall;
      });
      return resolve2(hasGlobalInstall);
    });
  });
}

// packages/angular/cli/src/command-builder/definitions.js
var CommandScope;
(function(CommandScope2) {
  CommandScope2[CommandScope2["In"] = 0] = "In";
  CommandScope2[CommandScope2["Out"] = 1] = "Out";
  CommandScope2[CommandScope2["Both"] = 2] = "Both";
})(CommandScope || (CommandScope = {}));

// packages/angular/cli/src/command-builder/command-module.js
import { schema } from "@angular-devkit/core";
import { Parser as yargsParser } from "yargs/helpers";

// packages/angular/cli/src/analytics/analytics.js
import { json as json2, tags } from "@angular-devkit/core";
import { randomUUID } from "node:crypto";
var analyticsPackageSafelist = [
  /^@angular\//,
  /^@angular-devkit\//,
  /^@nguniversal\//,
  "@schematics/angular"
];
function isPackageNameSafeForAnalytics(name) {
  return analyticsPackageSafelist.some((pattern) => {
    if (typeof pattern == "string") {
      return pattern === name;
    } else {
      return pattern.test(name);
    }
  });
}
async function setAnalyticsConfig(global, value) {
  const level = global ? "global" : "local";
  const workspace = await getWorkspace(level);
  if (!workspace) {
    throw new Error(`Could not find ${level} workspace.`);
  }
  const cli = workspace.extensions["cli"] ??= {};
  if (!workspace || !json2.isJsonObject(cli)) {
    throw new Error(`Invalid config found at ${workspace.filePath}. CLI should be an object.`);
  }
  cli.analytics = value === true ? randomUUID() : value;
  await workspace.save();
}
async function promptAnalytics(context, global, force = false) {
  const level = global ? "global" : "local";
  const workspace = await getWorkspace(level);
  if (!workspace) {
    throw new Error(`Could not find a ${level} workspace. Are you in a project?`);
  }
  if (force || isTTY()) {
    const answer = await askConfirmation(`
Would you like to share pseudonymous usage data about this project with the Angular Team
at Google under Google's Privacy Policy at https://policies.google.com/privacy. For more
details and how to change this setting, see https://angular.dev/cli/analytics.

  `, false);
    await setAnalyticsConfig(global, answer);
    if (answer) {
      console.log("");
      console.log(tags.stripIndent`
         Thank you for sharing pseudonymous usage data. Should you change your mind, the following
         command will disable this feature entirely:

             ${colors.yellow(`ng analytics disable${global ? " --global" : ""}`)}
       `);
      console.log("");
    }
    process.stderr.write(await getAnalyticsInfoString(context));
    return true;
  }
  return false;
}
async function getAnalyticsUserIdForLevel(level) {
  if (analyticsDisabled) {
    return false;
  }
  const workspace = await getWorkspace(level);
  const analyticsConfig = workspace?.getCli()?.["analytics"];
  if (analyticsConfig === false) {
    return false;
  } else if (analyticsConfig === void 0 || analyticsConfig === null) {
    return void 0;
  } else {
    if (typeof analyticsConfig == "string") {
      return analyticsConfig;
    } else if (typeof analyticsConfig == "object" && typeof analyticsConfig["uid"] == "string") {
      return analyticsConfig["uid"];
    }
    return void 0;
  }
}
async function getAnalyticsUserId(context, skipPrompt = false) {
  const { workspace } = context;
  const globalConfig = await getAnalyticsUserIdForLevel("global");
  if (globalConfig === false) {
    return void 0;
  }
  if (workspace || globalConfig === void 0) {
    const level = workspace ? "local" : "global";
    let localOrGlobalConfig = await getAnalyticsUserIdForLevel(level);
    if (localOrGlobalConfig === void 0) {
      if (!skipPrompt) {
        await promptAnalytics(
          context,
          !workspace
          /** global */
        );
        localOrGlobalConfig = await getAnalyticsUserIdForLevel(level);
      }
    }
    if (localOrGlobalConfig === false) {
      return void 0;
    } else if (typeof localOrGlobalConfig === "string") {
      return localOrGlobalConfig;
    }
  }
  return globalConfig;
}
function analyticsConfigValueToHumanFormat(value) {
  if (value === false) {
    return "disabled";
  } else if (typeof value === "string" || value === true) {
    return "enabled";
  } else {
    return "not set";
  }
}
async function getAnalyticsInfoString(context) {
  const analyticsInstance = await getAnalyticsUserId(
    context,
    true
    /** skipPrompt */
  );
  const { globalConfiguration, workspace: localWorkspace } = context;
  const globalSetting = globalConfiguration?.getCli()?.["analytics"];
  const localSetting = localWorkspace?.getCli()?.["analytics"];
  return tags.stripIndents`
     Global setting: ${analyticsConfigValueToHumanFormat(globalSetting)}
     Local setting: ${localWorkspace ? analyticsConfigValueToHumanFormat(localSetting) : "No local workspace configuration file."}
     Effective status: ${analyticsInstance ? "enabled" : "disabled"}
   ` + "\n";
}

// packages/angular/cli/src/analytics/analytics-collector.js
import { randomUUID as randomUUID2 } from "node:crypto";
import * as https from "node:https";
import * as os from "node:os";
import * as querystring from "node:querystring";
import * as semver from "semver";

// packages/angular/cli/src/analytics/analytics-parameters.js
var RequestParameter;
(function(RequestParameter2) {
  RequestParameter2["ClientId"] = "cid";
  RequestParameter2["DebugView"] = "_dbg";
  RequestParameter2["GtmVersion"] = "gtm";
  RequestParameter2["Language"] = "ul";
  RequestParameter2["NewToSite"] = "_nsi";
  RequestParameter2["NonInteraction"] = "ni";
  RequestParameter2["PageLocation"] = "dl";
  RequestParameter2["PageTitle"] = "dt";
  RequestParameter2["ProtocolVersion"] = "v";
  RequestParameter2["SessionEngaged"] = "seg";
  RequestParameter2["SessionId"] = "sid";
  RequestParameter2["SessionNumber"] = "sct";
  RequestParameter2["SessionStart"] = "_ss";
  RequestParameter2["TrackingId"] = "tid";
  RequestParameter2["TrafficType"] = "tt";
  RequestParameter2["UserAgentArchitecture"] = "uaa";
  RequestParameter2["UserAgentBitness"] = "uab";
  RequestParameter2["UserAgentFullVersionList"] = "uafvl";
  RequestParameter2["UserAgentMobile"] = "uamb";
  RequestParameter2["UserAgentModel"] = "uam";
  RequestParameter2["UserAgentPlatform"] = "uap";
  RequestParameter2["UserAgentPlatformVersion"] = "uapv";
  RequestParameter2["UserId"] = "uid";
})(RequestParameter || (RequestParameter = {}));
var UserCustomDimension;
(function(UserCustomDimension2) {
  UserCustomDimension2["UserId"] = "up.ng_user_id";
  UserCustomDimension2["OsArchitecture"] = "up.ng_os_architecture";
  UserCustomDimension2["NodeVersion"] = "up.ng_node_version";
  UserCustomDimension2["NodeMajorVersion"] = "upn.ng_node_major_version";
  UserCustomDimension2["AngularCLIVersion"] = "up.ng_cli_version";
  UserCustomDimension2["AngularCLIMajorVersion"] = "upn.ng_cli_major_version";
  UserCustomDimension2["PackageManager"] = "up.ng_package_manager";
  UserCustomDimension2["PackageManagerVersion"] = "up.ng_pkg_manager_version";
  UserCustomDimension2["PackageManagerMajorVersion"] = "upn.ng_pkg_manager_major_v";
})(UserCustomDimension || (UserCustomDimension = {}));
var EventCustomDimension;
(function(EventCustomDimension2) {
  EventCustomDimension2["Command"] = "ep.ng_command";
  EventCustomDimension2["SchematicCollectionName"] = "ep.ng_schematic_collection_name";
  EventCustomDimension2["SchematicName"] = "ep.ng_schematic_name";
  EventCustomDimension2["Standalone"] = "ep.ng_standalone";
  EventCustomDimension2["SSR"] = "ep.ng_ssr";
  EventCustomDimension2["Style"] = "ep.ng_style";
  EventCustomDimension2["Routing"] = "ep.ng_routing";
  EventCustomDimension2["InlineTemplate"] = "ep.ng_inline_template";
  EventCustomDimension2["InlineStyle"] = "ep.ng_inline_style";
  EventCustomDimension2["BuilderTarget"] = "ep.ng_builder_target";
  EventCustomDimension2["Aot"] = "ep.ng_aot";
  EventCustomDimension2["Optimization"] = "ep.ng_optimization";
})(EventCustomDimension || (EventCustomDimension = {}));
var EventCustomMetric;
(function(EventCustomMetric2) {
  EventCustomMetric2["AllChunksCount"] = "epn.ng_all_chunks_count";
  EventCustomMetric2["LazyChunksCount"] = "epn.ng_lazy_chunks_count";
  EventCustomMetric2["InitialChunksCount"] = "epn.ng_initial_chunks_count";
  EventCustomMetric2["ChangedChunksCount"] = "epn.ng_changed_chunks_count";
  EventCustomMetric2["DurationInMs"] = "epn.ng_duration_ms";
  EventCustomMetric2["CssSizeInBytes"] = "epn.ng_css_size_bytes";
  EventCustomMetric2["JsSizeInBytes"] = "epn.ng_js_size_bytes";
  EventCustomMetric2["NgComponentCount"] = "epn.ng_component_count";
  EventCustomMetric2["AllProjectsCount"] = "epn.all_projects_count";
  EventCustomMetric2["LibraryProjectsCount"] = "epn.libs_projects_count";
  EventCustomMetric2["ApplicationProjectsCount"] = "epn.apps_projects_count";
})(EventCustomMetric || (EventCustomMetric = {}));

// packages/angular/cli/src/analytics/analytics-collector.js
var TRACKING_ID_PROD = "G-VETNJBW8L4";
var TRACKING_ID_STAGING = "G-TBMPRL1BTM";
var AnalyticsCollector = class {
  logger;
  trackingEventsQueue;
  requestParameterStringified;
  userParameters;
  constructor(logger, userId, packageManagerInfo) {
    this.logger = logger;
    const requestParameters = {
      [RequestParameter.ProtocolVersion]: 2,
      [RequestParameter.ClientId]: userId,
      [RequestParameter.UserId]: userId,
      [RequestParameter.TrackingId]: /^\d+\.\d+\.\d+$/.test(VERSION.full) && VERSION.full !== "0.0.0" ? TRACKING_ID_PROD : TRACKING_ID_STAGING,
      // Built-in user properties
      [RequestParameter.SessionId]: randomUUID2(),
      [RequestParameter.UserAgentArchitecture]: os.arch(),
      [RequestParameter.UserAgentPlatform]: os.platform(),
      [RequestParameter.UserAgentPlatformVersion]: os.release(),
      [RequestParameter.UserAgentMobile]: 0,
      [RequestParameter.SessionEngaged]: 1,
      // The below is needed for tech details to be collected.
      [RequestParameter.UserAgentFullVersionList]: "Google%20Chrome;111.0.5563.64|Not(A%3ABrand;8.0.0.0|Chromium;111.0.5563.64"
    };
    if (ngDebug) {
      requestParameters[RequestParameter.DebugView] = 1;
    }
    this.requestParameterStringified = querystring.stringify(requestParameters);
    const parsedVersion = semver.parse(process.version);
    const packageManagerVersion = packageManagerInfo.version;
    this.userParameters = {
      // While architecture is being collect by GA as UserAgentArchitecture.
      // It doesn't look like there is a way to query this. Therefore we collect this as a custom user dimension too.
      [UserCustomDimension.OsArchitecture]: os.arch(),
      // While User ID is being collected by GA, this is not visible in reports/for filtering.
      [UserCustomDimension.UserId]: userId,
      [UserCustomDimension.NodeVersion]: parsedVersion ? `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}` : "other",
      [UserCustomDimension.NodeMajorVersion]: parsedVersion?.major,
      [UserCustomDimension.PackageManager]: packageManagerInfo.name,
      [UserCustomDimension.PackageManagerVersion]: packageManagerVersion,
      [UserCustomDimension.PackageManagerMajorVersion]: packageManagerVersion ? +packageManagerVersion.split(".", 1)[0] : void 0,
      [UserCustomDimension.AngularCLIVersion]: VERSION.full,
      [UserCustomDimension.AngularCLIMajorVersion]: VERSION.major
    };
  }
  reportWorkspaceInfoEvent(parameters) {
    this.event("workspace_info", parameters);
  }
  reportRebuildRunEvent(parameters) {
    this.event("run_rebuild", parameters);
  }
  reportBuildRunEvent(parameters) {
    this.event("run_build", parameters);
  }
  reportArchitectRunEvent(parameters) {
    this.event("run_architect", parameters);
  }
  reportSchematicRunEvent(parameters) {
    this.event("run_schematic", parameters);
  }
  reportCommandRunEvent(command) {
    this.event("run_command", { [EventCustomDimension.Command]: command });
  }
  event(eventName, parameters) {
    this.trackingEventsQueue ??= [];
    this.trackingEventsQueue.push({
      ...this.userParameters,
      ...parameters,
      "en": eventName
    });
  }
  /**
   * Flush on an interval (if the event loop is waiting).
   *
   * @returns a method that when called will terminate the periodic
   * flush and call flush one last time.
   */
  periodFlush() {
    let analyticsFlushPromise = Promise.resolve();
    const analyticsFlushInterval = setInterval(() => {
      if (this.trackingEventsQueue?.length) {
        analyticsFlushPromise = analyticsFlushPromise.then(() => this.flush());
      }
    }, 4e3);
    return () => {
      clearInterval(analyticsFlushInterval);
      return analyticsFlushPromise.then(() => this.flush());
    };
  }
  async flush() {
    const pendingTrackingEvents = this.trackingEventsQueue;
    this.logger.debug(`Analytics flush size. ${pendingTrackingEvents?.length}.`);
    if (!pendingTrackingEvents?.length) {
      return;
    }
    this.trackingEventsQueue = void 0;
    try {
      await this.send(pendingTrackingEvents);
    } catch (error) {
      assertIsError(error);
      this.logger.debug(`Send analytics error. ${error.message}.`);
    }
  }
  async send(data) {
    return new Promise((resolve2, reject) => {
      const request2 = https.request({
        host: "www.google-analytics.com",
        method: "POST",
        path: "/g/collect?" + this.requestParameterStringified,
        headers: {
          // The below is needed for tech details to be collected even though we provide our own information from the OS Node.js module
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
        }
      }, (response) => {
        response.on("data", () => {
        });
        if (response.statusCode !== 200 && response.statusCode !== 204) {
          reject(new Error(`Analytics reporting failed with status code: ${response.statusCode}.`));
        } else {
          resolve2();
        }
      });
      request2.on("error", reject);
      const queryParameters = data.map((p) => querystring.stringify(p)).join("\n");
      request2.write(queryParameters);
      request2.end();
    });
  }
};

// packages/angular/cli/src/package-managers/factory.js
import assert from "node:assert/strict";
import { major } from "semver";

// packages/angular/cli/src/package-managers/discovery.js
import { dirname, join as join2 } from "node:path";

// packages/angular/cli/src/package-managers/parsers.js
import { compare, valid } from "semver";
var MAX_LOG_LENGTH = 1024;
function logStdout(stdout, logger) {
  if (!logger) {
    return;
  }
  let output = stdout;
  if (output.length > MAX_LOG_LENGTH) {
    output = `${output.slice(0, MAX_LOG_LENGTH)}... (truncated)`;
  }
  logger.debug(`  stdout:
${output}`);
}
function* parseJsonLines(output, logger) {
  for (const line of output.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    try {
      yield JSON.parse(line);
    } catch (e) {
      logger?.debug(`  Ignoring non-JSON line: ${e}`);
    }
  }
}
function parseNpmLikeDependencies(stdout, logger, options) {
  logger?.debug(`Parsing npm-like dependency list...`);
  logStdout(stdout, logger);
  const dependencies = /* @__PURE__ */ new Map();
  if (!stdout) {
    logger?.debug("  stdout is empty. No dependencies found.");
    return dependencies;
  }
  const data = JSON.parse(stdout);
  const workspacePackageName = options?.workspacePackageName;
  let rootProject;
  let subProject;
  if (Array.isArray(data)) {
    rootProject = data[0];
    if (workspacePackageName) {
      subProject = data.find((project) => project?.name === workspacePackageName);
    }
  } else {
    rootProject = data;
  }
  if (!rootProject || typeof rootProject !== "object") {
    return dependencies;
  }
  if (subProject) {
    const subprojectMaps = [
      subProject.dependencies,
      subProject.devDependencies,
      subProject.unsavedDependencies
    ].filter((d) => !!d);
    for (const subprojectMap of subprojectMaps) {
      for (const [name, info] of Object.entries(subprojectMap)) {
        if (info && typeof info === "object" && info.version) {
          dependencies.set(name, {
            name,
            version: info.version,
            path: info.path
          });
        }
      }
    }
  } else if (workspacePackageName) {
    const rootDependencyMaps2 = [
      rootProject.dependencies,
      rootProject.devDependencies,
      rootProject.unsavedDependencies
    ].filter((d) => !!d);
    for (const dependencyMap of rootDependencyMaps2) {
      const info = dependencyMap[workspacePackageName];
      if (info && typeof info === "object") {
        const nestedMaps = [
          info.dependencies,
          info.devDependencies,
          info.unsavedDependencies
        ].filter((d) => !!d);
        for (const nestedMap of nestedMaps) {
          for (const [name, nestedInfo] of Object.entries(nestedMap)) {
            if (nestedInfo && typeof nestedInfo === "object" && nestedInfo.version) {
              dependencies.set(name, {
                name,
                version: nestedInfo.version,
                path: nestedInfo.path
              });
            }
          }
        }
      }
    }
  }
  const rootDependencyMaps = [
    rootProject.dependencies,
    rootProject.devDependencies,
    rootProject.unsavedDependencies
  ].filter((d) => !!d);
  for (const dependencyMap of rootDependencyMaps) {
    for (const [name, info] of Object.entries(dependencyMap)) {
      if (!info || typeof info !== "object") {
        continue;
      }
      const isWorkspacePackage = info.resolved?.startsWith("file:") && (!!info.dependencies || !!info.devDependencies || !!info.unsavedDependencies);
      if (info.version && !dependencies.has(name) && !isWorkspacePackage) {
        dependencies.set(name, {
          name,
          version: info.version,
          path: info.path
        });
      }
    }
  }
  logger?.debug(`  Found ${dependencies.size} dependencies.`);
  return dependencies;
}
function parseYarnClassicDependencies(stdout, logger) {
  logger?.debug(`Parsing yarn classic dependency list...`);
  logStdout(stdout, logger);
  const dependencies = /* @__PURE__ */ new Map();
  if (!stdout) {
    logger?.debug("  stdout is empty. No dependencies found.");
    return dependencies;
  }
  for (const json4 of parseJsonLines(stdout, logger)) {
    if (json4.type === "tree" && json4.data?.trees) {
      for (const info of json4.data.trees) {
        const lastAtIndex = info.name.lastIndexOf("@");
        const name = info.name.slice(0, lastAtIndex);
        const version = info.name.slice(lastAtIndex + 1);
        dependencies.set(name, {
          name,
          version
        });
      }
    }
  }
  logger?.debug(`  Found ${dependencies.size} dependencies.`);
  return dependencies;
}
function isValidManifest(obj) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const { name, version } = obj;
  return typeof name === "string" && typeof version === "string" && valid(version) !== null;
}
function isValidMetadata(obj) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const { name, versions, "dist-tags": distTags } = obj;
  return typeof name === "string" && Array.isArray(versions) && typeof distTags === "object" && distTags !== null;
}
function parseNpmLikeManifest(stdout, logger) {
  logger?.debug(`Parsing npm-like manifest...`);
  logStdout(stdout, logger);
  if (!stdout) {
    logger?.debug("  stdout is empty. No manifest found.");
    return null;
  }
  const result = JSON.parse(stdout);
  if (Array.isArray(result)) {
    let maxManifest = null;
    for (const manifest of result) {
      if (!isValidManifest(manifest)) {
        logger?.debug("  Skipping invalid manifest in array (missing name, version, or invalid SemVer).");
        continue;
      }
      if (!maxManifest || compare(manifest.version, maxManifest.version) > 0) {
        maxManifest = manifest;
      }
    }
    if (!maxManifest) {
      logger?.debug("  No valid manifests found in the array.");
    }
    return maxManifest;
  }
  if (!isValidManifest(result)) {
    logger?.debug("  Parsed JSON is not a valid manifest (missing name, version, or invalid SemVer).");
    return null;
  }
  return result;
}
function parseNpmLikeMetadata(stdout, logger) {
  logger?.debug(`Parsing npm-like metadata...`);
  logStdout(stdout, logger);
  if (!stdout) {
    logger?.debug("  stdout is empty. No metadata found.");
    return null;
  }
  const result = JSON.parse(stdout);
  if (Array.isArray(result)) {
    for (const item of result) {
      if (isValidMetadata(item)) {
        return item;
      }
    }
    logger?.debug("  No valid metadata found in the array.");
    return null;
  }
  if (!isValidMetadata(result)) {
    logger?.debug("  Parsed JSON is not valid metadata (missing name, versions, or dist-tags).");
    return null;
  }
  return result;
}
function parseYarnClassicManifest(stdout, logger) {
  logger?.debug(`Parsing yarn classic manifest...`);
  logStdout(stdout, logger);
  if (!stdout) {
    logger?.debug("  stdout is empty. No manifest found.");
    return null;
  }
  let manifest;
  for (const json4 of parseJsonLines(stdout, logger)) {
    if (json4.type === "inspect" && json4.data) {
      manifest = json4.data;
      break;
    }
  }
  if (!manifest) {
    logger?.debug("  Failed to find manifest in yarn classic output.");
    return null;
  }
  if (manifest["ng-add"] && typeof manifest["ng-add"] === "object" && Object.keys(manifest["ng-add"]).length === 0) {
    manifest["ng-add"].save ??= false;
  }
  if (!isValidManifest(manifest)) {
    logger?.debug("  Parsed JSON is not a valid manifest (missing name, version, or invalid SemVer).");
    return null;
  }
  return manifest;
}
function parseYarnClassicMetadata(stdout, logger) {
  logger?.debug(`Parsing yarn classic metadata...`);
  logStdout(stdout, logger);
  if (!stdout) {
    logger?.debug("  stdout is empty. No metadata found.");
    return null;
  }
  let metadata;
  for (const json4 of parseJsonLines(stdout, logger)) {
    if (json4.type === "inspect" && json4.data) {
      metadata = json4.data;
      break;
    }
  }
  if (!metadata) {
    logger?.debug("  Failed to find metadata in yarn classic output.");
    return null;
  }
  return metadata;
}
function parseNpmLikeError(output, logger) {
  logger?.debug(`Parsing npm-like error output...`);
  logStdout(output, logger);
  if (!output) {
    logger?.debug("  output is empty. No error found.");
    return null;
  }
  try {
    let jsonError = JSON.parse(output);
    if (Array.isArray(jsonError)) {
      jsonError = jsonError[0];
    }
    if (jsonError && typeof jsonError === "object" && "error" in jsonError) {
      jsonError = jsonError.error;
    }
    if (jsonError && typeof jsonError.code === "string" && (typeof jsonError.summary === "string" || typeof jsonError.message === "string")) {
      const summary = jsonError.summary || jsonError.message;
      logger?.debug(`  Successfully parsed JSON error with code '${jsonError.code}'.`);
      return {
        code: jsonError.code,
        summary,
        detail: jsonError.detail
      };
    }
  } catch (e) {
    logger?.debug(`  Failed to parse output as JSON: ${e}. Attempting regex fallback.`);
  }
  const errorCodeMatch = output.match(/npm (ERR!|error) code (E\d{3}|[A-Z_]+)/);
  if (errorCodeMatch) {
    const code = errorCodeMatch[2];
    let summary;
    for (const line of output.split("\n")) {
      if (line.startsWith("npm ERR!") && !line.includes(" code ")) {
        summary = line.replace("npm ERR! ", "").trim();
        break;
      } else if (line.startsWith("npm error") && !line.includes(" code ")) {
        summary = line.replace("npm error ", "").trim();
        break;
      }
    }
    logger?.debug(`  Successfully parsed text error with code '${code}'.`);
    return {
      code,
      summary: summary || `Package manager error: ${code}`
    };
  }
  logger?.debug("  Failed to parse npm-like error. No structured error found.");
  return null;
}
function parseYarnClassicError(output, logger) {
  logger?.debug(`Parsing yarn classic error output...`);
  logStdout(output, logger);
  if (!output) {
    logger?.debug("  output is empty. No error found.");
    return null;
  }
  const statusCodeMatch = output.match(/finished with status code (\d{3})/);
  if (statusCodeMatch) {
    const statusCode = Number(statusCodeMatch[1]);
    if (statusCode < 200 || statusCode >= 300) {
      logger?.debug(`  Detected HTTP error status code '${statusCode}' in verbose output.`);
      return {
        code: `E${statusCode}`,
        summary: `Request failed with status code ${statusCode}.`
      };
    }
  }
  for (const json4 of parseJsonLines(output, logger)) {
    if (json4.type === "error" && typeof json4.data === "string") {
      const summary = json4.data;
      logger?.debug(`  Successfully parsed generic yarn classic error.`);
      return {
        code: "UNKNOWN_ERROR",
        summary
      };
    }
  }
  logger?.debug("  Failed to parse yarn classic error. No structured error found.");
  return null;
}
function parseBunDependencies(stdout, logger) {
  logger?.debug("Parsing Bun dependency list...");
  logStdout(stdout, logger);
  const dependencies = /* @__PURE__ */ new Map();
  if (!stdout) {
    return dependencies;
  }
  const lines = stdout.split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    const cleanLine = line.replace(/^[└├]──\s*/, "");
    const match = cleanLine.match(/^(.+?)\s?@([^@\s]+)$/);
    if (match) {
      const name = match[1];
      const version = match[2];
      dependencies.set(name, { name, version });
    }
  }
  logger?.debug(`  Found ${dependencies.size} dependencies.`);
  return dependencies;
}
function parseYarnModernDependencies(stdout, logger) {
  logger?.debug("Parsing Yarn Berry dependency list...");
  logStdout(stdout, logger);
  const dependencies = /* @__PURE__ */ new Map();
  if (!stdout) {
    return dependencies;
  }
  for (const json4 of parseJsonLines(stdout, logger)) {
    if (typeof json4 === "string") {
      const match = json4.match(/^(@?[^@]+)@(.+)$/);
      if (match) {
        const name = match[1];
        let version = match[2];
        if (version.startsWith("npm:")) {
          version = version.slice(4);
        }
        const versionParamMatch = version.match(/::version=([^&]+)/);
        if (versionParamMatch) {
          version = versionParamMatch[1];
        }
        dependencies.set(name, { name, version });
      }
    }
  }
  logger?.debug(`  Found ${dependencies.size} dependencies.`);
  return dependencies;
}
function parsePnpmReleaseAge(output, version) {
  const value = output.trim();
  if (!value || value === "undefined" || value === "null") {
    const major2 = parseInt(version.split(".")[0], 10);
    if (major2 >= 11) {
      return 1440 * 6e4;
    }
    return 0;
  }
  const minutes = parseInt(value, 10);
  return isNaN(minutes) ? 0 : minutes * 6e4;
}
function parseYarnReleaseAge(output, version) {
  const value = output.trim();
  if (!value || value === "undefined" || value === "null") {
    const major2 = parseInt(version.split(".")[0], 10);
    if (major2 >= 4) {
      return 1440 * 6e4;
    }
    return 0;
  }
  const match = value.match(/^(\d+)(ms|s|m|h|d|w)?$/);
  if (!match) {
    return 0;
  }
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  if (unit) {
    switch (unit) {
      case "ms":
        return amount;
      case "s":
        return amount * 1e3;
      case "m":
        return amount * 6e4;
      case "h":
        return amount * 36e5;
      case "d":
        return amount * 864e5;
      case "w":
        return amount * 6048e5;
    }
  }
  return amount * 6e4;
}
function parseNpmBeforeDate(output) {
  const trimmed = output.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return 0;
  }
  const parsedDate = Date.parse(trimmed);
  if (isNaN(parsedDate)) {
    return 0;
  }
  const age = Date.now() - parsedDate;
  return age > 0 ? age : 0;
}

// packages/angular/cli/src/package-managers/package-manager-descriptor.js
var NOT_FOUND_ERROR_CODES = /* @__PURE__ */ new Set(["E404"]);
function isKnownNotFound(error) {
  return NOT_FOUND_ERROR_CODES.has(error.code);
}
var SUPPORTED_PACKAGE_MANAGERS = {
  npm: {
    binary: "npm",
    lockfiles: ["package-lock.json", "npm-shrinkwrap.json"],
    addCommand: "install",
    installCommand: ["install"],
    forceFlag: "--force",
    saveExactFlag: "--save-exact",
    saveTildeFlag: "--save-tilde",
    saveDevFlag: "--save-dev",
    noLockfileFlag: "--no-package-lock",
    ignoreScriptsFlag: "--ignore-scripts",
    ignorePeerDependenciesFlag: "--force",
    configFiles: [".npmrc"],
    getRegistryOptions: (registry) => ({ args: ["--registry", registry] }),
    versionCommand: ["--version"],
    listDependenciesCommand: ["list", "--depth=0", "--json=true", "--all=true"],
    getReleaseAgeConfigCommand: ["config", "get", "before"],
    getPackageNameCommand: ["pkg", "get", "name"],
    getManifestCommand: ["view", "--json"],
    viewCommandFieldArgFormatter: (fields) => [...fields],
    outputParsers: {
      listDependencies: parseNpmLikeDependencies,
      getRegistryManifest: parseNpmLikeManifest,
      getRegistryMetadata: parseNpmLikeMetadata,
      getError: parseNpmLikeError,
      getReleaseAge: parseNpmBeforeDate
    },
    isNotFound: isKnownNotFound
  },
  yarn: {
    binary: "yarn",
    lockfiles: ["yarn.lock"],
    addCommand: "add",
    installCommand: ["install"],
    forceFlag: "--force",
    saveExactFlag: "--exact",
    saveTildeFlag: "--tilde",
    saveDevFlag: "--dev",
    noLockfileFlag: "",
    ignoreScriptsFlag: "--mode=skip-build",
    configFiles: [".yarnrc.yml", ".yarnrc.yaml"],
    copyConfigFromProject: true,
    getRegistryOptions: (registry) => ({ env: { YARN_NPM_REGISTRY_SERVER: registry } }),
    versionCommand: ["--version"],
    listDependenciesCommand: ["info", "--name-only", "--json"],
    getReleaseAgeConfigCommand: ["config", "get", "npmMinimalAgeGate"],
    getManifestCommand: ["npm", "info", "--json"],
    viewCommandFieldArgFormatter: (fields) => ["--fields", fields.join(",")],
    outputParsers: {
      listDependencies: parseYarnModernDependencies,
      getRegistryManifest: parseNpmLikeManifest,
      getRegistryMetadata: parseNpmLikeMetadata,
      getError: parseNpmLikeError,
      getReleaseAge: parseYarnReleaseAge
    },
    isNotFound: isKnownNotFound
  },
  "yarn-classic": {
    binary: "yarn",
    // This is intentionally empty. `yarn-classic` is not a discoverable package manager.
    // The discovery process finds `yarn` via `yarn.lock`, and the factory logic
    // determines whether it is classic or modern by checking the installed version.
    lockfiles: [],
    addCommand: "add",
    installCommand: ["install"],
    forceFlag: "--force",
    saveExactFlag: "--exact",
    saveTildeFlag: "--tilde",
    saveDevFlag: "--dev",
    noLockfileFlag: "--no-lockfile",
    ignoreScriptsFlag: "--ignore-scripts",
    configFiles: [".yarnrc", ".npmrc"],
    getRegistryOptions: (registry) => ({ args: ["--registry", registry] }),
    versionCommand: ["--version"],
    listDependenciesCommand: ["list", "--depth=0", "--json"],
    getManifestCommand: ["info", "--json", "--verbose"],
    requiresManifestVersionLookup: true,
    outputParsers: {
      listDependencies: parseYarnClassicDependencies,
      getRegistryManifest: parseYarnClassicManifest,
      getRegistryMetadata: parseYarnClassicMetadata,
      getError: parseYarnClassicError
    },
    isNotFound: isKnownNotFound
  },
  pnpm: {
    binary: "pnpm",
    lockfiles: ["pnpm-lock.yaml"],
    addCommand: "add",
    installCommand: ["install"],
    forceFlag: "--force",
    saveExactFlag: "--save-exact",
    saveTildeFlag: "--save-tilde",
    saveDevFlag: "--save-dev",
    noLockfileFlag: "--no-lockfile",
    ignoreScriptsFlag: "--ignore-scripts",
    ignorePeerDependenciesFlag: "--strict-peer-dependencies=false",
    configFiles: [".npmrc", "pnpm-workspace.yaml"],
    getRegistryOptions: (registry) => ({ args: ["--registry", registry] }),
    versionCommand: ["--version"],
    listDependenciesCommand: ["list", "--depth=0", "--json"],
    getReleaseAgeConfigCommand: ["config", "get", "minimum-release-age"],
    getPackageNameCommand: ["pkg", "get", "name"],
    getManifestCommand: ["view", "--json"],
    viewCommandFieldArgFormatter: (fields) => [...fields],
    outputParsers: {
      listDependencies: parseNpmLikeDependencies,
      getRegistryManifest: parseNpmLikeManifest,
      getRegistryMetadata: parseNpmLikeMetadata,
      getError: parseNpmLikeError,
      getReleaseAge: parsePnpmReleaseAge
    },
    isNotFound: isKnownNotFound
  },
  bun: {
    binary: "bun",
    lockfiles: ["bun.lockb", "bun.lock"],
    addCommand: "add",
    installCommand: ["install"],
    forceFlag: "--force",
    saveExactFlag: "--exact",
    saveTildeFlag: "",
    // Bun does not have a flag for tilde, it defaults to caret.
    saveDevFlag: "--development",
    noLockfileFlag: "",
    // Bun does not have a flag for this.
    ignoreScriptsFlag: "--ignore-scripts",
    configFiles: ["bunfig.toml", ".npmrc"],
    copyConfigFromProject: true,
    getRegistryOptions: (registry) => ({ args: ["--registry", registry] }),
    versionCommand: ["--version"],
    listDependenciesCommand: ["pm", "ls"],
    getManifestCommand: ["pm", "view", "--json"],
    getRegistryMetadata: async (packageName, fetchAndParse) => {
      const [distTags, versions] = await Promise.all([
        fetchAndParse(["pm", "view", "--json", packageName, "dist-tags"], (stdout) => {
          if (!stdout) {
            return {};
          }
          const parsed = JSON.parse(stdout);
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        }),
        fetchAndParse(["pm", "view", "--json", packageName, "versions"], (stdout) => {
          if (!stdout) {
            return null;
          }
          const parsed = JSON.parse(stdout);
          return Array.isArray(parsed) ? parsed : [parsed];
        })
      ]);
      if (!versions || versions.length === 0) {
        return null;
      }
      return {
        name: packageName,
        "dist-tags": distTags || {},
        versions
      };
    },
    outputParsers: {
      listDependencies: parseBunDependencies,
      getRegistryManifest: parseNpmLikeManifest,
      getRegistryMetadata: parseNpmLikeMetadata,
      getError: parseNpmLikeError
    },
    isNotFound: isKnownNotFound
  }
};
var PACKAGE_MANAGER_PRECEDENCE = [
  "pnpm",
  "yarn",
  "bun",
  "npm"
];

// packages/angular/cli/src/package-managers/discovery.js
async function findLockfiles(host, directory, logger) {
  logger?.debug(`Searching for lockfiles in '${directory}'...`);
  const foundPackageManagers = /* @__PURE__ */ new Set();
  const checks = [];
  for (const [name, descriptor] of Object.entries(SUPPORTED_PACKAGE_MANAGERS)) {
    const manager = name;
    for (const lockfile of descriptor.lockfiles) {
      checks.push((async () => {
        try {
          const path2 = join2(directory, lockfile);
          const stats = await host.stat(path2);
          if (stats.isFile()) {
            logger?.debug(`  Found '${lockfile}'.`);
            foundPackageManagers.add(manager);
          }
        } catch {
        }
      })());
    }
  }
  await Promise.all(checks);
  return foundPackageManagers;
}
async function isDirectory(host, path2) {
  try {
    return (await host.stat(path2)).isDirectory();
  } catch {
    return false;
  }
}
async function discover(host, startDir, logger) {
  logger?.debug(`Starting package manager discovery in '${startDir}'...`);
  let currentDir = startDir;
  while (true) {
    const found = await findLockfiles(host, currentDir, logger);
    if (found.size > 0) {
      logger?.debug(`Found lockfile(s): [${[...found].join(", ")}]. Applying precedence...`);
      for (const packageManager of PACKAGE_MANAGER_PRECEDENCE) {
        if (found.has(packageManager)) {
          logger?.debug(`Selected '${packageManager}' based on precedence.`);
          return packageManager;
        }
      }
    }
    if (await isDirectory(host, join2(currentDir, ".git"))) {
      logger?.debug(`Reached repository root at '${currentDir}'. Stopping search.`);
      return null;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      logger?.debug("Reached filesystem root. No lockfile found.");
      return null;
    }
    currentDir = parentDir;
  }
}

// packages/angular/cli/src/package-managers/host.js
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile as readFile2, rm, stat, writeFile } from "node:fs/promises";
import { platform as platform2, tmpdir } from "node:os";
import { join as join3 } from "node:path";

// packages/angular/cli/src/package-managers/error.js
var PackageManagerError = class extends Error {
  stdout;
  stderr;
  exitCode;
  /**
   * Creates a new `PackageManagerError` instance.
   * @param message The error message.
   * @param stdout The standard output of the failed process.
   * @param stderr The standard error of the failed process.
   * @param exitCode The exit code of the failed process.
   */
  constructor(message, stdout, stderr, exitCode) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
};

// packages/angular/cli/src/package-managers/host.js
var NodeJS_HOST = {
  stat,
  requiresQuoting: platform2() === "win32",
  mkdir,
  readFile: (path2) => readFile2(path2, { encoding: "utf8" }),
  copyFile: (src, dest) => copyFile(src, dest, constants.COPYFILE_FICLONE),
  writeFile,
  createTempDirectory: (baseDir) => mkdtemp(join3(baseDir ?? tmpdir(), "angular-cli-tmp-packages-")),
  deleteDirectory: (path2) => rm(path2, { recursive: true, force: true }),
  runCommand: async (command, args, options = {}) => {
    const signal = options.timeout ? AbortSignal.timeout(options.timeout) : void 0;
    const isWin32 = platform2() === "win32";
    return new Promise((resolve2, reject) => {
      const env2 = {
        ...process.env,
        ...options.env,
        //  NPM updater notifier will prevents the child process from closing until it timeout after 3 minutes.
        NO_UPDATE_NOTIFIER: "1",
        NPM_CONFIG_UPDATE_NOTIFIER: "false"
      };
      if ((env2["npm_config_registry"] === "https://registry.yarnpkg.com" || env2["NPM_CONFIG_REGISTRY"] === "https://registry.yarnpkg.com") && (env2["npm_config_user_agent"]?.includes("yarn") || env2["NPM_CONFIG_USER_AGENT"]?.includes("yarn"))) {
        delete env2["npm_config_registry"];
        delete env2["NPM_CONFIG_REGISTRY"];
      }
      const spawnOptions = {
        shell: isWin32,
        stdio: options.stdio ?? "pipe",
        signal,
        cwd: options.cwd,
        env: env2
      };
      const childProcess = isWin32 ? spawn(`${command} ${args.join(" ")}`, spawnOptions) : spawn(command, args, spawnOptions);
      let stdout = "";
      childProcess.stdout?.on("data", (data) => stdout += data.toString());
      let stderr = "";
      childProcess.stderr?.on("data", (data) => stderr += data.toString());
      childProcess.on("close", (code) => {
        if (code === 0) {
          resolve2({ stdout, stderr });
        } else {
          const message = `Process exited with code ${code}.`;
          reject(new PackageManagerError(message, stdout, stderr, code));
        }
      });
      childProcess.on("error", (err) => {
        if (err.name === "AbortError") {
          const message2 = `Process timed out.`;
          reject(new PackageManagerError(message2, stdout, stderr, null));
          return;
        }
        const message = `Process failed with error: ${err.message}`;
        reject(new PackageManagerError(message, stdout, stderr, null));
      });
    });
  }
};

// packages/angular/cli/src/package-managers/package-manager.js
import { join as join4, relative, resolve } from "node:path";
import npa from "npm-package-arg";
import { maxSatisfying, valid as valid2 } from "semver";
var METADATA_FIELDS = ["name", "dist-tags", "versions", "time"];
var MANIFEST_FIELDS = [
  "name",
  "version",
  "deprecated",
  "dependencies",
  "peerDependencies",
  "devDependencies",
  "homepage",
  "schematics",
  "ng-add",
  "ng-update"
];
var PackageManager = class {
  host;
  cwd;
  descriptor;
  options;
  #manifestCache = /* @__PURE__ */ new Map();
  #metadataCache = /* @__PURE__ */ new Map();
  #initializationError;
  #dependencyCache = null;
  #version;
  #minimumReleaseAge;
  #activeTasks = 0;
  #pendingTasks = [];
  #maxConcurrent = 5;
  /**
   * Creates a new `PackageManager` instance.
   * @param host A `Host` instance for interacting with the file system and running commands.
   * @param cwd The absolute path to the project's working directory.
   * @param descriptor A `PackageManagerDescriptor` that defines the commands for a specific package manager.
   * @param options An options object to configure the instance.
   */
  constructor(host, cwd, descriptor, options = {}) {
    this.host = host;
    this.cwd = cwd;
    this.descriptor = descriptor;
    this.options = options;
    if (this.options.dryRun && !this.options.logger) {
      throw new Error("A logger must be provided when dryRun is enabled.");
    }
    this.#version = options.version;
    this.#initializationError = options.initializationError;
  }
  /**
   * The name of the package manager's binary.
   */
  get name() {
    return this.descriptor.binary;
  }
  /**
   * Ensures that the package manager is installed and available in the PATH.
   * If it is not, this method will throw an error with instructions on how to install it.
   *
   * @throws {Error} If the package manager is not installed.
   */
  ensureInstalled() {
    if (this.#initializationError) {
      throw this.#initializationError;
    }
  }
  /**
   * A private method to lazily populate the dependency cache.
   * This is a performance optimization to avoid running `npm list` multiple times.
   * @returns A promise that resolves to the dependency cache map.
   */
  async #populateDependencyCache() {
    if (this.#dependencyCache !== null) {
      return this.#dependencyCache;
    }
    const args = this.descriptor.listDependenciesCommand;
    const workspacePackageName = await this.getCurrentPackageName();
    const dependencies = await this.#fetchAndParse(args, (stdout, logger) => this.descriptor.outputParsers.listDependencies(stdout, logger, { workspacePackageName }));
    return this.#dependencyCache = dependencies ?? /* @__PURE__ */ new Map();
  }
  /**
   * A private method to run a command using the package manager's binary.
   * @param args The arguments to pass to the command.
   * @param options Options for the child process.
   * @returns A promise that resolves with the standard output and standard error of the command.
   */
  async #runWithThrottle(action) {
    if (this.#activeTasks >= this.#maxConcurrent) {
      await new Promise((resolve2) => {
        this.#pendingTasks.push(resolve2);
      });
    } else {
      this.#activeTasks++;
    }
    try {
      return await action();
    } finally {
      const next = this.#pendingTasks.shift();
      if (next) {
        next();
      } else {
        this.#activeTasks--;
      }
    }
  }
  async #run(args, options = {}) {
    return this.#runWithThrottle(async () => {
      this.ensureInstalled();
      const { registry, cwd, ...runOptions } = options;
      const finalArgs = [...args];
      let finalEnv;
      if (registry) {
        const registryOptions = this.descriptor.getRegistryOptions?.(registry);
        if (!registryOptions) {
          throw new Error(`The configured package manager, '${this.descriptor.binary}', does not support a custom registry.`);
        }
        if (registryOptions.args) {
          finalArgs.push(...registryOptions.args);
        }
        if (registryOptions.env) {
          finalEnv = registryOptions.env;
        }
      }
      const executionDirectory = cwd ?? this.cwd;
      if (this.options.dryRun) {
        this.options.logger?.info(`[DRY RUN] Would execute in [${executionDirectory}]: ${this.descriptor.binary} ${finalArgs.join(" ")}`);
        return { stdout: "", stderr: "" };
      }
      const commandResult = await this.host.runCommand(this.descriptor.binary, finalArgs, {
        ...runOptions,
        cwd: executionDirectory,
        stdio: "pipe",
        env: finalEnv
      });
      return { stdout: commandResult.stdout.trim(), stderr: commandResult.stderr.trim() };
    });
  }
  /**
   * A private, generic method to encapsulate the common logic of running a command,
   * handling errors, and parsing the output.
   * @param args The arguments to pass to the command.
   * @param parser A function that parses the command's stdout.
   * @param options Options for the command, including caching.
   * @returns A promise that resolves to the parsed data, or null if not found.
   */
  async #fetchAndParse(args, parser, options = {}) {
    const { cache, cacheKey, bypassCache, ...runOptions } = options;
    if (!bypassCache && cache && cacheKey && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    let stdout;
    let stderr;
    let exitCode;
    let thrownError;
    try {
      ({ stdout, stderr } = await this.#run(args, runOptions));
      exitCode = 0;
    } catch (e) {
      thrownError = e;
      if (e instanceof PackageManagerError) {
        stdout = e.stdout;
        stderr = e.stderr;
        exitCode = e.exitCode;
      } else {
        throw e;
      }
    }
    const getError = this.descriptor.outputParsers.getError;
    const parsedError = getError?.(stdout, this.options.logger) ?? getError?.(stderr, this.options.logger) ?? null;
    if (parsedError) {
      this.options.logger?.debug(`[${this.descriptor.binary}] Structured error (code: ${parsedError.code}): ${parsedError.summary}`);
      if (this.descriptor.isNotFound(parsedError)) {
        if (cache && cacheKey) {
          cache.set(cacheKey, null);
        }
        return null;
      } else {
        throw new PackageManagerError(parsedError.summary, stdout, stderr, exitCode);
      }
    }
    if (thrownError) {
      throw thrownError;
    }
    try {
      const result = parser(stdout, this.options.logger);
      if (cache && cacheKey) {
        cache.set(cacheKey, result);
      }
      return result;
    } catch (e) {
      const message = `Failed to parse package manager output: ${e instanceof Error ? e.message : ""}`;
      throw new PackageManagerError(message, stdout, stderr, exitCode);
    }
  }
  /**
   * Adds a package to the project's dependencies.
   * @param packageName The name of the package to add.
   * @param save The save strategy to use.
   * - `exact`: The package will be saved with an exact version.
   * - `tilde`: The package will be saved with a tilde version range (`~`).
   * - `none`: The package will be saved with the default version range (`^`).
   * @param asDevDependency Whether to install the package as a dev dependency.
   * @param noLockfile Whether to skip updating the lockfile.
   * @param options Extra options for the command.
   * @returns A promise that resolves when the command is complete.
   */
  async add(packageName, save, asDevDependency, noLockfile, ignoreScripts, options = {}) {
    const flags = [
      asDevDependency ? this.descriptor.saveDevFlag : "",
      save === "exact" ? this.descriptor.saveExactFlag : "",
      save === "tilde" ? this.descriptor.saveTildeFlag : "",
      noLockfile ? this.descriptor.noLockfileFlag : "",
      ignoreScripts ? this.descriptor.ignoreScriptsFlag : ""
    ].filter((flag) => flag);
    const specifier = this.host.requiresQuoting ? `"${packageName}"` : packageName;
    const args = [this.descriptor.addCommand, specifier, ...flags];
    await this.#run(args, options);
    this.#dependencyCache = null;
  }
  /**
   * Installs all dependencies in the project.
   * @param options Options for the installation.
   * @param options.timeout The maximum time in milliseconds to wait for the command to complete.
   * @param options.force If true, forces a clean install, potentially overwriting existing modules.
   * @param options.registry The registry to use for the installation.
   * @param options.ignoreScripts If true, prevents lifecycle scripts from being executed.
   * @returns A promise that resolves when the command is complete.
   */
  async install(options = { ignoreScripts: true }) {
    const flags = [
      options.force ? this.descriptor.forceFlag : "",
      options.ignoreScripts ? this.descriptor.ignoreScriptsFlag : "",
      options.ignorePeerDependencies ? this.descriptor.ignorePeerDependenciesFlag ?? "" : ""
    ].filter((flag) => flag);
    const args = [...this.descriptor.installCommand, ...flags];
    await this.#run(args, options);
    this.#dependencyCache = null;
  }
  /**
   * Gets the name of the package in the current project.
   */
  async getCurrentPackageName() {
    if (this.descriptor.getPackageNameCommand) {
      try {
        const { stdout } = await this.#run(this.descriptor.getPackageNameCommand);
        if (stdout) {
          return JSON.parse(stdout);
        }
      } catch {
      }
    }
    try {
      const content = await this.host.readFile(join4(this.cwd, "package.json"));
      const pkgJson = JSON.parse(content);
      return pkgJson.name;
    } catch {
      return void 0;
    }
  }
  /**
   * Gets the version of the package manager binary.
   */
  async getVersion() {
    if (this.#version) {
      return this.#version;
    }
    const { stdout } = await this.#run(this.descriptor.versionCommand);
    this.#version = stdout.trim();
    if (!valid2(this.#version)) {
      throw new Error(`Invalid semver version for ${this.name}: "${this.#version}"`);
    }
    return this.#version;
  }
  /**
   * Gets the installed details of a package from the project's dependencies.
   * @param packageName The name of the package to check.
   * @returns A promise that resolves to the installed package details, or `null` if the package is not installed.
   */
  async getInstalledPackage(packageName) {
    const cache = await this.#populateDependencyCache();
    return cache.get(packageName) ?? null;
  }
  /**
   * Gets a map of all top-level dependencies installed in the project.
   * @returns A promise that resolves to a map of package names to their installed package details.
   */
  async getProjectDependencies() {
    const cache = await this.#populateDependencyCache();
    return new Map(cache);
  }
  /**
   * Fetches the registry metadata for a package. This is the full metadata,
   * including all versions and distribution tags.
   * @param packageName The name of the package to fetch the metadata for.
   * @param options Options for the fetch.
   * @param options.timeout The maximum time in milliseconds to wait for the command to complete.
   * @param options.registry The registry to use for the fetch.
   * @param options.bypassCache If true, ignores the in-memory cache and fetches fresh data.
   * @returns A promise that resolves to the `PackageMetadata` object, or `null` if the package is not found.
   */
  async getRegistryMetadata(packageName, options = {}) {
    const cacheKey = options.registry ? `${packageName}|${options.registry}` : packageName;
    if (!options.bypassCache) {
      const cached = this.#metadataCache.get(cacheKey);
      if (cached !== void 0) {
        return cached;
      }
    }
    let metadata;
    if (this.descriptor.getRegistryMetadata) {
      metadata = await this.descriptor.getRegistryMetadata(packageName, (args, parser) => this.#fetchAndParse(args, parser, options));
    } else {
      const commandArgs = [...this.descriptor.getManifestCommand, packageName];
      const formatter = this.descriptor.viewCommandFieldArgFormatter;
      if (formatter) {
        commandArgs.push(...formatter(METADATA_FIELDS));
      }
      metadata = await this.#fetchAndParse(commandArgs, (stdout, logger) => this.descriptor.outputParsers.getRegistryMetadata(stdout, logger), options);
    }
    this.#metadataCache.set(cacheKey, metadata);
    return metadata;
  }
  /**
   * Fetches the registry manifest for a specific version of a package.
   * The manifest is similar to the package's `package.json` file.
   * @param packageName The name of the package to fetch the manifest for.
   * @param version The version of the package to fetch the manifest for.
   * @param options Options for the fetch.
   * @param options.timeout The maximum time in milliseconds to wait for the command to complete.
   * @param options.registry The registry to use for the fetch.
   * @param options.bypassCache If true, ignores the in-memory cache and fetches fresh data.
   * @returns A promise that resolves to the `PackageManifest` object, or `null` if the package is not found.
   */
  async getRegistryManifest(packageName, version, options = {}) {
    const specifier = this.host.requiresQuoting ? `"${packageName}@${version}"` : `${packageName}@${version}`;
    const commandArgs = [...this.descriptor.getManifestCommand, specifier];
    const formatter = this.descriptor.viewCommandFieldArgFormatter;
    if (formatter) {
      commandArgs.push(...formatter(MANIFEST_FIELDS));
    }
    const cacheKey = options.registry ? `${specifier}|${options.registry}` : specifier;
    const manifest = await this.#fetchAndParse(commandArgs, (stdout, logger) => this.descriptor.outputParsers.getRegistryManifest(stdout, logger), { ...options, cache: this.#manifestCache, cacheKey });
    if (manifest && manifest.version !== version) {
      const manifestSpecifier = `${manifest.name}@${manifest.version}`;
      const manifestCacheKey = options.registry ? `${manifestSpecifier}|${options.registry}` : manifestSpecifier;
      this.#manifestCache.set(manifestCacheKey, manifest);
    }
    return manifest;
  }
  /**
   * Fetches the manifest for a package.
   *
   * This method can resolve manifests for packages from the registry, as well
   * as those specified by file paths, directory paths, and remote tarballs.
   * Caching is only supported for registry packages.
   *
   * @param specifier The package specifier to resolve the manifest for.
   * @param options Options for the fetch.
   * @returns A promise that resolves to the `PackageManifest` object, or `null` if the package is not found.
   */
  async getManifest(specifier, options = {}) {
    const { name, type, fetchSpec } = typeof specifier === "string" ? npa(specifier) : specifier;
    switch (type) {
      case "range":
      case "version":
      case "tag": {
        if (!name) {
          throw new Error(`Could not parse package name from specifier: ${specifier}`);
        }
        let versionSpec = fetchSpec ?? "latest";
        if (this.descriptor.requiresManifestVersionLookup) {
          if (type === "tag" || !fetchSpec) {
            const metadata = await this.getRegistryMetadata(name, options);
            if (!metadata) {
              return null;
            }
            versionSpec = metadata["dist-tags"][versionSpec];
          } else if (type === "range") {
            const metadata = await this.getRegistryMetadata(name, options);
            if (!metadata) {
              return null;
            }
            versionSpec = maxSatisfying(metadata.versions, fetchSpec) ?? "";
          }
          if (!versionSpec) {
            return null;
          }
        }
        return this.getRegistryManifest(name, versionSpec, options);
      }
      case "directory": {
        if (!fetchSpec) {
          throw new Error(`Could not parse directory path from specifier: ${specifier}`);
        }
        const manifestPath = join4(fetchSpec, "package.json");
        const manifest = await this.host.readFile(manifestPath);
        return JSON.parse(manifest);
      }
      case "file":
      case "remote":
      case "git": {
        if (!fetchSpec) {
          throw new Error(`Could not parse location from specifier: ${specifier}`);
        }
        const { workingDirectory, cleanup } = await this.acquireTempPackage(fetchSpec, {
          ...options,
          ignoreScripts: true
        });
        try {
          const tempManifest = await this.host.readFile(join4(workingDirectory, "package.json"));
          const { dependencies } = JSON.parse(tempManifest);
          const packageName = dependencies && Object.keys(dependencies)[0];
          if (!packageName) {
            throw new Error(`Could not determine package name for specifier: ${specifier}`);
          }
          const packagePath = join4(workingDirectory, "node_modules", packageName);
          const manifestPath = join4(packagePath, "package.json");
          const manifest = await this.host.readFile(manifestPath);
          return JSON.parse(manifest);
        } finally {
          await cleanup();
        }
      }
      default:
        throw new Error(`Unsupported package specifier type: ${type}`);
    }
  }
  async getTemporaryDirectory() {
    const { tempDirectory } = this.options;
    if (tempDirectory && !relative(this.cwd, tempDirectory).startsWith("..")) {
      try {
        await this.host.stat(tempDirectory);
      } catch {
        await this.host.mkdir(tempDirectory, { recursive: true });
      }
      return tempDirectory;
    }
    const tempOptions = ["node_modules"];
    for (const tempOption of tempOptions) {
      try {
        const directory = resolve(this.cwd, tempOption);
        if ((await this.host.stat(directory)).isDirectory()) {
          return directory;
        }
      } catch {
      }
    }
  }
  /**
   * Acquires a package by installing it into a temporary directory. The caller is
   * responsible for managing the lifecycle of the temporary directory by calling
   * the returned `cleanup` function.
   *
   * @param specifier The specifier of the package to install.
   * @param options Options for the installation.
   * @returns A promise that resolves to an object containing the temporary path
   *   and a cleanup function.
   */
  async acquireTempPackage(specifier, options = {}) {
    const workingDirectory = await this.host.createTempDirectory(await this.getTemporaryDirectory());
    const cleanup = () => this.host.deleteDirectory(workingDirectory);
    let packageManagerVersion;
    try {
      packageManagerVersion = await this.getVersion();
    } catch {
    }
    const tempPackageJson = packageManagerVersion ? { packageManager: `${this.name}@${packageManagerVersion}` } : {};
    await this.host.writeFile(join4(workingDirectory, "package.json"), JSON.stringify(tempPackageJson, null, 2));
    if (this.name === "pnpm") {
      try {
        const workspaceConfigPath = join4(this.cwd, "pnpm-workspace.yaml");
        const content = await this.host.readFile(workspaceConfigPath);
        await this.host.writeFile(join4(workingDirectory, "pnpm-workspace.yaml"), sanitizePnpmWorkspace(content));
      } catch {
        await this.host.writeFile(join4(workingDirectory, "pnpm-workspace.yaml"), "packages:\n  - '.'\n");
      }
    }
    if (this.name === "yarn") {
      await this.host.writeFile(join4(workingDirectory, "yarn.lock"), "");
    }
    if (this.descriptor.copyConfigFromProject) {
      let copiedYarnConfig = false;
      for (const configFile of this.descriptor.configFiles) {
        try {
          const configPath = join4(this.cwd, configFile);
          let content = await this.host.readFile(configPath);
          if (this.name === "yarn") {
            content = sanitizeYarnRc(content);
          }
          await this.host.writeFile(join4(workingDirectory, configFile), content);
          if (this.name === "yarn") {
            copiedYarnConfig = true;
          }
        } catch {
        }
      }
      if (this.name === "yarn" && !copiedYarnConfig) {
        await this.host.writeFile(join4(workingDirectory, ".yarnrc.yml"), "nodeLinker: node-modules\n");
      }
    }
    const flags = [options.ignoreScripts ? this.descriptor.ignoreScriptsFlag : ""].filter((flag) => flag);
    const args = [this.descriptor.addCommand, specifier, ...flags];
    try {
      await this.#run(args, { ...options, cwd: workingDirectory });
    } catch (e) {
      await cleanup();
      throw e;
    }
    return { workingDirectory, cleanup };
  }
  /**
   * Gets the active release age gate limit in milliseconds.
   * @returns A promise that resolves to the limit in milliseconds, or `0` if not set.
   */
  async getMinimumReleaseAge() {
    if (this.#minimumReleaseAge === void 0) {
      this.#minimumReleaseAge = this.#resolveMinimumReleaseAge();
    }
    return this.#minimumReleaseAge;
  }
  /**
   * Resolves the active minimum release age by querying the package manager configuration
   * and parsing the resulting setting.
   * @returns A promise that resolves to the limit in milliseconds, or `0` if not set.
   */
  async #resolveMinimumReleaseAge() {
    if (this.descriptor.getReleaseAgeConfigCommand && this.descriptor.outputParsers.getReleaseAge) {
      try {
        const { stdout } = await this.#run(this.descriptor.getReleaseAgeConfigCommand);
        const version = await this.getVersion();
        return this.descriptor.outputParsers.getReleaseAge(stdout, version);
      } catch {
      }
    }
    return 0;
  }
};
function sanitizePnpmWorkspace(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let inBlockToRemove = false;
  let blockIndent = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push(line);
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (inBlockToRemove) {
      if (indent > blockIndent) {
        continue;
      }
      inBlockToRemove = false;
    }
    if (trimmed.startsWith("overrides:") || trimmed.startsWith("packages:")) {
      inBlockToRemove = true;
      blockIndent = indent;
      if (trimmed.startsWith("packages:")) {
        result.push(line.replace(/packages:.*/, "packages:\n  - '.'"));
      }
      continue;
    }
    result.push(line);
  }
  return result.join("\n");
}
function sanitizeYarnRc(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let inBlockToRemove = false;
  let blockIndent = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push(line);
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (inBlockToRemove) {
      if (indent > blockIndent) {
        continue;
      }
      inBlockToRemove = false;
    }
    if (indent === 0 && (trimmed.startsWith("yarnPath:") || trimmed.startsWith("nodeLinker:") || trimmed.startsWith("plugins:"))) {
      inBlockToRemove = true;
      blockIndent = indent;
      continue;
    }
    result.push(line);
  }
  result.push("nodeLinker: node-modules");
  return result.join("\n");
}

// packages/angular/cli/src/package-managers/factory.js
var DEFAULT_PACKAGE_MANAGER = "npm";
async function getPackageManagerVersion(host, cwd, name, logger) {
  const descriptor = SUPPORTED_PACKAGE_MANAGERS[name];
  logger?.debug(`Getting ${name} version...`);
  const { stdout } = await host.runCommand(descriptor.binary, descriptor.versionCommand, { cwd });
  const version = stdout.trim();
  logger?.debug(`${name} version is '${version}'.`);
  return version;
}
async function determinePackageManager(host, cwd, configured = [], logger, dryRun) {
  let [name, version] = configured;
  let source;
  if (name) {
    source = "configured";
    logger?.debug(`Using configured package manager: '${name}'.`);
  } else {
    const discovered = await discover(host, cwd, logger);
    if (discovered) {
      name = discovered;
      source = "discovered";
      logger?.debug(`Discovered package manager: '${name}'.`);
    } else {
      name = DEFAULT_PACKAGE_MANAGER;
      source = "default";
      logger?.debug(`No lockfile found. Using default package manager: '${DEFAULT_PACKAGE_MANAGER}'.`);
    }
  }
  if (name === "yarn" && !dryRun) {
    assert.deepStrictEqual(SUPPORTED_PACKAGE_MANAGERS.yarn.versionCommand, SUPPORTED_PACKAGE_MANAGERS["yarn-classic"].versionCommand, "Yarn and Yarn Classic version commands must match for detection logic to be valid.");
    try {
      version ??= await getPackageManagerVersion(host, cwd, name, logger);
      if (version && major(version) < 2) {
        name = "yarn-classic";
        logger?.debug(`Detected yarn classic. Using 'yarn-classic'.`);
      }
    } catch {
      logger?.debug("Failed to get yarn version.");
    }
  } else if (name === "yarn") {
    logger?.debug("Skipping yarn version check due to dry run. Assuming modern yarn.");
  }
  return { name, source, version };
}
async function createPackageManager(options) {
  const { cwd, configuredPackageManager, logger, dryRun, tempDirectory } = options;
  const host = NodeJS_HOST;
  const result = await determinePackageManager(host, cwd, configuredPackageManager, logger, dryRun);
  const { name, source } = result;
  let { version } = result;
  const descriptor = SUPPORTED_PACKAGE_MANAGERS[name];
  if (!descriptor) {
    throw new Error(`Unsupported package manager: "${name}"`);
  }
  let initializationError;
  if (!dryRun && !version) {
    try {
      version = await getPackageManagerVersion(host, cwd, name, logger);
    } catch {
      if (source === "default") {
        initializationError = new Error(`'${DEFAULT_PACKAGE_MANAGER}' was selected as the default package manager, but it is not installed or cannot be found in the PATH. Please install '${DEFAULT_PACKAGE_MANAGER}' to continue.`);
      } else {
        initializationError = new Error(`The project is configured to use '${name}', but it is not installed or cannot be found in the PATH. Please install '${name}' to continue.`);
      }
    }
  }
  const packageManager = new PackageManager(host, cwd, descriptor, {
    dryRun,
    logger,
    tempDirectory,
    version,
    initializationError
  });
  logger?.debug(`Successfully created PackageManager for '${name}'.`);
  return packageManager;
}

// packages/angular/cli/src/utilities/memoize.js
function memoize(target, context) {
  if (context.kind !== "method" && context.kind !== "getter") {
    throw new Error("Memoize decorator can only be used on methods or get accessors.");
  }
  const cache = /* @__PURE__ */ new Map();
  return function(...args) {
    for (const arg of args) {
      if (!isJSONSerializable(arg)) {
        throw new Error(`Argument ${isNonPrimitive(arg) ? arg.toString() : arg} is JSON serializable.`);
      }
    }
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = target.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
function isNonPrimitive(value) {
  return value !== null && typeof value === "object" || typeof value === "function" || typeof value === "symbol";
}
function isJSONSerializable(value) {
  if (!isNonPrimitive(value)) {
    return true;
  }
  let nestedValues;
  if (Array.isArray(value)) {
    nestedValues = value;
  } else if (Object.prototype.toString.call(value) === "[object Object]") {
    nestedValues = Object.values(value);
  }
  if (!nestedValues || nestedValues.some((v) => !isJSONSerializable(v))) {
    return false;
  }
  return true;
}

// packages/angular/cli/src/command-builder/utilities/json-schema.js
import { isJsonObject, json as json3, strings } from "@angular-devkit/core";
function checkStringMap(keyValuePairOptions, args) {
  for (const key of keyValuePairOptions) {
    const value = args[key];
    if (!Array.isArray(value)) {
      continue;
    }
    for (const pair of value) {
      if (pair === void 0) {
        continue;
      }
      if (!pair.includes("=")) {
        throw new Error(`Invalid value for argument: ${key}, Given: '${pair}', Expected key=value pair`);
      }
    }
  }
  return true;
}
function coerceToStringMap(value) {
  const stringMap = {};
  for (const pair of value) {
    if (pair === void 0) {
      continue;
    }
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      return value;
    }
    const key = pair.slice(0, eqIdx);
    stringMap[key] = pair.slice(eqIdx + 1);
  }
  return stringMap;
}
function isStringMap(node) {
  if (node.properties || node.patternProperties) {
    return false;
  }
  return json3.isJsonObject(node.additionalProperties) && !node.additionalProperties.enum && node.additionalProperties.type === "string";
}
var SUPPORTED_PRIMITIVE_TYPES = /* @__PURE__ */ new Set(["boolean", "number", "string"]);
function isSupportedPrimitiveType(value) {
  return SUPPORTED_PRIMITIVE_TYPES.has(value);
}
function isSupportedArrayItemSchema(schema2) {
  if (typeof schema2.type === "string" && isSupportedPrimitiveType(schema2.type)) {
    return true;
  }
  if (json3.isJsonArray(schema2.enum)) {
    return true;
  }
  if (json3.isJsonArray(schema2.items)) {
    return schema2.items.some((item) => isJsonObject(item) && isSupportedArrayItemSchema(item));
  }
  if (json3.isJsonArray(schema2.oneOf) && schema2.oneOf.some((item) => isJsonObject(item) && isSupportedArrayItemSchema(item))) {
    return true;
  }
  if (json3.isJsonArray(schema2.anyOf) && schema2.anyOf.some((item) => isJsonObject(item) && isSupportedArrayItemSchema(item))) {
    return true;
  }
  return false;
}
function getSupportedTypes(current) {
  const typeSet = json3.schema.getTypesOfSchema(current);
  if (typeSet.size === 0) {
    return [];
  }
  return [...typeSet].filter((type) => {
    switch (type) {
      case "boolean":
      case "number":
      case "string":
        return true;
      case "array":
        return isJsonObject(current.items) && isSupportedArrayItemSchema(current.items);
      case "object":
        return isStringMap(current);
      default:
        return false;
    }
  });
}
function getEnumValues(current) {
  if (json3.isJsonArray(current.enum)) {
    return current.enum.sort();
  }
  if (isJsonObject(current.items)) {
    const enumValues = getEnumValues(current.items);
    if (enumValues?.length) {
      return enumValues;
    }
  }
  if (typeof current.type === "string" && isSupportedPrimitiveType(current.type)) {
    return [];
  }
  const subSchemas = json3.isJsonArray(current.oneOf) && current.oneOf || json3.isJsonArray(current.anyOf) && current.anyOf;
  if (subSchemas) {
    for (const subSchema of subSchemas) {
      if (isJsonObject(subSchema)) {
        const enumValues = getEnumValues(subSchema);
        if (enumValues) {
          return enumValues;
        }
      }
    }
  }
  return [];
}
function getDefaultValue(current, type) {
  const defaultValue = current.default;
  if (defaultValue === void 0) {
    return void 0;
  }
  if (type === "array") {
    return Array.isArray(defaultValue) && defaultValue.length > 0 ? defaultValue : void 0;
  }
  if (typeof defaultValue === type) {
    return defaultValue;
  }
  return void 0;
}
function getAliases(current) {
  if (json3.isJsonArray(current.aliases)) {
    return [...current.aliases].map(String);
  }
  if (current.alias) {
    return [String(current.alias)];
  }
  return [];
}
async function parseJsonSchemaToOptions(registry, schema2, interactive = true) {
  const options = [];
  function visitor(current, pointer, parentSchema) {
    if (!parentSchema || json3.isJsonArray(current) || pointer.split(/\/(?:properties|items|definitions)\//g).length > 2) {
      return;
    }
    if (pointer.includes("/not/")) {
      throw new Error('The "not" keyword is not supported in JSON Schema.');
    }
    const ptr = json3.schema.parseJsonPointer(pointer);
    if (ptr[ptr.length - 2] !== "properties") {
      return;
    }
    const name = ptr.at(-1);
    const types = getSupportedTypes(current);
    if (types.length === 0) {
      return;
    }
    const [type] = types;
    const $default = current.$default;
    const $defaultIndex = isJsonObject($default) && $default["$source"] === "argv" ? $default["index"] : void 0;
    const positional = typeof $defaultIndex === "number" ? $defaultIndex : void 0;
    let required = json3.isJsonArray(schema2.required) && schema2.required.includes(name);
    if (required && interactive && current["x-prompt"]) {
      required = false;
    }
    const visible = current.visible !== false;
    const xDeprecated = current["x-deprecated"];
    const enumValues = getEnumValues(current);
    const option = {
      name,
      description: String(current.description ?? ""),
      default: getDefaultValue(current, type),
      choices: enumValues?.length ? enumValues : void 0,
      required,
      alias: getAliases(current),
      format: typeof current.format === "string" ? current.format : void 0,
      hidden: !!current.hidden || !visible,
      userAnalytics: typeof current["x-user-analytics"] === "string" ? current["x-user-analytics"] : void 0,
      deprecated: xDeprecated === true || typeof xDeprecated === "string" ? xDeprecated : void 0,
      positional,
      ...type === "object" ? {
        type: "array",
        itemValueType: "string"
      } : {
        type
      }
    };
    options.push(option);
  }
  const flattenedSchema = await registry.\u0275flatten(schema2);
  json3.schema.visitJsonSchema(flattenedSchema, visitor);
  return options.sort((a, b) => {
    if (a.positional) {
      return b.positional ? a.positional - b.positional : a.name.localeCompare(b.name);
    } else if (b.positional) {
      return -1;
    }
    return a.name.localeCompare(b.name);
  });
}
function addSchemaOptionsToCommand(localYargs, options, includeDefaultValues) {
  const booleanOptionsWithNoPrefix = /* @__PURE__ */ new Set();
  const keyValuePairOptions = /* @__PURE__ */ new Set();
  const optionsWithAnalytics = /* @__PURE__ */ new Map();
  for (const option of options) {
    const { default: defaultVal, positional, deprecated, description, alias, userAnalytics, type, itemValueType, hidden, name, choices } = option;
    let dashedName = strings.dasherize(name);
    if (type === "boolean" && dashedName.startsWith("no-")) {
      dashedName = dashedName.slice(3);
      booleanOptionsWithNoPrefix.add(dashedName);
    }
    if (itemValueType) {
      keyValuePairOptions.add(dashedName);
    }
    const sharedOptions = {
      alias,
      hidden,
      description,
      deprecated,
      choices,
      coerce: itemValueType ? coerceToStringMap : void 0,
      // This should only be done when `--help` is used otherwise default will override options set in angular.json.
      ...includeDefaultValues ? { default: defaultVal } : {}
    };
    if (positional === void 0) {
      localYargs = localYargs.option(dashedName, {
        array: itemValueType ? true : void 0,
        type: itemValueType ?? type,
        ...sharedOptions
      });
    } else {
      localYargs = localYargs.positional(dashedName, {
        type: type === "array" || type === "count" ? "string" : type,
        ...sharedOptions
      });
    }
    if (userAnalytics !== void 0) {
      optionsWithAnalytics.set(name, userAnalytics);
    }
  }
  if (keyValuePairOptions.size) {
    localYargs.check(checkStringMap.bind(null, keyValuePairOptions), false);
  }
  if (booleanOptionsWithNoPrefix.size) {
    localYargs.middleware((options2) => {
      for (const key of booleanOptionsWithNoPrefix) {
        if (key in options2) {
          options2[`no-${key}`] = !options2[key];
          delete options2[key];
        }
      }
    }, false);
  }
  return optionsWithAnalytics;
}

// packages/angular/cli/src/command-builder/command-module.js
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
var CommandModule = (() => {
  let _instanceExtraInitializers = [];
  let _getAnalytics_decorators;
  return class CommandModule {
    static {
      const _metadata = typeof Symbol === "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
      _getAnalytics_decorators = [memoize];
      __esDecorate(this, null, _getAnalytics_decorators, { kind: "method", name: "getAnalytics", static: false, private: false, access: { has: (obj) => "getAnalytics" in obj, get: (obj) => obj.getAnalytics }, metadata: _metadata }, null, _instanceExtraInitializers);
      if (_metadata)
        Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    }
    context = __runInitializers(this, _instanceExtraInitializers);
    longDescription;
    longDescriptionRelativePath;
    shouldReportAnalytics = true;
    scope = CommandScope.Both;
    optionsWithAnalytics = /* @__PURE__ */ new Map();
    constructor(context) {
      this.context = context;
    }
    /**
     * Description object which contains the long command descroption.
     * This is used to generate JSON help wich is used in AIO.
     *
     * `false` will result in a hidden command.
     */
    get fullDescribe() {
      if (this.describe === false) {
        return false;
      }
      const description = {
        describe: this.describe
      };
      if (this.longDescription) {
        description.longDescription = this.longDescription.replace(/\r\n/g, "\n");
        description.longDescriptionRelativePath = this.longDescriptionRelativePath ?? `@angular/cli/src/commands/${this.commandName}/long-description.md`;
      }
      return description;
    }
    get commandName() {
      return this.command.split(" ", 1)[0];
    }
    async handler(args) {
      const { _, $0, ...options } = args;
      const { logger } = this.context;
      const camelCasedOptions = {};
      for (const [key, value] of Object.entries(options)) {
        camelCasedOptions[yargsParser.camelCase(key)] = value;
      }
      const autocompletionExitCode = await considerSettingUpAutocompletion(this.commandName, logger);
      if (autocompletionExitCode !== void 0) {
        process.exitCode = autocompletionExitCode;
        return;
      }
      const analytics = await this.getAnalytics();
      const stopPeriodicFlushes = analytics && analytics.periodFlush();
      let exitCode;
      try {
        if (analytics) {
          this.reportCommandRunAnalytics(analytics);
          this.reportWorkspaceInfoAnalytics(analytics);
        }
        exitCode = await this.run(camelCasedOptions);
      } catch (e) {
        if (e instanceof schema.SchemaValidationException) {
          logger.fatal(`Error: ${e.message}`);
          exitCode = 1;
        } else if (e instanceof PackageManagerError) {
          const output = e.stderr || e.stdout;
          logger.fatal(`Error: Package installation failed: ${e.message}${output ? `
Output: ${output}` : ""}`);
          exitCode = 1;
        } else {
          throw e;
        }
      } finally {
        await stopPeriodicFlushes?.();
        if (typeof exitCode === "number" && exitCode > 0) {
          process.exitCode = exitCode;
        }
      }
    }
    async getAnalytics() {
      if (!this.shouldReportAnalytics) {
        return void 0;
      }
      const userId = await getAnalyticsUserId(
        this.context,
        // Don't prompt on `ng update`, 'ng version' or `ng analytics`.
        ["version", "update", "analytics"].includes(this.commandName)
      );
      if (!userId) {
        return void 0;
      }
      let version;
      try {
        version = await this.context.packageManager.getVersion();
      } catch {
      }
      return new AnalyticsCollector(this.context.logger, userId, {
        name: this.context.packageManager.name,
        version
      });
    }
    /**
     * Adds schema options to a command also this keeps track of options that are required for analytics.
     * **Note:** This method should be called from the command bundler method.
     */
    addSchemaOptionsToCommand(localYargs, options) {
      const optionsWithAnalytics = addSchemaOptionsToCommand(
        localYargs,
        options,
        // This should only be done when `--help` is used otherwise default will override options set in angular.json.
        /* includeDefaultValues= */
        this.context.args.options.help
      );
      for (const [name, userAnalytics] of optionsWithAnalytics) {
        this.optionsWithAnalytics.set(name, userAnalytics);
      }
      return localYargs;
    }
    getWorkspaceOrThrow() {
      const { workspace } = this.context;
      if (!workspace) {
        throw new CommandModuleError("A workspace is required for this command.");
      }
      return workspace;
    }
    /**
     * Flush on an interval (if the event loop is waiting).
     *
     * @returns a method that when called will terminate the periodic
     * flush and call flush one last time.
     */
    getAnalyticsParameters(options) {
      const parameters = {};
      const validEventCustomDimensionAndMetrics = /* @__PURE__ */ new Set([
        ...Object.values(EventCustomDimension),
        ...Object.values(EventCustomMetric)
      ]);
      for (const [name, ua] of this.optionsWithAnalytics) {
        if (!validEventCustomDimensionAndMetrics.has(ua)) {
          continue;
        }
        const value = options[name];
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          parameters[ua] = value;
        } else if (Array.isArray(value)) {
          parameters[ua] = value.sort().join(", ");
        }
      }
      return parameters;
    }
    reportCommandRunAnalytics(analytics) {
      const internalMethods = this.context.yargsInstance.getInternalMethods();
      const fullCommand = internalMethods.getUsageInstance().getUsage()[0][0].split(" ").filter((x) => {
        const code = x.charCodeAt(0);
        return code >= 97 && code <= 122;
      }).join("_");
      analytics.reportCommandRunEvent(fullCommand);
    }
    reportWorkspaceInfoAnalytics(analytics) {
      const { workspace } = this.context;
      if (!workspace) {
        return;
      }
      let applicationProjectsCount = 0;
      let librariesProjectsCount = 0;
      for (const project of workspace.projects.values()) {
        switch (project.extensions["projectType"]) {
          case "application":
            applicationProjectsCount++;
            break;
          case "library":
            librariesProjectsCount++;
            break;
        }
      }
      analytics.reportWorkspaceInfoEvent({
        [EventCustomMetric.AllProjectsCount]: librariesProjectsCount + applicationProjectsCount,
        [EventCustomMetric.ApplicationProjectsCount]: applicationProjectsCount,
        [EventCustomMetric.LibraryProjectsCount]: librariesProjectsCount
      });
    }
  };
})();
var CommandModuleError = class extends Error {
};

export {
  isTTY,
  askConfirmation,
  askQuestion,
  askChoices,
  isPackageNameSafeForAnalytics,
  setAnalyticsConfig,
  promptAnalytics,
  getAnalyticsInfoString,
  EventCustomDimension,
  EventCustomMetric,
  createPackageManager,
  initializeAutocomplete,
  hasGlobalCliInstall,
  memoize,
  CommandScope,
  parseJsonSchemaToOptions,
  CommandModule,
  CommandModuleError
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
