import {
  writeErrorToLogFile
} from "../chunk-SN4KY4Z3.js";
import {
  isNodeVersionMinSupported,
  supportedNodeVersions
} from "../chunk-XFL2J3CJ.js";
import {
  RootCommands,
  RootCommandsAliases
} from "../chunk-LRL5U6GP.js";
import {
  getCacheConfig
} from "../chunk-6XIGJM7L.js";
import {
  addCommandModuleToYargs,
  demandCommandFailureMessage
} from "../chunk-G7TRU43D.js";
import {
  CommandModuleError,
  createPackageManager
} from "../chunk-YM7ILCS5.js";
import {
  VERSION,
  ngDebug
} from "../chunk-XG3HVNIL.js";
import {
  colors,
  supportColor
} from "../chunk-GHUUJYOY.js";
import {
  assertIsError,
  getProjectByCwd,
  getWorkspace
} from "../chunk-FZ5GFCWU.js";

// packages/angular/cli/lib/cli/index.js
import { logging } from "@angular-devkit/core";
import { format, stripVTControlCharacters } from "node:util";

// packages/angular/cli/src/command-builder/command-runner.js
import { isJsonObject } from "@angular-devkit/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import yargs from "yargs";
import { Parser as yargsParser } from "yargs/helpers";

// packages/angular/cli/src/command-builder/utilities/json-help.js
var yargsDefaultCommandRegExp = /^\$0|\*/;
function jsonHelpUsage(localYargs) {
  const localYargsInstance = localYargs;
  const { deprecatedOptions, alias: aliases, array, string, boolean, number, choices, demandedOptions, default: defaultVal, hiddenOptions = [] } = localYargsInstance.getOptions();
  const internalMethods = localYargsInstance.getInternalMethods();
  const usageInstance = internalMethods.getUsageInstance();
  const context = internalMethods.getContext();
  const descriptions = usageInstance.getDescriptions();
  const groups = localYargsInstance.getGroups();
  const positional = groups[usageInstance.getPositionalGroupName()];
  const seen = /* @__PURE__ */ new Set();
  const hidden = new Set(hiddenOptions);
  const normalizeOptions = [];
  const allAliases = /* @__PURE__ */ new Set([...Object.values(aliases).flat()]);
  for (const [names, type] of [
    [number, "number"],
    [array, "array"],
    [string, "string"],
    [boolean, "boolean"]
  ]) {
    for (const name of names) {
      if (allAliases.has(name) || hidden.has(name) || seen.has(name)) {
        continue;
      }
      seen.add(name);
      const positionalIndex = positional?.indexOf(name) ?? -1;
      const alias = aliases[name];
      normalizeOptions.push({
        name,
        type,
        deprecated: deprecatedOptions[name],
        aliases: alias?.length > 0 ? alias : void 0,
        default: defaultVal[name],
        required: demandedOptions[name],
        enum: choices[name],
        description: descriptions[name]?.replace("__yargsString__:", ""),
        positional: positionalIndex >= 0 ? positionalIndex : void 0
      });
    }
  }
  const subcommands = usageInstance.getCommands().map(([name, rawDescription2, isDefault, aliases2, deprecated]) => ({
    name: name.split(" ", 1)[0].replace(yargsDefaultCommandRegExp, ""),
    command: name.replace(yargsDefaultCommandRegExp, ""),
    default: isDefault || void 0,
    ...parseDescription(rawDescription2),
    aliases: aliases2,
    deprecated
  })).sort((a, b) => a.name.localeCompare(b.name));
  const [command, rawDescription] = usageInstance.getUsage()[0] ?? [];
  const defaultSubCommand = subcommands.find((x) => x.default)?.command ?? "";
  const otherSubcommands = subcommands.filter((s) => !s.default);
  const output = {
    name: [...context.commands].pop(),
    command: `${command?.replace(yargsDefaultCommandRegExp, localYargsInstance["$0"])}${defaultSubCommand}`,
    ...parseDescription(rawDescription),
    options: normalizeOptions.sort((a, b) => a.name.localeCompare(b.name)),
    subcommands: otherSubcommands.length ? otherSubcommands : void 0
  };
  return JSON.stringify(output, void 0, 2);
}
function parseDescription(rawDescription) {
  try {
    const { longDescription, describe: shortDescription, longDescriptionRelativePath } = JSON.parse(rawDescription);
    return {
      shortDescription,
      longDescriptionRelativePath,
      longDescription
    };
  } catch {
    return {
      shortDescription: rawDescription
    };
  }
}

// packages/angular/cli/src/command-builder/utilities/normalize-options-middleware.js
function createNormalizeOptionsMiddleware(localeYargs) {
  return (args) => {
    const { array } = localeYargs.getOptions();
    const arrayOptions = new Set(array);
    for (const [key, value] of Object.entries(args)) {
      if (key !== "_" && Array.isArray(value) && !arrayOptions.has(key)) {
        const newValue = value.pop();
        console.warn(`Option '${key}' has been specified multiple times. The value '${newValue}' will be used.`);
        args[key] = newValue;
      }
    }
  };
}

// packages/angular/cli/src/command-builder/command-runner.js
async function runCommand(args, logger) {
  const { $0, _, help = false, dryRun = false, jsonHelp = false, getYargsCompletions = false, ...rest } = yargsParser(args, {
    boolean: ["help", "json-help", "get-yargs-completions", "dry-run"],
    alias: { "collection": "c" }
  });
  const positional = getYargsCompletions ? _.slice(1) : _;
  let workspace;
  let globalConfiguration;
  try {
    [workspace, globalConfiguration] = await Promise.all([
      getWorkspace("local"),
      getWorkspace("global")
    ]);
  } catch (e) {
    assertIsError(e);
    logger.fatal(e.message);
    return 1;
  }
  const root = workspace?.basePath ?? process.cwd();
  const cacheConfig = workspace && getCacheConfig(workspace);
  const packageManager = await createPackageManager({
    cwd: root,
    logger,
    dryRun: dryRun || help || jsonHelp || getYargsCompletions,
    tempDirectory: cacheConfig?.enabled ? cacheConfig.path : void 0,
    configuredPackageManager: await getConfiguredPackageManager(root, workspace, globalConfiguration)
  });
  const localYargs = yargs(args);
  const context = {
    globalConfiguration,
    workspace,
    logger,
    currentDirectory: process.cwd(),
    yargsInstance: localYargs,
    root,
    packageManager,
    args: {
      positional: positional.map((v) => v.toString()),
      options: {
        help,
        jsonHelp,
        getYargsCompletions,
        ...rest
      }
    }
  };
  for (const CommandModule of await getCommandsToRegister(positional[0])) {
    addCommandModuleToYargs(CommandModule, context);
  }
  const usageInstance = localYargs.getInternalMethods().getUsageInstance();
  if (jsonHelp) {
    usageInstance.help = () => jsonHelpUsage(localYargs);
  } else if (!help) {
    usageInstance.cacheHelpMessage = () => {
    };
  }
  localYargs.command("*", false, (builder) => builder.version("version", "Show Angular CLI version.", VERSION.full));
  await localYargs.scriptName("ng").parserConfiguration({
    "populate--": true,
    "unknown-options-as-args": false,
    "dot-notation": false,
    "boolean-negation": true,
    "strip-aliased": true,
    "strip-dashed": true,
    "camel-case-expansion": false
  }).option("json-help", {
    describe: "Show help in JSON format.",
    implies: ["help"],
    hidden: true,
    type: "boolean"
  }).help("help", "Shows a help message for this command in the console.").updateStrings({
    "Commands:": colors.cyan("Commands:"),
    "Options:": colors.cyan("Options:"),
    "Positionals:": colors.cyan("Arguments:"),
    "deprecated": colors.yellow("deprecated"),
    "deprecated: %s": colors.yellow("deprecated:") + " %s",
    "Did you mean %s?": "Unknown command. Did you mean %s?"
  }).epilogue("For more information, see https://angular.dev/cli/.\n").demandCommand(1, demandCommandFailureMessage).recommendCommands().middleware(createNormalizeOptionsMiddleware(localYargs)).version(false).showHelpOnFail(false).strict().fail((msg, err) => {
    throw msg ? (
      // Validation failed example: `Unknown argument:`
      new CommandModuleError(msg)
    ) : (
      // Unknown exception, re-throw.
      err
    );
  }).wrap(localYargs.terminalWidth()).parseAsync();
  return +(process.exitCode ?? 0);
}
async function getCommandsToRegister(commandName) {
  const commands = [];
  if (commandName in RootCommands) {
    commands.push(RootCommands[commandName]);
  } else if (commandName in RootCommandsAliases) {
    commands.push(RootCommandsAliases[commandName]);
  } else {
    Object.values(RootCommands).forEach((c) => commands.push(c));
  }
  return Promise.all(commands.map((command) => command.factory().then((m) => m.default)));
}
async function getConfiguredPackageManager(root, localWorkspace, globalWorkspace) {
  let result;
  try {
    const packageJsonPath = join(root, "package.json");
    const pkgJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    result = getPackageManager(pkgJson);
  } catch {
  }
  if (result) {
    return result;
  }
  if (localWorkspace) {
    const project = getProjectByCwd(localWorkspace);
    if (project) {
      result = getPackageManager(localWorkspace.projects.get(project)?.extensions["cli"]);
    }
    result ??= getPackageManager(localWorkspace.extensions["cli"]);
  }
  result ??= getPackageManager(globalWorkspace.extensions["cli"]);
  return result;
}
function getPackageManager(source) {
  if (source && isJsonObject(source)) {
    const value = source["packageManager"];
    if (typeof value === "string") {
      return value.split("@", 2);
    }
  }
  return void 0;
}

// packages/angular/cli/lib/cli/index.js
async function cli_default(options) {
  if (!isNodeVersionMinSupported()) {
    process.stderr.write(`Node.js version ${process.version} detected.
The Angular CLI requires a minimum of v${supportedNodeVersions[0]}.

Please update your Node.js version or visit https://nodejs.org/ for additional instructions.
`);
    return 3;
  }
  const colorLevels = {
    info: (s) => s,
    debug: (s) => s,
    warn: (s) => colors.bold(colors.yellow(s)),
    error: (s) => colors.bold(colors.red(s)),
    fatal: (s) => colors.bold(colors.red(s))
  };
  const logger = new logging.IndentLogger("cli-main-logger");
  const logInfo = console.log;
  const logWarn = console.warn;
  const logError = console.error;
  const useColor = supportColor();
  const loggerFinished = logger.forEach((entry) => {
    if (!ngDebug && entry.level === "debug") {
      return;
    }
    const color = useColor ? colorLevels[entry.level] : stripVTControlCharacters;
    const message = color(entry.message);
    switch (entry.level) {
      case "warn":
      case "fatal":
      case "error":
        logError(message);
        break;
      default:
        logInfo(message);
        break;
    }
  });
  console.info = console.log = function(...args) {
    logger.info(format(...args));
  };
  console.warn = function(...args) {
    logger.warn(format(...args));
  };
  console.error = function(...args) {
    logger.error(format(...args));
  };
  try {
    return await runCommand(options.cliArgs, logger);
  } catch (err) {
    if (err instanceof CommandModuleError) {
      logger.fatal(`Error: ${err.message}`);
    } else if (err instanceof Error) {
      try {
        const logPath = writeErrorToLogFile(err);
        logger.fatal(`An unhandled exception occurred: ${err.message}
See "${logPath}" for further details.`);
      } catch (e) {
        logger.fatal(`An unhandled exception occurred: ${err.message}
Fatal error writing debug log file: ${e}`);
        if (err.stack) {
          logger.fatal(err.stack);
        }
      }
      return 127;
    } else if (typeof err === "string") {
      logger.fatal(err);
    } else if (typeof err === "number") {
    } else {
      logger.fatal(`An unexpected error occurred: ${err}`);
    }
    return 1;
  } finally {
    logger.complete();
    await loggerFinished;
    console.log = console.info = logInfo;
    console.warn = logWarn;
    console.error = logError;
  }
}
export {
  VERSION,
  cli_default as default
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
