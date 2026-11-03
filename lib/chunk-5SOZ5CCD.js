// packages/angular/cli/src/command-builder/utilities/json-help.js
import { strings } from "@angular-devkit/core";
var jsonHelpBuilders = /* @__PURE__ */ new WeakMap();
function setJsonHelpBuilders(localYargs, builders) {
  jsonHelpBuilders.set(localYargs, builders);
}
function schemaOptionsToJsonHelpOptions(options) {
  const normalizeOptions = [];
  for (const option of options) {
    if (option.hidden) {
      continue;
    }
    let dashedName = strings.dasherize(option.name);
    if (option.type === "boolean" && dashedName.startsWith("no-")) {
      dashedName = dashedName.slice(3);
    }
    const alias = Array.isArray(option.alias) ? option.alias : option.alias ? [option.alias] : void 0;
    normalizeOptions.push({
      name: dashedName,
      type: option.type,
      deprecated: option.deprecated,
      aliases: alias && alias.length > 0 ? alias : void 0,
      default: option.default,
      enum: option.choices?.length ? option.choices : void 0,
      description: option.description,
      positional: option.positional
    });
  }
  return normalizeOptions.sort((a, b) => a.name.localeCompare(b.name));
}
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
  const builders = jsonHelpBuilders.get(localYargs);
  const output = {
    name: [...context.commands].pop(),
    command: `${command?.replace(yargsDefaultCommandRegExp, localYargsInstance["$0"])}${defaultSubCommand}`,
    ...parseDescription(rawDescription),
    options: normalizeOptions.sort((a, b) => a.name.localeCompare(b.name)),
    builders: builders?.length ? builders : void 0,
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

export {
  setJsonHelpBuilders,
  schemaOptionsToJsonHelpOptions,
  jsonHelpUsage
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
