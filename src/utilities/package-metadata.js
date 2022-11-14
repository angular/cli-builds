"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNpmPackageJson = exports.fetchPackageManifest = exports.fetchPackageMetadata = void 0;
const lockfile = __importStar(require("@yarnpkg/lockfile"));
const fs_1 = require("fs");
const ini = __importStar(require("ini"));
const os_1 = require("os");
const path = __importStar(require("path"));
let npmrc;
const npmPackageJsonCache = new Map();
function ensureNpmrc(logger, usingYarn, verbose) {
    if (!npmrc) {
        try {
            npmrc = readOptions(logger, false, verbose);
        }
        catch (_a) { }
        if (usingYarn) {
            try {
                npmrc = { ...npmrc, ...readOptions(logger, true, verbose) };
            }
            catch (_b) { }
        }
    }
}
function readOptions(logger, yarn = false, showPotentials = false) {
    const cwd = process.cwd();
    const baseFilename = yarn ? 'yarnrc' : 'npmrc';
    const dotFilename = '.' + baseFilename;
    let globalPrefix;
    if (process.env.PREFIX) {
        globalPrefix = process.env.PREFIX;
    }
    else {
        globalPrefix = path.dirname(process.execPath);
        if (process.platform !== 'win32') {
            globalPrefix = path.dirname(globalPrefix);
        }
    }
    const defaultConfigLocations = [
        (!yarn && process.env.NPM_CONFIG_GLOBALCONFIG) || path.join(globalPrefix, 'etc', baseFilename),
        (!yarn && process.env.NPM_CONFIG_USERCONFIG) || path.join((0, os_1.homedir)(), dotFilename),
    ];
    const projectConfigLocations = [path.join(cwd, dotFilename)];
    if (yarn) {
        const root = path.parse(cwd).root;
        for (let curDir = path.dirname(cwd); curDir && curDir !== root; curDir = path.dirname(curDir)) {
            projectConfigLocations.unshift(path.join(curDir, dotFilename));
        }
    }
    if (showPotentials) {
        logger.info(`Locating potential ${baseFilename} files:`);
    }
    let rcOptions = {};
    for (const location of [...defaultConfigLocations, ...projectConfigLocations]) {
        if ((0, fs_1.existsSync)(location)) {
            if (showPotentials) {
                logger.info(`Trying '${location}'...found.`);
            }
            const data = (0, fs_1.readFileSync)(location, 'utf8');
            // Normalize RC options that are needed by 'npm-registry-fetch'.
            // See: https://github.com/npm/npm-registry-fetch/blob/ebddbe78a5f67118c1f7af2e02c8a22bcaf9e850/index.js#L99-L126
            const rcConfig = yarn ? lockfile.parse(data) : ini.parse(data);
            rcOptions = normalizeOptions(rcConfig, location, rcOptions);
        }
    }
    const envVariablesOptions = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (!value) {
            continue;
        }
        let normalizedName = key.toLowerCase();
        if (normalizedName.startsWith('npm_config_')) {
            normalizedName = normalizedName.substring(11);
        }
        else if (yarn && normalizedName.startsWith('yarn_')) {
            normalizedName = normalizedName.substring(5);
        }
        else {
            continue;
        }
        normalizedName = normalizedName.replace(/(?!^)_/g, '-'); // don't replace _ at the start of the key.s
        envVariablesOptions[normalizedName] = value;
    }
    return normalizeOptions(envVariablesOptions, undefined, rcOptions);
}
function normalizeOptions(rawOptions, location = process.cwd(), existingNormalizedOptions = {}) {
    var _a;
    const options = { ...existingNormalizedOptions };
    for (const [key, value] of Object.entries(rawOptions)) {
        let substitutedValue = value;
        // Substitute any environment variable references.
        if (typeof value === 'string') {
            substitutedValue = value.replace(/\$\{([^}]+)\}/, (_, name) => process.env[name] || '');
        }
        switch (key) {
            // Unless auth options are scope with the registry url it appears that npm-registry-fetch ignores them,
            // even though they are documented.
            // https://github.com/npm/npm-registry-fetch/blob/8954f61d8d703e5eb7f3d93c9b40488f8b1b62ac/README.md
            // https://github.com/npm/npm-registry-fetch/blob/8954f61d8d703e5eb7f3d93c9b40488f8b1b62ac/auth.js#L45-L91
            case '_authToken':
            case 'token':
            case 'username':
            case 'password':
            case '_auth':
            case 'auth':
                (_a = options['forceAuth']) !== null && _a !== void 0 ? _a : (options['forceAuth'] = {});
                options['forceAuth'][key] = substitutedValue;
                break;
            case 'noproxy':
            case 'no-proxy':
                options['noProxy'] = substitutedValue;
                break;
            case 'maxsockets':
                options['maxSockets'] = substitutedValue;
                break;
            case 'https-proxy':
            case 'proxy':
                options['proxy'] = substitutedValue;
                break;
            case 'strict-ssl':
                options['strictSSL'] = substitutedValue;
                break;
            case 'local-address':
                options['localAddress'] = substitutedValue;
                break;
            case 'cafile':
                if (typeof substitutedValue === 'string') {
                    const cafile = path.resolve(path.dirname(location), substitutedValue);
                    try {
                        options['ca'] = (0, fs_1.readFileSync)(cafile, 'utf8').replace(/\r?\n/g, '\n');
                    }
                    catch (_b) { }
                }
                break;
            default:
                options[key] = substitutedValue;
                break;
        }
    }
    return options;
}
async function fetchPackageMetadata(name, logger, options) {
    const { usingYarn, verbose, registry } = {
        registry: undefined,
        usingYarn: false,
        verbose: false,
        ...options,
    };
    ensureNpmrc(logger, usingYarn, verbose);
    const { packument } = await Promise.resolve().then(() => __importStar(require('pacote')));
    const response = await packument(name, {
        fullMetadata: true,
        ...npmrc,
        ...(registry ? { registry } : {}),
    });
    // Normalize the response
    const metadata = {
        ...response,
        tags: {},
    };
    if (response['dist-tags']) {
        for (const [tag, version] of Object.entries(response['dist-tags'])) {
            const manifest = metadata.versions[version];
            if (manifest) {
                metadata.tags[tag] = manifest;
            }
            else if (verbose) {
                logger.warn(`Package ${metadata.name} has invalid version metadata for '${tag}'.`);
            }
        }
    }
    return metadata;
}
exports.fetchPackageMetadata = fetchPackageMetadata;
async function fetchPackageManifest(name, logger, options = {}) {
    const { usingYarn = false, verbose = false, registry } = options;
    ensureNpmrc(logger, usingYarn, verbose);
    const { manifest } = await Promise.resolve().then(() => __importStar(require('pacote')));
    const response = await manifest(name, {
        fullMetadata: true,
        ...npmrc,
        ...(registry ? { registry } : {}),
    });
    return response;
}
exports.fetchPackageManifest = fetchPackageManifest;
async function getNpmPackageJson(packageName, logger, options = {}) {
    const cachedResponse = npmPackageJsonCache.get(packageName);
    if (cachedResponse) {
        return cachedResponse;
    }
    const { usingYarn = false, verbose = false, registry } = options;
    ensureNpmrc(logger, usingYarn, verbose);
    const { packument } = await Promise.resolve().then(() => __importStar(require('pacote')));
    const response = packument(packageName, {
        fullMetadata: true,
        ...npmrc,
        ...(registry ? { registry } : {}),
    });
    npmPackageJsonCache.set(packageName, response);
    return response;
}
exports.getNpmPackageJson = getNpmPackageJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tZXRhZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdILDREQUE4QztBQUM5QywyQkFBOEM7QUFDOUMseUNBQTJCO0FBQzNCLDJCQUE2QjtBQUU3QiwyQ0FBNkI7QUEyQzdCLElBQUksS0FBNEIsQ0FBQztBQUNqQyxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFzRCxDQUFDO0FBRTFGLFNBQVMsV0FBVyxDQUFDLE1BQXlCLEVBQUUsU0FBa0IsRUFBRSxPQUFnQjtJQUNsRixJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ1YsSUFBSTtZQUNGLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM3QztRQUFDLFdBQU0sR0FBRTtRQUVWLElBQUksU0FBUyxFQUFFO1lBQ2IsSUFBSTtnQkFDRixLQUFLLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7YUFDN0Q7WUFBQyxXQUFNLEdBQUU7U0FDWDtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUNsQixNQUF5QixFQUN6QixJQUFJLEdBQUcsS0FBSyxFQUNaLGNBQWMsR0FBRyxLQUFLO0lBRXRCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQy9DLE1BQU0sV0FBVyxHQUFHLEdBQUcsR0FBRyxZQUFZLENBQUM7SUFFdkMsSUFBSSxZQUFvQixDQUFDO0lBQ3pCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7UUFDdEIsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0tBQ25DO1NBQU07UUFDTCxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRTtZQUNoQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUMzQztLQUNGO0lBRUQsTUFBTSxzQkFBc0IsR0FBRztRQUM3QixDQUFDLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDO1FBQzlGLENBQUMsQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBQSxZQUFPLEdBQUUsRUFBRSxXQUFXLENBQUM7S0FDbEYsQ0FBQztJQUVGLE1BQU0sc0JBQXNCLEdBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLElBQUksSUFBSSxFQUFFO1FBQ1IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDbEMsS0FBSyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzdGLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1NBQ2hFO0tBQ0Y7SUFFRCxJQUFJLGNBQWMsRUFBRTtRQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixZQUFZLFNBQVMsQ0FBQyxDQUFDO0tBQzFEO0lBRUQsSUFBSSxTQUFTLEdBQTBCLEVBQUUsQ0FBQztJQUMxQyxLQUFLLE1BQU0sUUFBUSxJQUFJLENBQUMsR0FBRyxzQkFBc0IsRUFBRSxHQUFHLHNCQUFzQixDQUFDLEVBQUU7UUFDN0UsSUFBSSxJQUFBLGVBQVUsRUFBQyxRQUFRLENBQUMsRUFBRTtZQUN4QixJQUFJLGNBQWMsRUFBRTtnQkFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLFFBQVEsWUFBWSxDQUFDLENBQUM7YUFDOUM7WUFFRCxNQUFNLElBQUksR0FBRyxJQUFBLGlCQUFZLEVBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzVDLGdFQUFnRTtZQUNoRSxpSEFBaUg7WUFDakgsTUFBTSxRQUFRLEdBQTBCLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV0RixTQUFTLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztTQUM3RDtLQUNGO0lBRUQsTUFBTSxtQkFBbUIsR0FBMEIsRUFBRSxDQUFDO0lBQ3RELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN0RCxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsU0FBUztTQUNWO1FBRUQsSUFBSSxjQUFjLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3ZDLElBQUksY0FBYyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFBRTtZQUM1QyxjQUFjLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUMvQzthQUFNLElBQUksSUFBSSxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDckQsY0FBYyxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUM7YUFBTTtZQUNMLFNBQVM7U0FDVjtRQUVELGNBQWMsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLDRDQUE0QztRQUNyRyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsR0FBRyxLQUFLLENBQUM7S0FDN0M7SUFFRCxPQUFPLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FDdkIsVUFBaUMsRUFDakMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFDeEIsNEJBQW1ELEVBQUU7O0lBRXJELE1BQU0sT0FBTyxHQUFHLEVBQUUsR0FBRyx5QkFBeUIsRUFBRSxDQUFDO0lBRWpELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1FBQ3JELElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBRTdCLGtEQUFrRDtRQUNsRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtZQUM3QixnQkFBZ0IsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7U0FDekY7UUFFRCxRQUFRLEdBQUcsRUFBRTtZQUNYLHVHQUF1RztZQUN2RyxtQ0FBbUM7WUFDbkMsb0dBQW9HO1lBQ3BHLDBHQUEwRztZQUMxRyxLQUFLLFlBQVksQ0FBQztZQUNsQixLQUFLLE9BQU8sQ0FBQztZQUNiLEtBQUssVUFBVSxDQUFDO1lBQ2hCLEtBQUssVUFBVSxDQUFDO1lBQ2hCLEtBQUssT0FBTyxDQUFDO1lBQ2IsS0FBSyxNQUFNO2dCQUNULE1BQUEsT0FBTyxDQUFDLFdBQVcscUNBQW5CLE9BQU8sQ0FBQyxXQUFXLElBQU0sRUFBRSxFQUFDO2dCQUM1QixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsZ0JBQWdCLENBQUM7Z0JBQzdDLE1BQU07WUFDUixLQUFLLFNBQVMsQ0FBQztZQUNmLEtBQUssVUFBVTtnQkFDYixPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsZ0JBQWdCLENBQUM7Z0JBQ3RDLE1BQU07WUFDUixLQUFLLFlBQVk7Z0JBQ2YsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLGdCQUFnQixDQUFDO2dCQUN6QyxNQUFNO1lBQ1IsS0FBSyxhQUFhLENBQUM7WUFDbkIsS0FBSyxPQUFPO2dCQUNWLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztnQkFDcEMsTUFBTTtZQUNSLEtBQUssWUFBWTtnQkFDZixPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsZ0JBQWdCLENBQUM7Z0JBQ3hDLE1BQU07WUFDUixLQUFLLGVBQWU7Z0JBQ2xCLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztnQkFDM0MsTUFBTTtZQUNSLEtBQUssUUFBUTtnQkFDWCxJQUFJLE9BQU8sZ0JBQWdCLEtBQUssUUFBUSxFQUFFO29CQUN4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztvQkFDdEUsSUFBSTt3QkFDRixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBQSxpQkFBWSxFQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUN0RTtvQkFBQyxXQUFNLEdBQUU7aUJBQ1g7Z0JBQ0QsTUFBTTtZQUNSO2dCQUNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztnQkFDaEMsTUFBTTtTQUNUO0tBQ0Y7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBRU0sS0FBSyxVQUFVLG9CQUFvQixDQUN4QyxJQUFZLEVBQ1osTUFBeUIsRUFDekIsT0FJQztJQUVELE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHO1FBQ3ZDLFFBQVEsRUFBRSxTQUFTO1FBQ25CLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLE9BQU8sRUFBRSxLQUFLO1FBQ2QsR0FBRyxPQUFPO0tBQ1gsQ0FBQztJQUVGLFdBQVcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyx3REFBYSxRQUFRLEdBQUMsQ0FBQztJQUM3QyxNQUFNLFFBQVEsR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLEVBQUU7UUFDckMsWUFBWSxFQUFFLElBQUk7UUFDbEIsR0FBRyxLQUFLO1FBQ1IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQ2xDLENBQUMsQ0FBQztJQUVILHlCQUF5QjtJQUN6QixNQUFNLFFBQVEsR0FBb0I7UUFDaEMsR0FBRyxRQUFRO1FBQ1gsSUFBSSxFQUFFLEVBQUU7S0FDVCxDQUFDO0lBRUYsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDekIsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUU7WUFDbEUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QyxJQUFJLFFBQVEsRUFBRTtnQkFDWixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQzthQUMvQjtpQkFBTSxJQUFJLE9BQU8sRUFBRTtnQkFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLFFBQVEsQ0FBQyxJQUFJLHNDQUFzQyxHQUFHLElBQUksQ0FBQyxDQUFDO2FBQ3BGO1NBQ0Y7S0FDRjtJQUVELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUExQ0Qsb0RBMENDO0FBRU0sS0FBSyxVQUFVLG9CQUFvQixDQUN4QyxJQUFZLEVBQ1osTUFBeUIsRUFDekIsVUFJSSxFQUFFO0lBRU4sTUFBTSxFQUFFLFNBQVMsR0FBRyxLQUFLLEVBQUUsT0FBTyxHQUFHLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDakUsV0FBVyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLHdEQUFhLFFBQVEsR0FBQyxDQUFDO0lBRTVDLE1BQU0sUUFBUSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRTtRQUNwQyxZQUFZLEVBQUUsSUFBSTtRQUNsQixHQUFHLEtBQUs7UUFDUixHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7S0FDbEMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQXBCRCxvREFvQkM7QUFFTSxLQUFLLFVBQVUsaUJBQWlCLENBQ3JDLFdBQW1CLEVBQ25CLE1BQXlCLEVBQ3pCLFVBSUksRUFBRTtJQUVOLE1BQU0sY0FBYyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM1RCxJQUFJLGNBQWMsRUFBRTtRQUNsQixPQUFPLGNBQWMsQ0FBQztLQUN2QjtJQUVELE1BQU0sRUFBRSxTQUFTLEdBQUcsS0FBSyxFQUFFLE9BQU8sR0FBRyxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQ2pFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyx3REFBYSxRQUFRLEdBQUMsQ0FBQztJQUM3QyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFO1FBQ3RDLFlBQVksRUFBRSxJQUFJO1FBQ2xCLEdBQUcsS0FBSztRQUNSLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztLQUNsQyxDQUFDLENBQUM7SUFFSCxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRS9DLE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUExQkQsOENBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBsb2NrZmlsZSBmcm9tICdAeWFybnBrZy9sb2NrZmlsZSc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBpbmkgZnJvbSAnaW5pJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdvcyc7XG5pbXBvcnQgdHlwZSB7IE1hbmlmZXN0LCBQYWNrdW1lbnQgfSBmcm9tICdwYWNvdGUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlTWV0YWRhdGEgZXh0ZW5kcyBQYWNrdW1lbnQsIE5nUGFja2FnZU1hbmlmZXN0UHJvcGVydGllcyB7XG4gIHRhZ3M6IFJlY29yZDxzdHJpbmcsIFBhY2thZ2VNYW5pZmVzdD47XG4gIHZlcnNpb25zOiBSZWNvcmQ8c3RyaW5nLCBQYWNrYWdlTWFuaWZlc3Q+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbiBleHRlbmRzIFBhY2thZ2VNZXRhZGF0YSB7XG4gIHJlcXVlc3RlZE5hbWU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIE5nQWRkU2F2ZURlcGVuZGVuY3kgPSAnZGVwZW5kZW5jaWVzJyB8ICdkZXZEZXBlbmRlbmNpZXMnIHwgYm9vbGVhbjtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSWRlbnRpZmllciB7XG4gIHR5cGU6ICdnaXQnIHwgJ3RhZycgfCAndmVyc2lvbicgfCAncmFuZ2UnIHwgJ2ZpbGUnIHwgJ2RpcmVjdG9yeScgfCAncmVtb3RlJztcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nIHwgbnVsbDtcbiAgcmVnaXN0cnk6IGJvb2xlYW47XG4gIHJhdzogc3RyaW5nO1xuICBmZXRjaFNwZWM6IHN0cmluZztcbiAgcmF3U3BlYzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nUGFja2FnZU1hbmlmZXN0UHJvcGVydGllcyB7XG4gICduZy1hZGQnPzoge1xuICAgIHNhdmU/OiBOZ0FkZFNhdmVEZXBlbmRlbmN5O1xuICB9O1xuICAnbmctdXBkYXRlJz86IHtcbiAgICBtaWdyYXRpb25zPzogc3RyaW5nO1xuICAgIHBhY2thZ2VHcm91cD86IHN0cmluZ1tdIHwgUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgICBwYWNrYWdlR3JvdXBOYW1lPzogc3RyaW5nO1xuICAgIHJlcXVpcmVtZW50cz86IHN0cmluZ1tdIHwgUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlTWFuaWZlc3QgZXh0ZW5kcyBNYW5pZmVzdCwgTmdQYWNrYWdlTWFuaWZlc3RQcm9wZXJ0aWVzIHtcbiAgZGVwcmVjYXRlZD86IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBQYWNrYWdlTWFuYWdlck9wdGlvbnMgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIGZvcmNlQXV0aD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufVxuXG5sZXQgbnBtcmM6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucztcbmNvbnN0IG5wbVBhY2thZ2VKc29uQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgUHJvbWlzZTxQYXJ0aWFsPE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4+PigpO1xuXG5mdW5jdGlvbiBlbnN1cmVOcG1yYyhsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLCB1c2luZ1lhcm46IGJvb2xlYW4sIHZlcmJvc2U6IGJvb2xlYW4pOiB2b2lkIHtcbiAgaWYgKCFucG1yYykge1xuICAgIHRyeSB7XG4gICAgICBucG1yYyA9IHJlYWRPcHRpb25zKGxvZ2dlciwgZmFsc2UsIHZlcmJvc2UpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmICh1c2luZ1lhcm4pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5wbXJjID0geyAuLi5ucG1yYywgLi4ucmVhZE9wdGlvbnMobG9nZ2VyLCB0cnVlLCB2ZXJib3NlKSB9O1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkT3B0aW9ucyhcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgeWFybiA9IGZhbHNlLFxuICBzaG93UG90ZW50aWFscyA9IGZhbHNlLFxuKTogUGFja2FnZU1hbmFnZXJPcHRpb25zIHtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgYmFzZUZpbGVuYW1lID0geWFybiA/ICd5YXJucmMnIDogJ25wbXJjJztcbiAgY29uc3QgZG90RmlsZW5hbWUgPSAnLicgKyBiYXNlRmlsZW5hbWU7XG5cbiAgbGV0IGdsb2JhbFByZWZpeDogc3RyaW5nO1xuICBpZiAocHJvY2Vzcy5lbnYuUFJFRklYKSB7XG4gICAgZ2xvYmFsUHJlZml4ID0gcHJvY2Vzcy5lbnYuUFJFRklYO1xuICB9IGVsc2Uge1xuICAgIGdsb2JhbFByZWZpeCA9IHBhdGguZGlybmFtZShwcm9jZXNzLmV4ZWNQYXRoKTtcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gJ3dpbjMyJykge1xuICAgICAgZ2xvYmFsUHJlZml4ID0gcGF0aC5kaXJuYW1lKGdsb2JhbFByZWZpeCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZGVmYXVsdENvbmZpZ0xvY2F0aW9ucyA9IFtcbiAgICAoIXlhcm4gJiYgcHJvY2Vzcy5lbnYuTlBNX0NPTkZJR19HTE9CQUxDT05GSUcpIHx8IHBhdGguam9pbihnbG9iYWxQcmVmaXgsICdldGMnLCBiYXNlRmlsZW5hbWUpLFxuICAgICgheWFybiAmJiBwcm9jZXNzLmVudi5OUE1fQ09ORklHX1VTRVJDT05GSUcpIHx8IHBhdGguam9pbihob21lZGlyKCksIGRvdEZpbGVuYW1lKSxcbiAgXTtcblxuICBjb25zdCBwcm9qZWN0Q29uZmlnTG9jYXRpb25zOiBzdHJpbmdbXSA9IFtwYXRoLmpvaW4oY3dkLCBkb3RGaWxlbmFtZSldO1xuICBpZiAoeWFybikge1xuICAgIGNvbnN0IHJvb3QgPSBwYXRoLnBhcnNlKGN3ZCkucm9vdDtcbiAgICBmb3IgKGxldCBjdXJEaXIgPSBwYXRoLmRpcm5hbWUoY3dkKTsgY3VyRGlyICYmIGN1ckRpciAhPT0gcm9vdDsgY3VyRGlyID0gcGF0aC5kaXJuYW1lKGN1ckRpcikpIHtcbiAgICAgIHByb2plY3RDb25maWdMb2NhdGlvbnMudW5zaGlmdChwYXRoLmpvaW4oY3VyRGlyLCBkb3RGaWxlbmFtZSkpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzaG93UG90ZW50aWFscykge1xuICAgIGxvZ2dlci5pbmZvKGBMb2NhdGluZyBwb3RlbnRpYWwgJHtiYXNlRmlsZW5hbWV9IGZpbGVzOmApO1xuICB9XG5cbiAgbGV0IHJjT3B0aW9uczogUGFja2FnZU1hbmFnZXJPcHRpb25zID0ge307XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2YgWy4uLmRlZmF1bHRDb25maWdMb2NhdGlvbnMsIC4uLnByb2plY3RDb25maWdMb2NhdGlvbnNdKSB7XG4gICAgaWYgKGV4aXN0c1N5bmMobG9jYXRpb24pKSB7XG4gICAgICBpZiAoc2hvd1BvdGVudGlhbHMpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFRyeWluZyAnJHtsb2NhdGlvbn0nLi4uZm91bmQuYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSByZWFkRmlsZVN5bmMobG9jYXRpb24sICd1dGY4Jyk7XG4gICAgICAvLyBOb3JtYWxpemUgUkMgb3B0aW9ucyB0aGF0IGFyZSBuZWVkZWQgYnkgJ25wbS1yZWdpc3RyeS1mZXRjaCcuXG4gICAgICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9ucG0vbnBtLXJlZ2lzdHJ5LWZldGNoL2Jsb2IvZWJkZGJlNzhhNWY2NzExOGMxZjdhZjJlMDJjOGEyMmJjYWY5ZTg1MC9pbmRleC5qcyNMOTktTDEyNlxuICAgICAgY29uc3QgcmNDb25maWc6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyA9IHlhcm4gPyBsb2NrZmlsZS5wYXJzZShkYXRhKSA6IGluaS5wYXJzZShkYXRhKTtcblxuICAgICAgcmNPcHRpb25zID0gbm9ybWFsaXplT3B0aW9ucyhyY0NvbmZpZywgbG9jYXRpb24sIHJjT3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZW52VmFyaWFibGVzT3B0aW9uczogUGFja2FnZU1hbmFnZXJPcHRpb25zID0ge307XG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHByb2Nlc3MuZW52KSkge1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGxldCBub3JtYWxpemVkTmFtZSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChub3JtYWxpemVkTmFtZS5zdGFydHNXaXRoKCducG1fY29uZmlnXycpKSB7XG4gICAgICBub3JtYWxpemVkTmFtZSA9IG5vcm1hbGl6ZWROYW1lLnN1YnN0cmluZygxMSk7XG4gICAgfSBlbHNlIGlmICh5YXJuICYmIG5vcm1hbGl6ZWROYW1lLnN0YXJ0c1dpdGgoJ3lhcm5fJykpIHtcbiAgICAgIG5vcm1hbGl6ZWROYW1lID0gbm9ybWFsaXplZE5hbWUuc3Vic3RyaW5nKDUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBub3JtYWxpemVkTmFtZSA9IG5vcm1hbGl6ZWROYW1lLnJlcGxhY2UoLyg/IV4pXy9nLCAnLScpOyAvLyBkb24ndCByZXBsYWNlIF8gYXQgdGhlIHN0YXJ0IG9mIHRoZSBrZXkuc1xuICAgIGVudlZhcmlhYmxlc09wdGlvbnNbbm9ybWFsaXplZE5hbWVdID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gbm9ybWFsaXplT3B0aW9ucyhlbnZWYXJpYWJsZXNPcHRpb25zLCB1bmRlZmluZWQsIHJjT3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU9wdGlvbnMoXG4gIHJhd09wdGlvbnM6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyxcbiAgbG9jYXRpb24gPSBwcm9jZXNzLmN3ZCgpLFxuICBleGlzdGluZ05vcm1hbGl6ZWRPcHRpb25zOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMgPSB7fSxcbik6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gIGNvbnN0IG9wdGlvbnMgPSB7IC4uLmV4aXN0aW5nTm9ybWFsaXplZE9wdGlvbnMgfTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhyYXdPcHRpb25zKSkge1xuICAgIGxldCBzdWJzdGl0dXRlZFZhbHVlID0gdmFsdWU7XG5cbiAgICAvLyBTdWJzdGl0dXRlIGFueSBlbnZpcm9ubWVudCB2YXJpYWJsZSByZWZlcmVuY2VzLlxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBzdWJzdGl0dXRlZFZhbHVlID0gdmFsdWUucmVwbGFjZSgvXFwkXFx7KFtefV0rKVxcfS8sIChfLCBuYW1lKSA9PiBwcm9jZXNzLmVudltuYW1lXSB8fCAnJyk7XG4gICAgfVxuXG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgIC8vIFVubGVzcyBhdXRoIG9wdGlvbnMgYXJlIHNjb3BlIHdpdGggdGhlIHJlZ2lzdHJ5IHVybCBpdCBhcHBlYXJzIHRoYXQgbnBtLXJlZ2lzdHJ5LWZldGNoIGlnbm9yZXMgdGhlbSxcbiAgICAgIC8vIGV2ZW4gdGhvdWdoIHRoZXkgYXJlIGRvY3VtZW50ZWQuXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbnBtL25wbS1yZWdpc3RyeS1mZXRjaC9ibG9iLzg5NTRmNjFkOGQ3MDNlNWViN2YzZDkzYzliNDA0ODhmOGIxYjYyYWMvUkVBRE1FLm1kXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbnBtL25wbS1yZWdpc3RyeS1mZXRjaC9ibG9iLzg5NTRmNjFkOGQ3MDNlNWViN2YzZDkzYzliNDA0ODhmOGIxYjYyYWMvYXV0aC5qcyNMNDUtTDkxXG4gICAgICBjYXNlICdfYXV0aFRva2VuJzpcbiAgICAgIGNhc2UgJ3Rva2VuJzpcbiAgICAgIGNhc2UgJ3VzZXJuYW1lJzpcbiAgICAgIGNhc2UgJ3Bhc3N3b3JkJzpcbiAgICAgIGNhc2UgJ19hdXRoJzpcbiAgICAgIGNhc2UgJ2F1dGgnOlxuICAgICAgICBvcHRpb25zWydmb3JjZUF1dGgnXSA/Pz0ge307XG4gICAgICAgIG9wdGlvbnNbJ2ZvcmNlQXV0aCddW2tleV0gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ25vcHJveHknOlxuICAgICAgY2FzZSAnbm8tcHJveHknOlxuICAgICAgICBvcHRpb25zWydub1Byb3h5J10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21heHNvY2tldHMnOlxuICAgICAgICBvcHRpb25zWydtYXhTb2NrZXRzJ10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2h0dHBzLXByb3h5JzpcbiAgICAgIGNhc2UgJ3Byb3h5JzpcbiAgICAgICAgb3B0aW9uc1sncHJveHknXSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3RyaWN0LXNzbCc6XG4gICAgICAgIG9wdGlvbnNbJ3N0cmljdFNTTCddID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdsb2NhbC1hZGRyZXNzJzpcbiAgICAgICAgb3B0aW9uc1snbG9jYWxBZGRyZXNzJ10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NhZmlsZSc6XG4gICAgICAgIGlmICh0eXBlb2Ygc3Vic3RpdHV0ZWRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBjb25zdCBjYWZpbGUgPSBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGxvY2F0aW9uKSwgc3Vic3RpdHV0ZWRWYWx1ZSk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9wdGlvbnNbJ2NhJ10gPSByZWFkRmlsZVN5bmMoY2FmaWxlLCAndXRmOCcpLnJlcGxhY2UoL1xccj9cXG4vZywgJ1xcbicpO1xuICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG9wdGlvbnNba2V5XSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hQYWNrYWdlTWV0YWRhdGEoXG4gIG5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgb3B0aW9ucz86IHtcbiAgICByZWdpc3RyeT86IHN0cmluZztcbiAgICB1c2luZ1lhcm4/OiBib29sZWFuO1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xuICB9LFxuKTogUHJvbWlzZTxQYWNrYWdlTWV0YWRhdGE+IHtcbiAgY29uc3QgeyB1c2luZ1lhcm4sIHZlcmJvc2UsIHJlZ2lzdHJ5IH0gPSB7XG4gICAgcmVnaXN0cnk6IHVuZGVmaW5lZCxcbiAgICB1c2luZ1lhcm46IGZhbHNlLFxuICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgIC4uLm9wdGlvbnMsXG4gIH07XG5cbiAgZW5zdXJlTnBtcmMobG9nZ2VyLCB1c2luZ1lhcm4sIHZlcmJvc2UpO1xuICBjb25zdCB7IHBhY2t1bWVudCB9ID0gYXdhaXQgaW1wb3J0KCdwYWNvdGUnKTtcbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwYWNrdW1lbnQobmFtZSwge1xuICAgIGZ1bGxNZXRhZGF0YTogdHJ1ZSxcbiAgICAuLi5ucG1yYyxcbiAgICAuLi4ocmVnaXN0cnkgPyB7IHJlZ2lzdHJ5IH0gOiB7fSksXG4gIH0pO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcmVzcG9uc2VcbiAgY29uc3QgbWV0YWRhdGE6IFBhY2thZ2VNZXRhZGF0YSA9IHtcbiAgICAuLi5yZXNwb25zZSxcbiAgICB0YWdzOiB7fSxcbiAgfTtcblxuICBpZiAocmVzcG9uc2VbJ2Rpc3QtdGFncyddKSB7XG4gICAgZm9yIChjb25zdCBbdGFnLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyhyZXNwb25zZVsnZGlzdC10YWdzJ10pKSB7XG4gICAgICBjb25zdCBtYW5pZmVzdCA9IG1ldGFkYXRhLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgaWYgKG1hbmlmZXN0KSB7XG4gICAgICAgIG1ldGFkYXRhLnRhZ3NbdGFnXSA9IG1hbmlmZXN0O1xuICAgICAgfSBlbHNlIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBQYWNrYWdlICR7bWV0YWRhdGEubmFtZX0gaGFzIGludmFsaWQgdmVyc2lvbiBtZXRhZGF0YSBmb3IgJyR7dGFnfScuYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1ldGFkYXRhO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hQYWNrYWdlTWFuaWZlc3QoXG4gIG5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgb3B0aW9uczoge1xuICAgIHJlZ2lzdHJ5Pzogc3RyaW5nO1xuICAgIHVzaW5nWWFybj86IGJvb2xlYW47XG4gICAgdmVyYm9zZT86IGJvb2xlYW47XG4gIH0gPSB7fSxcbik6IFByb21pc2U8UGFja2FnZU1hbmlmZXN0PiB7XG4gIGNvbnN0IHsgdXNpbmdZYXJuID0gZmFsc2UsIHZlcmJvc2UgPSBmYWxzZSwgcmVnaXN0cnkgfSA9IG9wdGlvbnM7XG4gIGVuc3VyZU5wbXJjKGxvZ2dlciwgdXNpbmdZYXJuLCB2ZXJib3NlKTtcbiAgY29uc3QgeyBtYW5pZmVzdCB9ID0gYXdhaXQgaW1wb3J0KCdwYWNvdGUnKTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IG1hbmlmZXN0KG5hbWUsIHtcbiAgICBmdWxsTWV0YWRhdGE6IHRydWUsXG4gICAgLi4ubnBtcmMsXG4gICAgLi4uKHJlZ2lzdHJ5ID8geyByZWdpc3RyeSB9IDoge30pLFxuICB9KTtcblxuICByZXR1cm4gcmVzcG9uc2U7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXROcG1QYWNrYWdlSnNvbihcbiAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgb3B0aW9uczoge1xuICAgIHJlZ2lzdHJ5Pzogc3RyaW5nO1xuICAgIHVzaW5nWWFybj86IGJvb2xlYW47XG4gICAgdmVyYm9zZT86IGJvb2xlYW47XG4gIH0gPSB7fSxcbik6IFByb21pc2U8UGFydGlhbDxOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24+PiB7XG4gIGNvbnN0IGNhY2hlZFJlc3BvbnNlID0gbnBtUGFja2FnZUpzb25DYWNoZS5nZXQocGFja2FnZU5hbWUpO1xuICBpZiAoY2FjaGVkUmVzcG9uc2UpIHtcbiAgICByZXR1cm4gY2FjaGVkUmVzcG9uc2U7XG4gIH1cblxuICBjb25zdCB7IHVzaW5nWWFybiA9IGZhbHNlLCB2ZXJib3NlID0gZmFsc2UsIHJlZ2lzdHJ5IH0gPSBvcHRpb25zO1xuICBlbnN1cmVOcG1yYyhsb2dnZXIsIHVzaW5nWWFybiwgdmVyYm9zZSk7XG4gIGNvbnN0IHsgcGFja3VtZW50IH0gPSBhd2FpdCBpbXBvcnQoJ3BhY290ZScpO1xuICBjb25zdCByZXNwb25zZSA9IHBhY2t1bWVudChwYWNrYWdlTmFtZSwge1xuICAgIGZ1bGxNZXRhZGF0YTogdHJ1ZSxcbiAgICAuLi5ucG1yYyxcbiAgICAuLi4ocmVnaXN0cnkgPyB7IHJlZ2lzdHJ5IH0gOiB7fSksXG4gIH0pO1xuXG4gIG5wbVBhY2thZ2VKc29uQ2FjaGUuc2V0KHBhY2thZ2VOYW1lLCByZXNwb25zZSk7XG5cbiAgcmV0dXJuIHJlc3BvbnNlO1xufVxuIl19