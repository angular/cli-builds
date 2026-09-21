import {
  writeErrorToLogFile
} from "./chunk-SN4KY4Z3.js";
import {
  SchematicEngineHost,
  formatFiles,
  subscribeToWorkflow
} from "./chunk-JBLF2TH3.js";
import {
  CommandModule,
  CommandModuleError,
  CommandScope,
  askChoices,
  isTTY
} from "./chunk-YM7ILCS5.js";
import {
  VERSION,
  disableVersionCheck
} from "./chunk-XG3HVNIL.js";
import {
  colors
} from "./chunk-GHUUJYOY.js";
import {
  assertIsError
} from "./chunk-FZ5GFCWU.js";

// packages/angular/cli/src/commands/update/cli.js
import { NodeWorkflow } from "@angular-devkit/schematics/tools";
import { Listr } from "listr2";
import { existsSync as existsSync3, promises as fs3 } from "node:fs";
import { Module, createRequire as createRequire2 } from "node:module";
import * as path3 from "node:path";
import npa2 from "npm-package-arg";

// packages/angular/cli/src/commands/update/long-description.md
var long_description_default = "Perform a basic update to the current stable release of the core framework and CLI by running the following command.\n\n```\nng update @angular/cli @angular/core\n```\n\nTo update to the next beta or pre-release version, use the `--next` option.\n\nTo update from one major version to another, use the format\n\n```\nng update @angular/cli@^<major_version> @angular/core@^<major_version>\n```\n\nWe recommend that you always update to the latest patch version, as it contains fixes we released since the initial major release.\nFor example, use the following command to take the latest 21.x.x version and use that to update.\n\n```\nng update @angular/cli@^21 @angular/core@^21\n```\n\nFor detailed information and guidance on updating your application, see the interactive [Angular Update Guide](/update-guide).\n";

// packages/angular/cli/src/commands/update/update-resolver.js
import { logging } from "@angular-devkit/core";
import { existsSync, promises as fs, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import npa from "npm-package-arg";
import * as semver from "semver";
var RegistryClient = class {
  packageManager;
  logger;
  minReleaseAge;
  getRegistryName;
  metadataCache = /* @__PURE__ */ new Map();
  manifestCache = /* @__PURE__ */ new Map();
  constructor(packageManager, logger, minReleaseAge = 0, getRegistryName) {
    this.packageManager = packageManager;
    this.logger = logger;
    this.minReleaseAge = minReleaseAge;
    this.getRegistryName = getRegistryName;
  }
  async getMetadata(packageName) {
    const registryName = this.getRegistryName ? this.getRegistryName(packageName) : packageName;
    let promise = this.metadataCache.get(registryName);
    if (!promise) {
      promise = this.packageManager.getRegistryMetadata(registryName).catch((e) => {
        this.metadataCache.delete(registryName);
        throw e;
      });
      this.metadataCache.set(registryName, promise);
    }
    const metadata = await promise;
    if (metadata && registryName !== packageName) {
      return { ...metadata, name: packageName };
    }
    return metadata;
  }
  async getManifest(packageName, version) {
    const registryName = this.getRegistryName ? this.getRegistryName(packageName) : packageName;
    const key = `${registryName}@${version}`;
    let promise = this.manifestCache.get(key);
    if (!promise) {
      promise = this.packageManager.getRegistryManifest(registryName, version).catch((e) => {
        this.manifestCache.delete(key);
        throw e;
      });
      this.manifestCache.set(key, promise);
    }
    const manifest = await promise;
    if (manifest && registryName !== packageName) {
      return { ...manifest, name: packageName };
    }
    return manifest;
  }
};
function isReleaseAgeSatisfied(registryClient, metadata, version) {
  const minReleaseAge = registryClient.minReleaseAge;
  if (!minReleaseAge || !metadata.time) {
    return true;
  }
  const publishTimeStr = metadata.time[version];
  if (!publishTimeStr) {
    return true;
  }
  const publishTime = Date.parse(publishTimeStr);
  if (isNaN(publishTime)) {
    return true;
  }
  return Date.now() - publishTime >= minReleaseAge;
}
async function getSatisfyingVersion(registryClient, metadata, range, next) {
  const options = { includePrerelease: next || void 0 };
  let candidates = metadata.versions.filter((v) => semver.satisfies(v, range, options));
  candidates = candidates.filter((version) => isReleaseAgeSatisfied(registryClient, metadata, version));
  const sorted = semver.rsort(candidates);
  for (const version of sorted) {
    const manifest = await registryClient.getManifest(metadata.name, version);
    if (manifest && !manifest.deprecated) {
      return version;
    }
  }
  for (const version of sorted) {
    const manifest = await registryClient.getManifest(metadata.name, version);
    if (manifest) {
      return version;
    }
  }
  return null;
}
function angularMajorCompatGuarantee(range) {
  let newRange = semver.validRange(range);
  if (!newRange) {
    return range;
  }
  let major = 1;
  while (!semver.gtr(major + ".0.0", newRange)) {
    major++;
    if (major >= 99) {
      return newRange;
    }
  }
  newRange = range;
  for (let minor = 0; minor < 20; minor++) {
    newRange += ` || ^${major}.${minor}.0-alpha.0 `;
  }
  return semver.validRange(newRange) || range;
}
var knownPeerCompatibleList = {
  "@angular/core": angularMajorCompatGuarantee
};
function _updatePeerVersion(infoMap, name, range) {
  const maybePackageInfo = infoMap.get(name);
  if (!maybePackageInfo) {
    return range;
  }
  if (maybePackageInfo.target) {
    name = maybePackageInfo.target.updateMetadata.packageGroupName || name;
  } else {
    name = maybePackageInfo.installed.updateMetadata.packageGroupName || name;
  }
  const maybeTransform = knownPeerCompatibleList[name];
  if (maybeTransform) {
    if (typeof maybeTransform == "function") {
      return maybeTransform(range);
    } else {
      return maybeTransform;
    }
  }
  return range;
}
function _validateForwardPeerDependencies(name, infoMap, logger) {
  let error = false;
  const info = infoMap.get(name);
  if (!info || !info.target) {
    return error;
  }
  const peerDependencies = info.target.packageJson.peerDependencies || {};
  const peerDependenciesMeta = info.target.packageJson.peerDependenciesMeta || {};
  for (const [peer, range] of Object.entries(peerDependencies)) {
    const peerInfo = infoMap.get(peer);
    if (!peerInfo) {
      continue;
    }
    const isOptional = !!peerDependenciesMeta[peer]?.optional;
    const resolvedRange = _updatePeerVersion(infoMap, peer, range);
    const resolvedVersion = peerInfo.target ? peerInfo.target.version : peerInfo.installed.version;
    if (!semver.satisfies(resolvedVersion, resolvedRange, { includePrerelease: true })) {
      logger.error(`Package ${JSON.stringify(name)} has an incompatible peer dependency to ${JSON.stringify(peer)} (requires ${JSON.stringify(range)}, would install ${JSON.stringify(resolvedVersion)}).`);
      error = error || !isOptional;
    }
  }
  return error;
}
function _validateReversePeerDependencies(name, version, infoMap, logger, next) {
  let error = false;
  for (const [installed, installedInfo] of infoMap.entries()) {
    const installedLogger = logger.createChild(installed);
    installedLogger.debug(`${installed}...`);
    const peers = (installedInfo.target || installedInfo.installed).packageJson.peerDependencies;
    const peersMeta = (installedInfo.target || installedInfo.installed).packageJson.peerDependenciesMeta;
    for (const [peer, range] of Object.entries(peers || {})) {
      if (peer !== name) {
        continue;
      }
      const isOptional = !!peersMeta?.[peer]?.optional;
      const resolvedRange = _updatePeerVersion(infoMap, name, range);
      if (!semver.satisfies(version, resolvedRange, { includePrerelease: next || void 0 })) {
        logger.error(`Package ${JSON.stringify(installed)} has an incompatible peer dependency to ${JSON.stringify(name)} (requires ${JSON.stringify(range)}, would install ${JSON.stringify(version)}).`);
        error = error || !isOptional;
      }
    }
  }
  return error;
}
function _validateUpdatePackages(infoMap, force, next, logger) {
  logger.debug("Validating peer dependencies...");
  let error = false;
  for (const name of infoMap.keys()) {
    const info = infoMap.get(name);
    if (!info || !info.target) {
      continue;
    }
    logger.debug(`Checking ${name}...`);
    error = _validateForwardPeerDependencies(name, infoMap, logger) || error;
    error = _validateReversePeerDependencies(name, info.target.version, infoMap, logger, next) || error;
  }
  if (error && !force) {
    throw new Error("Incompatible peer dependencies found. See above for details. You can bypass this check using the --force option.");
  }
}
function _getUpdateMetadata(packageJson, logger) {
  const metadata = packageJson["ng-update"];
  const result = {
    packageGroup: {},
    requirements: {}
  };
  if (!metadata || typeof metadata != "object" || Array.isArray(metadata)) {
    return result;
  }
  if (metadata["packageGroup"]) {
    const packageGroup = metadata["packageGroup"];
    if (Array.isArray(packageGroup) && packageGroup.every((x) => typeof x == "string")) {
      result.packageGroup = packageGroup.reduce((group, name) => {
        group[name] = packageJson.version;
        return group;
      }, {});
    } else if (typeof packageGroup == "object" && packageGroup !== null) {
      result.packageGroup = Object.entries(packageGroup).reduce((group, [name, version]) => {
        if (typeof version == "string") {
          group[name] = version;
        }
        return group;
      }, {});
    } else {
      logger.warn(`PackageGroup metadata for ${packageJson.name} is malformed. Ignoring.`);
    }
  }
  if (typeof metadata["packageGroupName"] == "string") {
    result.packageGroupName = metadata["packageGroupName"];
  }
  if (typeof metadata["migrations"] == "string") {
    result.migrations = metadata["migrations"];
  }
  return result;
}
function isPnpActive(workspaceRoot) {
  return process.versions.pnp !== void 0 || existsSync(path.join(workspaceRoot, ".pnp.cjs")) || existsSync(path.join(workspaceRoot, ".pnp.js"));
}
function findPackageJson(workspaceDir, packageName) {
  if (isPnpActive(workspaceDir)) {
    try {
      const workspaceRequire = createRequire(path.join(workspaceDir, "package.json"));
      return workspaceRequire.resolve(`${packageName}/package.json`);
    } catch {
      return void 0;
    }
  }
  let currentDir = workspaceDir;
  while (true) {
    const candidatePath = path.join(currentDir, "node_modules", packageName, "package.json");
    if (existsSync(candidatePath)) {
      return realpathSync(candidatePath);
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return void 0;
}
function getInstalledPackageJson(packageName, workspaceRoot) {
  try {
    const manifestPath = findPackageJson(workspaceRoot, packageName);
    if (manifestPath) {
      const content = readFileSync(manifestPath, "utf8");
      return JSON.parse(content);
    }
  } catch {
  }
  return null;
}
function getInstalledVersion(packageName, workspaceRoot) {
  const pkgJson = getInstalledPackageJson(packageName, workspaceRoot);
  return pkgJson?.version ?? null;
}
function _buildLocalPackageInfo(name, allDependencies, workspaceRoot) {
  const packageJsonRange = allDependencies.get(name);
  if (!packageJsonRange) {
    throw new Error(`Package ${JSON.stringify(name)} was not found in package.json.`);
  }
  const localPkgJson = getInstalledPackageJson(name, workspaceRoot);
  if (!localPkgJson) {
    throw new Error(`Package ${name} is not installed.`);
  }
  const installedVersion = localPkgJson.version;
  const npmPackageJson = {
    name,
    versions: [installedVersion],
    "dist-tags": {}
  };
  const logger = new logging.NullLogger();
  return {
    name,
    npmPackageJson,
    installed: {
      version: installedVersion,
      packageJson: localPkgJson,
      updateMetadata: _getUpdateMetadata(localPkgJson, logger)
    },
    packageJsonRange
  };
}
async function _buildPackageInfo(packages, allDependencies, npmPackageJson, workspaceRoot, registryClient, logger) {
  const name = npmPackageJson.name;
  const packageJsonRange = allDependencies.get(name);
  if (!packageJsonRange) {
    throw new Error(`Package ${JSON.stringify(name)} was not found in package.json.`);
  }
  const localPkgJson = getInstalledPackageJson(name, workspaceRoot);
  let installedVersion = localPkgJson?.version;
  if (!installedVersion) {
    installedVersion = await getSatisfyingVersion(registryClient, npmPackageJson, packageJsonRange);
  }
  if (!installedVersion) {
    throw new Error(`An unexpected error happened; could not determine version for package ${name}.`);
  }
  const installedPackageJson = localPkgJson || await registryClient.getManifest(name, installedVersion);
  if (!installedPackageJson) {
    throw new Error(`An unexpected error happened; package ${name} has no version ${installedVersion}.`);
  }
  let targetVersion = packages.get(name);
  if (targetVersion) {
    const distTags = npmPackageJson["dist-tags"] ?? {};
    let resolvedVersion = distTags[targetVersion] ?? (targetVersion === "next" ? distTags["latest"] : void 0);
    if (resolvedVersion && !isReleaseAgeSatisfied(registryClient, npmPackageJson, resolvedVersion)) {
      resolvedVersion = void 0;
    }
    if (resolvedVersion) {
      targetVersion = resolvedVersion;
    } else {
      targetVersion = await getSatisfyingVersion(registryClient, npmPackageJson, distTags[targetVersion] || targetVersion === "next" ? "*" : targetVersion);
    }
  }
  if (targetVersion && semver.lte(targetVersion, installedVersion)) {
    logger.debug(`Package ${name} already satisfied by package.json (${packageJsonRange}).`);
    targetVersion = void 0;
  }
  let target;
  if (targetVersion) {
    const targetPackageJson = await registryClient.getManifest(name, targetVersion);
    if (targetPackageJson) {
      target = {
        version: targetVersion,
        packageJson: targetPackageJson,
        updateMetadata: _getUpdateMetadata(targetPackageJson, logger)
      };
    }
  }
  return {
    name,
    npmPackageJson,
    installed: {
      version: installedVersion,
      packageJson: installedPackageJson,
      updateMetadata: _getUpdateMetadata(installedPackageJson, logger)
    },
    target,
    packageJsonRange
  };
}
function splitPackageName(pkg) {
  let name = pkg;
  let version;
  if (pkg.startsWith("@")) {
    const parts = pkg.split("@");
    name = "@" + parts[1];
    version = parts[2];
  } else if (pkg.includes("@")) {
    const parts = pkg.split("@");
    name = parts[0];
    version = parts[1];
  }
  return { name, version };
}
function _buildPackageList(options, allDependencies, logger) {
  const packages = /* @__PURE__ */ new Map();
  const inputPackages = options.packages ?? [];
  if (inputPackages.length === 0) {
    return packages;
  }
  for (const pkg of inputPackages) {
    const { name: pkgName, version: pkgVersion } = splitPackageName(pkg);
    if (!allDependencies.has(pkgName)) {
      throw new Error(`Package ${JSON.stringify(pkgName)} is not in package.json.`);
    }
    let targetVersion = pkgVersion;
    if (options.migrateOnly && !targetVersion && options.from) {
      targetVersion = options.from;
    }
    packages.set(pkgName, targetVersion || (options.next ? "next" : "latest"));
  }
  return packages;
}
async function resolvePackageVersion(registryClient, metadata, range, next = false) {
  const distTags = metadata["dist-tags"] ?? {};
  let resolvedVersion = distTags[range] ?? (range === "next" ? distTags["latest"] : void 0);
  if (resolvedVersion && !isReleaseAgeSatisfied(registryClient, metadata, resolvedVersion)) {
    resolvedVersion = void 0;
  }
  if (resolvedVersion) {
    return resolvedVersion;
  }
  return getSatisfyingVersion(registryClient, metadata, distTags[range] || range === "next" ? "*" : range, next);
}
async function _addPackageGroup(packages, allDependencies, metadata, registryClient, logger) {
  const maybePackage = packages.get(metadata.name);
  if (!maybePackage) {
    return;
  }
  const distTags = metadata["dist-tags"] ?? {};
  let version = maybePackage;
  let resolvedVersion = distTags[version] ?? (version === "next" ? distTags["latest"] : void 0);
  if (resolvedVersion && !isReleaseAgeSatisfied(registryClient, metadata, resolvedVersion)) {
    resolvedVersion = void 0;
  }
  if (resolvedVersion) {
    version = resolvedVersion;
  } else {
    version = await getSatisfyingVersion(registryClient, metadata, distTags[version] || version === "next" ? "*" : version) ?? version;
  }
  const packageJson = await registryClient.getManifest(metadata.name, version);
  if (!packageJson) {
    return;
  }
  const ngUpdateMetadata = packageJson["ng-update"];
  if (!ngUpdateMetadata) {
    return;
  }
  const packageGroup = ngUpdateMetadata["packageGroup"];
  if (!packageGroup) {
    return;
  }
  let packageGroupNormalized;
  if (Array.isArray(packageGroup) && !packageGroup.some((x) => typeof x != "string")) {
    packageGroupNormalized = packageGroup.reduce((acc, curr) => {
      acc[curr] = version;
      return acc;
    }, {});
  } else if (typeof packageGroup === "object" && packageGroup !== null) {
    packageGroupNormalized = Object.entries(packageGroup).reduce((acc, [name, v]) => {
      if (typeof v === "string") {
        acc[name] = v;
      }
      return acc;
    }, {});
  } else {
    logger.warn(`PackageGroup metadata for ${metadata.name} is malformed. Ignoring.`);
    return;
  }
  for (const [member, memberVersion] of Object.entries(packageGroupNormalized)) {
    if (packages.has(member)) {
      continue;
    }
    if (allDependencies.has(member)) {
      packages.set(member, memberVersion);
    }
  }
}
async function _addPeerDependencies(packages, allDependencies, npmPackageJson, workspaceRoot, registryClient, logger) {
  const maybePackage = packages.get(npmPackageJson.name);
  if (!maybePackage) {
    return;
  }
  const distTags = npmPackageJson["dist-tags"] ?? {};
  const version = distTags[maybePackage] || maybePackage;
  const packageJson = await registryClient.getManifest(npmPackageJson.name, version);
  if (!packageJson) {
    return;
  }
  for (const [peer, range] of Object.entries(packageJson.peerDependencies || {})) {
    if (packages.has(peer)) {
      continue;
    }
    const installedVersion = getInstalledVersion(peer, workspaceRoot);
    if (installedVersion) {
      if (semver.satisfies(installedVersion, range)) {
        continue;
      }
    } else {
      const packageJsonRange = allDependencies.get(peer);
      if (packageJsonRange) {
        const peerMetadata = await registryClient.getMetadata(peer);
        if (peerMetadata) {
          const resolvedInstalledVersion = await getSatisfyingVersion(registryClient, peerMetadata, packageJsonRange);
          if (resolvedInstalledVersion && semver.satisfies(resolvedInstalledVersion, range)) {
            continue;
          }
        }
      }
    }
    packages.set(peer, range);
  }
}
function _formatVersion(v) {
  if (v === void 0) {
    return v;
  }
  if (semver.valid(v)) {
    return v;
  }
  const coerced = semver.coerce(v);
  return coerced ? coerced.toString() : void 0;
}
function getRegistryNameAndRange(name, specifier) {
  try {
    const result = npa.resolve(name, specifier);
    if (result.type === "alias" && result.subSpec) {
      return {
        name: result.subSpec.name ?? name,
        range: result.subSpec.fetchSpec ?? specifier
      };
    }
  } catch {
  }
  return { name, range: specifier };
}
function isPkgFromRegistry(name, specifier) {
  const result = npa.resolve(name, specifier);
  return !!result.registry;
}
async function checkCatalogUpdates(normalizedPackages, packageJsonContent, registryClient, workspaceRoot, options) {
  const catalogUpdates = [];
  for (const requestedPkg of normalizedPackages) {
    const { name: pkgName } = splitPackageName(requestedPkg);
    const specifier = packageJsonContent.dependencies?.[pkgName] || packageJsonContent.devDependencies?.[pkgName] || packageJsonContent.peerDependencies?.[pkgName];
    if (specifier?.startsWith("catalog:")) {
      const current = getInstalledVersion(pkgName, workspaceRoot) ?? "unknown";
      let target = "latest";
      try {
        const metadata = await registryClient.getMetadata(pkgName);
        if (metadata) {
          const resolved = await resolvePackageVersion(registryClient, metadata, options.next ? "next" : "latest", !!options.next);
          target = resolved ?? "latest";
        }
      } catch {
      }
      catalogUpdates.push({ name: pkgName, current, target, specifier });
    }
  }
  if (catalogUpdates.length > 0) {
    const packageManagerName = options.packageManager ?? "your package manager";
    const installCmd = packageManagerName === "yarn" ? "yarn install" : "pnpm install";
    const updatesList = catalogUpdates.map((pkg) => `  - ${pkg.name} (${pkg.specifier}) -> Target version: ${pkg.target}`).join("\n");
    const migrationCommands = catalogUpdates.map((pkg) => {
      const fromVer = pkg.current === "unknown" ? "<current-version>" : pkg.current;
      return `  ng update ${pkg.name} --migrate-only --from ${fromVer}`;
    }).join("\n");
    throw new Error(`The following packages to update are configured to use \`catalog:\`:
${updatesList}

Because catalogs are shared across the monorepo, 'ng update' cannot modify them directly.
Please perform the following steps to update:
  1. Manually update the versions for these packages in your catalog configuration file (e.g., pnpm-workspace.yaml or .yarnrc.yml).
  2. Run '${installCmd}' to install the updated versions.
  3. Run the following command(s) from the workspace root to execute the migration schematics:
${migrationCommands}`);
  }
}
async function resolveUserUpdatePlan(options, packageManager, logger) {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("Could not find a package.json. Are you in a Node project?");
  }
  const rawJson = readFileSync(packageJsonPath, "utf8");
  const packageJsonContent = JSON.parse(rawJson);
  const getDependencies = (deps) => Object.entries(deps ?? {}).map(([name, range]) => [name, range]);
  const allRawDeps = [
    ...getDependencies(packageJsonContent.dependencies),
    ...getDependencies(packageJsonContent.devDependencies),
    ...getDependencies(packageJsonContent.peerDependencies)
  ];
  const npmDeps = new Map(allRawDeps.filter(([name, specifier]) => {
    try {
      return isPkgFromRegistry(name, specifier);
    } catch {
      logger.warn(`Package ${name} was not found on the registry. Skipping.`);
      return false;
    }
  }));
  const packagesOption = options.packages ?? [];
  const normalizedPackages = packagesOption.reduce((acc, curr) => {
    return acc.concat(curr.split(","));
  }, []);
  options.packages = normalizedPackages;
  if (options.migrateOnly && options.from) {
    if (options.packages.length !== 1) {
      throw new Error("--from requires that only a single package be passed.");
    }
  }
  options.from = _formatVersion(options.from);
  options.to = _formatVersion(options.to);
  const usingYarn = options.packageManager === "yarn";
  const minReleaseAge = await packageManager.getMinimumReleaseAge();
  const getRegistryName = (name) => {
    const specifier = npmDeps.get(name);
    if (specifier) {
      return getRegistryNameAndRange(name, specifier).name;
    }
    return name;
  };
  const registryClient = new RegistryClient(packageManager, logger, minReleaseAge, getRegistryName);
  await checkCatalogUpdates(normalizedPackages, packageJsonContent, registryClient, workspaceRoot, options);
  const packages = _buildPackageList(options, npmDeps, logger);
  const getOrFetchPackageMetadata = async (packageName) => {
    return registryClient.getMetadata(packageName);
  };
  if (packages.size === 0) {
    await Promise.all(Array.from(npmDeps.keys(), (depName) => getOrFetchPackageMetadata(depName)));
  } else {
    let lastPackagesSize;
    do {
      lastPackagesSize = packages.size;
      let lastGroupSize;
      do {
        lastGroupSize = packages.size;
        for (const name of Array.from(packages.keys())) {
          const metadata = await getOrFetchPackageMetadata(name);
          const spec = packages.get(name);
          if (metadata && spec) {
            const resolvedVersion = await resolvePackageVersion(registryClient, metadata, spec, !!options.next);
            if (resolvedVersion) {
              packages.set(name, resolvedVersion);
            }
            await _addPackageGroup(packages, npmDeps, metadata, registryClient, logger);
          }
        }
      } while (packages.size > lastGroupSize);
      for (const name of Array.from(packages.keys())) {
        const metadata = await getOrFetchPackageMetadata(name);
        const spec = packages.get(name);
        if (metadata && spec) {
          const resolvedVersion = await resolvePackageVersion(registryClient, metadata, spec, !!options.next);
          if (resolvedVersion) {
            packages.set(name, resolvedVersion);
          }
          await _addPeerDependencies(packages, npmDeps, metadata, workspaceRoot, registryClient, logger);
        }
      }
    } while (packages.size > lastPackagesSize);
  }
  const isListingUpdates = packages.size === 0;
  const packageInfoEntries = await Promise.all(Array.from(npmDeps.keys(), async (depName) => {
    const isUpdating = packages.has(depName);
    const localPkgJson = getInstalledPackageJson(depName, workspaceRoot);
    if (isListingUpdates || isUpdating || !localPkgJson) {
      const metadata = await getOrFetchPackageMetadata(depName);
      if (metadata) {
        const info = await _buildPackageInfo(packages, npmDeps, metadata, workspaceRoot, registryClient, logger);
        return [depName, info];
      }
    }
    return [depName, _buildLocalPackageInfo(depName, npmDeps, workspaceRoot)];
  }));
  const packageInfoMap = new Map(packageInfoEntries);
  const packagesToUpdate = /* @__PURE__ */ new Map();
  const migrationsToRun = [];
  if (packages.size > 0) {
    if (!(options.migrateOnly && options.from && options.packages)) {
      const sublog = new logging.LevelCapLogger("validation", logger.createChild(""), "warn");
      _validateUpdatePackages(packageInfoMap, !!options.force, !!options.next, sublog);
      for (const [name, info] of packageInfoMap.entries()) {
        if (!info.target || !info.installed) {
          continue;
        }
        packagesToUpdate.set(name, info.target.version);
        if (info.target.updateMetadata.migrations) {
          migrationsToRun.push({
            package: name,
            collection: info.target.updateMetadata.migrations,
            from: info.installed.version,
            to: info.target.version
          });
        }
      }
    }
  }
  return {
    packagesToUpdate,
    migrationsToRun,
    packageInfoMap,
    registryClient
  };
}
async function printUpdateUsageMessage(infoMap, registryClient, logger, next = false) {
  const packageGroups = /* @__PURE__ */ new Map();
  const mappedPackages = await Promise.all(Array.from(infoMap.entries(), async ([name, info]) => {
    const distTags = info.npmPackageJson["dist-tags"] ?? {};
    let tag = next ? distTags["next"] ? "next" : "latest" : "latest";
    let version = distTags[tag] ?? info.installed.version;
    const versions = info.npmPackageJson.versions ?? [];
    const versionDiff = semver.diff(info.installed.version, version);
    if (versionDiff !== "patch" && versionDiff !== "minor" && /^@(?:angular|nguniversal)\//.test(name)) {
      const installedMajorVersion = semver.parse(info.installed.version)?.major;
      const toInstallMajorVersion = semver.parse(version)?.major;
      if (installedMajorVersion !== void 0 && toInstallMajorVersion !== void 0 && installedMajorVersion < toInstallMajorVersion - 1) {
        const nextMajorVersion = `${installedMajorVersion + 1}.`;
        const nextMajorVersions = versions.filter((v) => v.startsWith(nextMajorVersion)).sort((a, b) => a > b ? -1 : 1);
        if (nextMajorVersions.length) {
          version = nextMajorVersions[0];
          tag = "";
        }
      }
    }
    const target = info.target?.packageJson || await registryClient.getManifest(name, version);
    return {
      name,
      info,
      version,
      tag,
      target
    };
  }));
  const packagesToUpdate = mappedPackages.filter(({ info, version, target }) => target?.["ng-update"] && semver.compare(info.installed.version, version) < 0).map(({ name, info, version, tag, target }) => {
    const ngUpdate = target?.["ng-update"];
    const packageGroup = ngUpdate?.["packageGroup"];
    if (packageGroup) {
      const packageGroupNames = Array.isArray(packageGroup) ? packageGroup : Object.keys(packageGroup);
      const packageGroupName = ngUpdate?.["packageGroupName"] || packageGroupNames.find((n) => infoMap.has(n));
      if (packageGroupName) {
        if (packageGroups.has(name)) {
          return null;
        }
        for (const groupName of packageGroupNames) {
          packageGroups.set(groupName, packageGroupName);
        }
        packageGroups.set(packageGroupName, packageGroupName);
        name = packageGroupName;
      }
    }
    let command = `ng update ${name}`;
    if (!tag) {
      command += `@${semver.parse(version)?.major || version}`;
    } else if (tag == "next") {
      command += " --next";
    }
    return [name, `${info.installed.version} -> ${version} `, command];
  }).filter((x) => x !== null).sort((a, b) => a[0].localeCompare(b[0]));
  if (packagesToUpdate.length == 0) {
    logger.info("We analyzed your package.json and everything seems to be in order. Good work!");
    return;
  }
  logger.info("We analyzed your package.json, there are some packages to update:\n");
  let namePad = Math.max(...[...infoMap.keys()].map((x) => x.length)) + 2;
  if (!Number.isFinite(namePad)) {
    namePad = 30;
  }
  const pads = [namePad, 25, 0];
  logger.info("  " + ["Name", "Version", "Command to update"].map((x, i) => x.padEnd(pads[i])).join(""));
  const totalWidth = pads.reduce((sum, width) => sum + width, 20);
  logger.info(` ${"-".repeat(totalWidth)}`);
  packagesToUpdate.forEach((fields) => {
    if (!fields) {
      return;
    }
    logger.info("  " + fields.map((x, i) => x.padEnd(pads[i])).join(""));
  });
  logger.info(`
There might be additional packages which don't provide 'ng update' capabilities that are outdated.
You can update the additional packages by running the update command of your package manager.`);
}
async function applyUpdatePlan(workspaceRoot, plan, logger) {
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonContent);
  const updateDependency = (deps, name, newVersion) => {
    const oldVersion = deps[name];
    const aliasPrefix = "npm:";
    if (oldVersion.startsWith(aliasPrefix)) {
      const specifier = oldVersion.slice(aliasPrefix.length);
      const lastAtIndex = specifier.lastIndexOf("@");
      if (lastAtIndex > 0) {
        const registryName = specifier.slice(0, lastAtIndex);
        const versionRange = specifier.slice(lastAtIndex + 1);
        const execResult = /^[\^~]/.exec(versionRange);
        deps[name] = `${aliasPrefix}${registryName}@${execResult ? execResult[0] : ""}${newVersion}`;
      } else {
        deps[name] = oldVersion;
      }
    } else {
      const execResult = /^[\^~]/.exec(oldVersion);
      deps[name] = `${execResult ? execResult[0] : ""}${newVersion}`;
    }
  };
  for (const [name, targetVersion] of plan.packagesToUpdate.entries()) {
    logger.info(`Updating package.json with dependency ${name} to version ${targetVersion}...`);
    if (packageJson.dependencies && packageJson.dependencies[name]) {
      updateDependency(packageJson.dependencies, name, targetVersion);
      if (packageJson.devDependencies) {
        delete packageJson.devDependencies[name];
      }
      if (packageJson.peerDependencies) {
        delete packageJson.peerDependencies[name];
      }
    } else if (packageJson.devDependencies && packageJson.devDependencies[name]) {
      updateDependency(packageJson.devDependencies, name, targetVersion);
      if (packageJson.peerDependencies) {
        delete packageJson.peerDependencies[name];
      }
    } else if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
      updateDependency(packageJson.peerDependencies, name, targetVersion);
    } else {
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
      packageJson.dependencies[name] = `^${targetVersion}`;
    }
  }
  const eofMatches = packageJsonContent.match(/\r?\n$/);
  const eof = eofMatches?.[0] ?? "";
  const newContent = JSON.stringify(packageJson, null, 2) + eof;
  await fs.writeFile(packageJsonPath, newContent, "utf8");
}

// packages/angular/cli/src/commands/update/utilities/cli-version.js
import { spawnSync } from "node:child_process";
import { existsSync as existsSync2, promises as fs2 } from "node:fs";
import { join as join2, resolve } from "node:path";
import * as semver2 from "semver";

// packages/angular/cli/src/commands/update/utilities/constants.js
var ANGULAR_PACKAGES_REGEXP = /^@(?:angular|nguniversal)\//;

// packages/angular/cli/src/commands/update/utilities/cli-version.js
function coerceVersionNumber(version) {
  if (!version) {
    return void 0;
  }
  if (!/^\d{1,30}\.\d{1,30}\.\d{1,30}/.test(version)) {
    const match = version.match(/^\d{1,30}(\.\d{1,30})*/);
    if (!match) {
      return void 0;
    }
    if (!match[1]) {
      version = version.substring(0, match[0].length) + ".0.0" + version.substring(match[0].length);
    } else if (!match[2]) {
      version = version.substring(0, match[0].length) + ".0" + version.substring(match[0].length);
    } else {
      return void 0;
    }
  }
  return semver2.valid(version) ?? void 0;
}
async function checkCLIVersion(packagesToUpdate, logger, packageManager, next = false) {
  const runnerVersion = getCLIUpdateRunnerVersion(packagesToUpdate, next);
  const manifest = await packageManager.getManifest(`@angular/cli@${runnerVersion}`);
  if (!manifest) {
    logger.warn(`Could not find @angular/cli version '${runnerVersion}'.`);
    return null;
  }
  const version = manifest.version;
  return VERSION.full === version ? null : String(runnerVersion);
}
function getCLIUpdateRunnerVersion(packagesToUpdate, next) {
  if (next) {
    return "next";
  }
  const updatingAngularPackage = packagesToUpdate?.find((r) => ANGULAR_PACKAGES_REGEXP.test(r));
  if (updatingAngularPackage) {
    const tempVersion = coerceVersionNumber(updatingAngularPackage.split("@")[2]);
    return semver2.parse(tempVersion)?.major ?? "latest";
  }
  return VERSION.major;
}
async function runTempBinary(packageName, packageManager, args = []) {
  const { workingDirectory, cleanup } = await packageManager.acquireTempPackage(packageName);
  try {
    const packageNameNoVersion = packageName.substring(0, packageName.lastIndexOf("@"));
    const pkgLocation = join2(workingDirectory, "node_modules", packageNameNoVersion);
    const packageJsonPath = join2(pkgLocation, "package.json");
    let binPath;
    if (existsSync2(packageJsonPath)) {
      const content = await fs2.readFile(packageJsonPath, "utf-8");
      if (content) {
        const { bin = {} } = JSON.parse(content);
        const binKeys = Object.keys(bin);
        if (binKeys.length) {
          binPath = resolve(pkgLocation, bin[binKeys[0]]);
        }
      }
    }
    if (!binPath) {
      throw new Error(`Cannot locate bin for temporary package: ${packageNameNoVersion}.`);
    }
    const { status, error } = spawnSync(process.execPath, [binPath, ...args], {
      stdio: "inherit",
      env: {
        ...process.env,
        NG_DISABLE_VERSION_CHECK: "true",
        NG_CLI_ANALYTICS: "false"
      }
    });
    if (status === null && error) {
      throw error;
    }
    return status ?? 0;
  } finally {
    await cleanup();
  }
}
async function shouldForcePackageManager(packageManager, logger, verbose) {
  if (packageManager.name === "npm") {
    const version = await packageManager.getVersion();
    if (semver2.gte(version, "7.0.0")) {
      if (verbose) {
        logger.info("NPM 7+ detected -- enabling force option for package installation");
      }
      return true;
    }
  }
  return false;
}

// packages/angular/cli/src/commands/update/utilities/git.js
import { execFileSync } from "node:child_process";
import * as path2 from "node:path";
function execGit(args, input) {
  return execFileSync("git", args, { encoding: "utf8", stdio: "pipe", input });
}
function checkCleanGit(root) {
  try {
    const topLevel = execGit(["rev-parse", "--show-toplevel"]);
    const result = execGit(["status", "--porcelain", "-z"]);
    if (result.length === 0) {
      return true;
    }
    const entries = result.split("\0");
    for (let i = 0; i < entries.length; i++) {
      const line = entries[i];
      if (!line) {
        continue;
      }
      let filePath = line.slice(3);
      const status = line.slice(0, 2);
      if (status[0] === "R") {
        if (isPathInsideRoot(filePath, root, topLevel.trim())) {
          return false;
        }
        i++;
        filePath = entries[i];
      }
      if (isPathInsideRoot(filePath, root, topLevel.trim())) {
        return false;
      }
    }
  } catch {
  }
  return true;
}
function isPathInsideRoot(filePath, root, topLevel) {
  const relativeEntry = path2.relative(path2.resolve(root), path2.resolve(topLevel, filePath));
  return !relativeEntry.startsWith("..") && !path2.isAbsolute(relativeEntry);
}
function hasChangesToCommit() {
  try {
    return execGit(["ls-files", "-m", "-d", "-o", "--exclude-standard"]).trim() !== "";
  } catch {
    return false;
  }
}
function createCommit(message) {
  execGit(["add", "-A"]);
  execGit(["commit", "--no-verify", "-F", "-"], message);
}
function findCurrentGitSha() {
  try {
    return execGit(["rev-parse", "HEAD"]).trim();
  } catch {
    return null;
  }
}
function getShortHash(commitHash) {
  return commitHash.slice(0, 9);
}

// packages/angular/cli/src/commands/update/utilities/migration.js
import { UnsuccessfulWorkflowExecution } from "@angular-devkit/schematics";
import { figures } from "listr2";
import * as semver3 from "semver";
async function executeSchematic(workflow, logger, collection, schematic, options = {}) {
  const workflowSubscription = subscribeToWorkflow(workflow, logger);
  try {
    await workflow.execute({
      collection,
      schematic,
      options,
      logger
    }).toPromise();
    return { success: !workflowSubscription.error, files: workflowSubscription.files };
  } catch (e) {
    if (e instanceof UnsuccessfulWorkflowExecution) {
      logger.error(`${figures.cross} Migration failed. See above for further details.
`);
    } else {
      assertIsError(e);
      const logPath = writeErrorToLogFile(e);
      logger.fatal(`${figures.cross} Migration failed: ${e.message}
  See "${logPath}" for further details.
`);
    }
    return { success: false, files: workflowSubscription.files };
  } finally {
    workflowSubscription.unsubscribe();
  }
}
async function executeMigration(workflow, logger, packageName, collectionPath, migrationName, commit = false) {
  const collection = workflow.engine.createCollection(collectionPath);
  const name = collection.listSchematicNames().find((name2) => name2 === migrationName);
  if (!name) {
    logger.error(`Cannot find migration '${migrationName}' in '${packageName}'.`);
    return 1;
  }
  logger.info(colors.cyan(`** Executing '${migrationName}' of package '${packageName}' **
`));
  const schematic = workflow.engine.createSchematic(name, collection);
  return executePackageMigrations(workflow, logger, [schematic.description], packageName, commit);
}
async function executeMigrations(workflow, logger, packageName, collectionPath, from, to, commit = false) {
  const collection = workflow.engine.createCollection(collectionPath);
  const migrationRange = new semver3.Range(">" + (semver3.prerelease(from) ? from.split("-")[0] + "-0" : from) + " <=" + to.split("-")[0]);
  const requiredMigrations = [];
  const optionalMigrations = [];
  for (const name of collection.listSchematicNames()) {
    const schematic = workflow.engine.createSchematic(name, collection);
    const description = schematic.description;
    description.version = coerceVersionNumber(description.version);
    if (!description.version) {
      continue;
    }
    if (semver3.satisfies(description.version, migrationRange, { includePrerelease: true })) {
      (description.optional ? optionalMigrations : requiredMigrations).push(description);
    }
  }
  if (requiredMigrations.length === 0 && optionalMigrations.length === 0) {
    return 0;
  }
  if (requiredMigrations.length) {
    logger.info(colors.cyan(`** Executing migrations of package '${packageName}' **
`));
    requiredMigrations.sort(compareMigrations);
    const result = await executePackageMigrations(workflow, logger, requiredMigrations, packageName, commit);
    if (result === 1) {
      return 1;
    }
  }
  if (optionalMigrations.length) {
    logger.info(colors.magenta(`** Optional migrations of package '${packageName}' **
`));
    optionalMigrations.sort(compareMigrations);
    const migrationsToRun = await getOptionalMigrationsToRun(logger, optionalMigrations, packageName);
    if (migrationsToRun?.length) {
      return executePackageMigrations(workflow, logger, migrationsToRun, packageName, commit);
    }
  }
  return 0;
}
async function executePackageMigrations(workflow, logger, migrations, packageName, commit = false) {
  for (const migration of migrations) {
    const { title, description } = getMigrationTitleAndDescription(migration);
    logger.info(colors.cyan(figures.pointer) + " " + colors.bold(title));
    if (description) {
      logger.info("  " + description);
    }
    const { success, files } = await executeSchematic(workflow, logger, migration.collection.name, migration.name);
    if (!success) {
      return 1;
    }
    let modifiedFilesText;
    switch (files.size) {
      case 0:
        modifiedFilesText = "No changes made";
        break;
      case 1:
        modifiedFilesText = "1 file modified";
        break;
      default:
        modifiedFilesText = `${files.size} files modified`;
        break;
    }
    if (files.size) {
      try {
        await formatFiles(process.cwd(), files);
      } catch (error) {
        assertIsError(error);
        logger.warn(`WARNING: Formatting of files failed with the following error: ${error.message}`);
      }
    }
    logger.info(`  Migration completed (${modifiedFilesText}).`);
    if (commit) {
      const commitPrefix = `${packageName} migration - ${migration.name}`;
      const commitMessage = migration.description ? `${commitPrefix}

${migration.description}` : commitPrefix;
      const committed = commitChanges(logger, commitMessage);
      if (!committed) {
        return 1;
      }
    }
    logger.info("");
  }
  return 0;
}
function commitChanges(logger, message) {
  let commitNeeded;
  try {
    commitNeeded = hasChangesToCommit();
  } catch (err) {
    logger.error(`  Failed to read Git tree:
${err.stderr}`);
    return false;
  }
  if (!commitNeeded) {
    logger.info("  No changes to commit after migration.");
    return true;
  }
  try {
    createCommit(message);
  } catch (err) {
    logger.error(`Failed to commit update (${message}):
${err.stderr}`);
    return false;
  }
  const hash = findCurrentGitSha();
  const shortMessage = message.split("\n")[0];
  if (hash) {
    logger.info(`  Committed migration step (${getShortHash(hash)}): ${shortMessage}.`);
  } else {
    logger.info(`  Committed migration step: ${shortMessage}.`);
    logger.warn("  Failed to look up hash of most recent commit, continuing anyways.");
  }
  return true;
}
async function getOptionalMigrationsToRun(logger, optionalMigrations, packageName) {
  const numberOfMigrations = optionalMigrations.length;
  logger.info(`This package has ${numberOfMigrations} optional migration${numberOfMigrations > 1 ? "s" : ""} that can be executed.`);
  if (!isTTY()) {
    for (const migration of optionalMigrations) {
      const { title } = getMigrationTitleAndDescription(migration);
      logger.info(colors.cyan(figures.pointer) + " " + colors.bold(title));
      logger.info(colors.gray(`  ng update ${packageName} --name ${migration.name}`));
      logger.info("");
    }
    return void 0;
  }
  logger.info("Optional migrations may be skipped and executed after the update process, if preferred.");
  logger.info("");
  const answer = await askChoices(`Select the migrations that you'd like to run`, optionalMigrations.map((migration) => {
    const { title, documentation } = getMigrationTitleAndDescription(migration);
    return {
      name: `[${colors.white(migration.name)}] ${title}${documentation ? ` (${documentation})` : ""}`,
      value: migration.name,
      checked: migration.recommended
    };
  }), null);
  logger.info("");
  return optionalMigrations.filter(({ name }) => answer?.includes(name));
}
function getMigrationTitleAndDescription(migration) {
  const [title, ...description] = migration.description.split(". ");
  return {
    title: title.endsWith(".") ? title : title + ".",
    description: description.join(".\n  "),
    documentation: migration.documentation ? new URL(migration.documentation, "https://angular.dev").href : void 0
  };
}
function compareMigrations(a, b) {
  return semver3.compare(a.version, b.version);
}

// packages/angular/cli/src/commands/update/cli.js
var CommandError = class extends Error {
};
var UpdateCommandModule = class extends CommandModule {
  scope = CommandScope.In;
  shouldReportAnalytics = false;
  resolvePaths = [import.meta.dirname, this.context.root];
  command = "update [packages..]";
  describe = "Updates your workspace and its dependencies. See https://update.angular.dev/.";
  longDescription = long_description_default;
  builder(localYargs) {
    return localYargs.positional("packages", {
      description: "The names of package(s) to update.",
      type: "string",
      array: true
    }).option("force", {
      description: "Ignore peer dependency version mismatches.",
      type: "boolean",
      default: false
    }).option("next", {
      description: "Use the prerelease version, including beta and RCs.",
      type: "boolean",
      default: false
    }).option("migrate-only", {
      description: "Only perform a migration, do not update the installed version.",
      type: "boolean"
    }).option("name", {
      description: "The name of the migration to run. Only available when a single package is updated.",
      type: "string",
      conflicts: ["to", "from"]
    }).option("from", {
      description: `Version from which to migrate from. Only available when a single package is updated, and only with 'migrate-only'.`,
      type: "string",
      implies: ["migrate-only"],
      conflicts: ["name"]
    }).option("to", {
      describe: `Version up to which to apply migrations. Only available when a single package is updated, and only with 'migrate-only' option. Requires 'from' to be specified. Default to the installed version detected.`,
      type: "string",
      implies: ["from", "migrate-only"],
      conflicts: ["name"]
    }).option("allow-dirty", {
      describe: "Whether to allow updating when the repository contains modified or untracked files.",
      type: "boolean",
      default: false
    }).option("verbose", {
      describe: "Display additional details about internal operations during execution.",
      type: "boolean",
      default: false
    }).option("create-commits", {
      describe: "Create source control commits for updates and migrations.",
      type: "boolean",
      alias: ["C"],
      default: false
    }).middleware((argv) => {
      if (argv.name) {
        argv["migrate-only"] = true;
      }
      return argv;
    }).check(({ packages, "allow-dirty": allowDirty, "migrate-only": migrateOnly }) => {
      const { logger } = this.context;
      if (packages?.length && !checkCleanGit(this.context.root)) {
        if (allowDirty) {
          logger.warn("Repository is not clean. Update changes will be mixed with pre-existing changes.");
        } else {
          throw new CommandModuleError("Repository is not clean. Please commit or stash any changes before updating.");
        }
      }
      if (migrateOnly) {
        if (packages?.length !== 1) {
          throw new CommandModuleError(`A single package must be specified when using the 'migrate-only' option.`);
        }
      }
      return true;
    }).strict();
  }
  async run(options) {
    const { logger, packageManager } = this.context;
    if (!disableVersionCheck && options.packages?.length) {
      const cliVersionToInstall = await checkCLIVersion(options.packages, logger, packageManager, options.next);
      if (cliVersionToInstall) {
        logger.warn(`The installed Angular CLI version is outdated.
Installing a temporary Angular CLI versioned ${cliVersionToInstall} to perform the update.`);
        return runTempBinary(`@angular/cli@${cliVersionToInstall}`, packageManager, process.argv.slice(2));
      }
    }
    const packages = [];
    for (const request of options.packages ?? []) {
      try {
        const packageIdentifier = npa2(request);
        if (!packageIdentifier.registry) {
          logger.error(`Package '${request}' is not a registry package identifer.`);
          return 1;
        }
        if (packages.some((v) => v.name === packageIdentifier.name)) {
          logger.error(`Duplicate package '${packageIdentifier.name}' specified.`);
          return 1;
        }
        if (options.migrateOnly && packageIdentifier.rawSpec !== "*") {
          logger.warn('Package specifier has no effect when using "migrate-only" option.');
        }
        if (packageIdentifier.rawSpec === "*") {
          packageIdentifier.fetchSpec = options.next ? "next" : "latest";
          packageIdentifier.type = "tag";
        }
        packages.push(packageIdentifier);
      } catch (e) {
        assertIsError(e);
        logger.error(e.message);
        return 1;
      }
    }
    logger.info(`Using package manager: ${colors.gray(packageManager.name)}`);
    logger.info("Collecting installed dependencies...");
    const rootDependencies = await packageManager.getProjectDependencies();
    logger.info(`Found ${rootDependencies.size} dependencies.`);
    const workflow = new NodeWorkflow(this.context.root, {
      packageManager: packageManager.name,
      packageManagerForce: await shouldForcePackageManager(packageManager, logger, options.verbose),
      // import.meta.dirname -> favor @schematics/update from this package
      // Otherwise, use packages from the active workspace (migrations)
      resolvePaths: this.resolvePaths,
      schemaValidation: true,
      engineHostCreator: (options2) => new SchematicEngineHost(options2.resolvePaths)
    });
    if (packages.length === 0) {
      try {
        const plan = await resolveUserUpdatePlan({
          force: options.force,
          next: options.next,
          verbose: options.verbose,
          packageManager: packageManager.name,
          packages: [],
          workspaceRoot: this.context.root
        }, packageManager, logger);
        await printUpdateUsageMessage(plan.packageInfoMap, plan.registryClient, logger, options.next);
        return 0;
      } catch (error) {
        assertIsError(error);
        logger.error(error.message);
        return 1;
      }
    }
    return options.migrateOnly ? this.migrateOnly(workflow, packages[0].name, rootDependencies, options, packageManager) : this.updatePackagesAndMigrate(workflow, rootDependencies, options, packages, packageManager);
  }
  async migrateOnly(workflow, packageName, rootDependencies, options, packageManager) {
    const { logger } = this.context;
    const packageDependency = rootDependencies.get(packageName);
    let packagePath = packageDependency?.path;
    let packageNode;
    if (!packageDependency) {
      const installed = await packageManager.getInstalledPackage(packageName);
      if (installed) {
        packagePath = installed.path;
      }
    }
    if (packagePath) {
      packageNode = await readPackageManifest(path3.join(packagePath, "package.json"));
    }
    if (!packageNode) {
      const jsonPath = findPackageJson(this.context.root, packageName);
      if (jsonPath) {
        packageNode = await readPackageManifest(jsonPath);
        if (!packagePath) {
          packagePath = path3.dirname(jsonPath);
        }
      }
    }
    if (!packageNode || !packagePath) {
      logger.error("Package is not installed.");
      return 1;
    }
    const updateMetadata = packageNode["ng-update"];
    let migrations = updateMetadata?.migrations;
    if (migrations === void 0) {
      logger.error("Package does not provide migrations.");
      return 1;
    } else if (typeof migrations !== "string") {
      logger.error("Package contains a malformed migrations field.");
      return 1;
    } else if (path3.posix.isAbsolute(migrations) || path3.win32.isAbsolute(migrations)) {
      logger.error("Package contains an invalid migrations field. Absolute paths are not permitted.");
      return 1;
    }
    migrations = migrations.replace(/\\/g, "/");
    if (migrations.startsWith("../")) {
      logger.error("Package contains an invalid migrations field. Paths outside the package root are not permitted.");
      return 1;
    }
    const localMigrations = path3.join(packagePath, migrations);
    if (existsSync3(localMigrations)) {
      migrations = localMigrations;
    } else {
      try {
        const packageRequire = createRequire2(packagePath + "/");
        migrations = packageRequire.resolve(migrations, { paths: this.resolvePaths });
      } catch (e) {
        assertIsError(e);
        if (e.code === "MODULE_NOT_FOUND") {
          logger.error("Migrations for package were not found.");
        } else {
          logger.error(`Unable to resolve migrations for package.  [${e.message}]`);
        }
        return 1;
      }
    }
    if (options.name) {
      return executeMigration(workflow, logger, packageName, migrations, options.name, options.createCommits);
    }
    const from = coerceVersionNumber(options.from);
    if (!from) {
      logger.error(`"from" value [${options.from}] is not a valid version.`);
      return 1;
    }
    return executeMigrations(workflow, logger, packageName, migrations, from, options.to || packageNode.version, options.createCommits);
  }
  // eslint-disable-next-line max-lines-per-function
  async updatePackagesAndMigrate(workflow, rootDependencies, options, packages, packageManager) {
    const { logger } = this.context;
    const logVerbose = (message) => {
      if (options.verbose) {
        logger.info(message);
      }
    };
    const requests = [];
    for (const pkg of packages) {
      const node = rootDependencies.get(pkg.name);
      if (!node) {
        logger.error(`Package '${pkg.name}' is not a dependency.`);
        return 1;
      }
      if (pkg.type === "version" && node.version === pkg.fetchSpec) {
        logger.info(`Package '${pkg.name}' is already at '${pkg.fetchSpec}'.`);
        continue;
      }
      requests.push({ identifier: pkg, node });
    }
    if (requests.length === 0) {
      return 0;
    }
    logger.info("Fetching dependency metadata from registry...");
    const packagesToUpdate = [];
    for (const { identifier: requestIdentifier, node } of requests) {
      const packageName = requestIdentifier.name;
      let manifest;
      try {
        manifest = await packageManager.getManifest(requestIdentifier);
      } catch (e) {
        assertIsError(e);
        logger.error(`Error fetching manifest for '${packageName}': ` + e.message);
        return 1;
      }
      if (!manifest) {
        logger.error(`Package specified by '${requestIdentifier.raw}' does not exist within the registry.`);
        return 1;
      }
      if (manifest.version === node.version) {
        logger.info(`Package '${packageName}' is already up to date.`);
        continue;
      }
      if (ANGULAR_PACKAGES_REGEXP.test(node.name)) {
        const { name, version } = node;
        const toBeInstalledMajorVersion = +manifest.version.split(".")[0];
        const currentMajorVersion = +version.split(".")[0];
        if (toBeInstalledMajorVersion - currentMajorVersion > 1) {
          if (currentMajorVersion < 6) {
            logger.error(`Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.
For more information about the update process, see https://update.angular.dev/.`);
          } else {
            const nextMajorVersionFromCurrent = currentMajorVersion + 1;
            logger.error(`Updating multiple major versions of '${name}' at once is not supported. Please migrate each major version individually.
Run 'ng update ${name}@${nextMajorVersionFromCurrent}' in your workspace directory to update to latest '${nextMajorVersionFromCurrent}.x' version of '${name}'.

For more information about the update process, see https://update.angular.dev/?v=${currentMajorVersion}.0-${nextMajorVersionFromCurrent}.0`);
          }
          return 1;
        }
      }
      packagesToUpdate.push(requestIdentifier.toString());
    }
    if (packagesToUpdate.length === 0) {
      return 0;
    }
    let plan;
    try {
      plan = await resolveUserUpdatePlan({
        packages: packagesToUpdate,
        force: options.force,
        next: options.next,
        packageManager: packageManager.name,
        verbose: options.verbose,
        workspaceRoot: this.context.root
      }, packageManager, logger);
    } catch (error) {
      assertIsError(error);
      logger.error(error.message);
      return 1;
    }
    const packageJsonPath = path3.join(this.context.root, "package.json");
    let originalPackageJsonContent;
    try {
      originalPackageJsonContent = await fs3.readFile(packageJsonPath, "utf8");
    } catch {
    }
    try {
      await applyUpdatePlan(this.context.root, plan, logger);
    } catch (error) {
      assertIsError(error);
      logger.error(`Error updating package.json: ${error.message}`);
      return 1;
    }
    const { root: commandRoot } = this.context;
    const ignorePeerDependencies = await shouldForcePackageManager(packageManager, logger, options.verbose);
    const tasks = new Listr([
      {
        title: "Cleaning node modules directory",
        skip() {
          return packageManager.name !== "npm" ? "Cleaning not required for this package manager." : false;
        },
        async task(_, task) {
          try {
            await fs3.rm(path3.join(commandRoot, "node_modules"), {
              force: true,
              recursive: true,
              maxRetries: 3
            });
          } catch (e) {
            assertIsError(e);
            if (e.code === "ENOENT") {
              task.skip("Cleaning not required. Node modules directory not found.");
            }
          }
        }
      },
      {
        title: "Installing packages",
        async task() {
          try {
            await packageManager.install({
              ignorePeerDependencies
            });
          } catch (e) {
            throw new CommandError("Unable to install packages");
          }
        }
      }
    ]);
    try {
      await tasks.run();
      if ("_pathCache" in Module) {
        Module._pathCache = /* @__PURE__ */ Object.create(null);
      }
    } catch (e) {
      if (originalPackageJsonContent !== void 0) {
        try {
          await fs3.writeFile(packageJsonPath, originalPackageJsonContent, "utf8");
          logger.info("Restored package.json to its original state.");
        } catch (restoreError) {
          assertIsError(restoreError);
          logger.error(`Failed to restore package.json: ${restoreError.message}`);
        }
      }
      if (e instanceof CommandError) {
        return 1;
      }
      throw e;
    }
    if (options.createCommits) {
      if (!commitChanges(logger, `Angular CLI update for packages - ${packagesToUpdate.join(", ")}`)) {
        return 1;
      }
    }
    const migrations = await resolveFallbackMigrations(this.context.root, plan);
    if (migrations) {
      for (const migration of migrations) {
        const packageJsonPath2 = findPackageJson(this.context.root, migration.package);
        if (!packageJsonPath2) {
          logger.error(`Migrations for package (${migration.package}) were not found. The package could not be found in the workspace.`);
          return 1;
        }
        const packagePath = path3.dirname(packageJsonPath2);
        let migrations2;
        const localMigrations = path3.join(packagePath, migration.collection);
        if (existsSync3(localMigrations)) {
          migrations2 = localMigrations;
        } else {
          try {
            const packageRequire = createRequire2(packagePath + "/");
            migrations2 = packageRequire.resolve(migration.collection);
          } catch (e) {
            assertIsError(e);
            if (e.code === "MODULE_NOT_FOUND") {
              logger.error(`Migrations for package (${migration.package}) were not found.`);
            } else {
              logger.error(`Unable to resolve migrations for package (${migration.package}).  [${e.message}]`);
            }
            return 1;
          }
        }
        const result = await executeMigrations(workflow, logger, migration.package, migrations2, migration.from, migration.to, options.createCommits);
        if (result !== 0) {
          return result;
        }
      }
    }
    return 0;
  }
};
async function readPackageManifest(manifestPath) {
  try {
    const content = await fs3.readFile(manifestPath, "utf8");
    return JSON.parse(content);
  } catch {
    return void 0;
  }
}
async function resolveFallbackMigrations(workspaceRoot, plan) {
  const migrations = [...plan.migrationsToRun];
  const existingMigrationPackages = new Set(migrations.map((m) => m.package));
  for (const [packageName, targetVersion] of plan.packagesToUpdate) {
    if (existingMigrationPackages.has(packageName)) {
      continue;
    }
    const packageJsonPath = findPackageJson(workspaceRoot, packageName);
    if (packageJsonPath) {
      try {
        const packageJson = JSON.parse(await fs3.readFile(packageJsonPath, "utf8"));
        const ngUpdate = packageJson?.["ng-update"];
        if (ngUpdate && typeof ngUpdate === "object" && typeof ngUpdate.migrations === "string") {
          const installedVersion = plan.packageInfoMap.get(packageName)?.installed.version;
          if (installedVersion) {
            migrations.push({
              package: packageName,
              collection: ngUpdate.migrations,
              from: installedVersion,
              to: targetVersion
            });
          }
        }
      } catch {
      }
    }
  }
  return migrations;
}
export {
  UpdateCommandModule as default,
  resolveFallbackMigrations
};
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
