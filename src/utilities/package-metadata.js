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
const pacote = __importStar(require("pacote"));
const path = __importStar(require("path"));
const npmPackageJsonCache = new Map();
let npmrc;
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
function normalizeManifest(rawManifest) {
    // TODO: Fully normalize and sanitize
    return {
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        ...rawManifest,
    };
}
async function fetchPackageMetadata(name, logger, options) {
    const { usingYarn, verbose, registry } = {
        registry: undefined,
        usingYarn: false,
        verbose: false,
        ...options,
    };
    ensureNpmrc(logger, usingYarn, verbose);
    const response = await pacote.packument(name, {
        fullMetadata: true,
        ...npmrc,
        ...(registry ? { registry } : {}),
    });
    // Normalize the response
    const metadata = {
        name: response.name,
        tags: {},
        versions: {},
    };
    if (response.versions) {
        for (const [version, manifest] of Object.entries(response.versions)) {
            metadata.versions[version] = normalizeManifest(manifest);
        }
    }
    if (response['dist-tags']) {
        // Store this for use with other npm utility packages
        metadata['dist-tags'] = response['dist-tags'];
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
    const response = await pacote.manifest(name, {
        fullMetadata: true,
        ...npmrc,
        ...(registry ? { registry } : {}),
    });
    return normalizeManifest(response);
}
exports.fetchPackageManifest = fetchPackageManifest;
function getNpmPackageJson(packageName, logger, options = {}) {
    const cachedResponse = npmPackageJsonCache.get(packageName);
    if (cachedResponse) {
        return cachedResponse;
    }
    const { usingYarn = false, verbose = false, registry } = options;
    ensureNpmrc(logger, usingYarn, verbose);
    const resultPromise = pacote.packument(packageName, {
        fullMetadata: true,
        ...npmrc,
        ...(registry ? { registry } : {}),
    });
    // TODO: find some way to test this
    const response = resultPromise.catch((err) => {
        logger.warn(err.message || err);
        return { requestedName: packageName };
    });
    npmPackageJsonCache.set(packageName, response);
    return response;
}
exports.getNpmPackageJson = getNpmPackageJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tZXRhZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUdILDREQUE4QztBQUM5QywyQkFBOEM7QUFDOUMseUNBQTJCO0FBQzNCLDJCQUE2QjtBQUM3QiwrQ0FBaUM7QUFDakMsMkNBQTZCO0FBRzdCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQXNELENBQUM7QUErRDFGLElBQUksS0FBNEIsQ0FBQztBQUVqQyxTQUFTLFdBQVcsQ0FBQyxNQUF5QixFQUFFLFNBQWtCLEVBQUUsT0FBZ0I7SUFDbEYsSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNWLElBQUk7WUFDRixLQUFLLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7U0FDN0M7UUFBQyxXQUFNLEdBQUU7UUFFVixJQUFJLFNBQVMsRUFBRTtZQUNiLElBQUk7Z0JBQ0YsS0FBSyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO2FBQzdEO1lBQUMsV0FBTSxHQUFFO1NBQ1g7S0FDRjtBQUNILENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FDbEIsTUFBeUIsRUFDekIsSUFBSSxHQUFHLEtBQUssRUFDWixjQUFjLEdBQUcsS0FBSztJQUV0QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDMUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMvQyxNQUFNLFdBQVcsR0FBRyxHQUFHLEdB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USxDQUFDO0FBQ2xCLENBQUM7QUFqQ0QsOENBaUNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGxvZ2dpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgKiBhcyBsb2NrZmlsZSBmcm9tICdAeWFybnBrZy9sb2NrZmlsZSc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBpbmkgZnJvbSAnaW5pJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYWNvdGUgZnJvbSAncGFjb3RlJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcyB9IGZyb20gJy4vcGFja2FnZS1qc29uJztcblxuY29uc3QgbnBtUGFja2FnZUpzb25DYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBQcm9taXNlPFBhcnRpYWw8TnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uPj4+KCk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uIHtcbiAgbmFtZTogc3RyaW5nO1xuICByZXF1ZXN0ZWROYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG5cbiAgJ2Rpc3QtdGFncyc6IHtcbiAgICBbbmFtZTogc3RyaW5nXTogc3RyaW5nO1xuICB9O1xuICB2ZXJzaW9uczoge1xuICAgIFt2ZXJzaW9uOiBzdHJpbmddOiBKc29uU2NoZW1hRm9yTnBtUGFja2FnZUpzb25GaWxlcztcbiAgfTtcbiAgdGltZToge1xuICAgIG1vZGlmaWVkOiBzdHJpbmc7XG4gICAgY3JlYXRlZDogc3RyaW5nO1xuXG4gICAgW3ZlcnNpb246IHN0cmluZ106IHN0cmluZztcbiAgfTtcbn1cblxuZXhwb3J0IHR5cGUgTmdBZGRTYXZlRGVwZWRlbmN5ID0gJ2RlcGVuZGVuY2llcycgfCAnZGV2RGVwZW5kZW5jaWVzJyB8IGJvb2xlYW47XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUlkZW50aWZpZXIge1xuICB0eXBlOiAnZ2l0JyB8ICd0YWcnIHwgJ3ZlcnNpb24nIHwgJ3JhbmdlJyB8ICdmaWxlJyB8ICdkaXJlY3RvcnknIHwgJ3JlbW90ZSc7XG4gIG5hbWU6IHN0cmluZztcbiAgc2NvcGU6IHN0cmluZyB8IG51bGw7XG4gIHJlZ2lzdHJ5OiBib29sZWFuO1xuICByYXc6IHN0cmluZztcbiAgZmV0Y2hTcGVjOiBzdHJpbmc7XG4gIHJhd1NwZWM6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlTWFuaWZlc3Qge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgbGljZW5zZT86IHN0cmluZztcbiAgcHJpdmF0ZT86IGJvb2xlYW47XG4gIGRlcHJlY2F0ZWQ/OiBib29sZWFuO1xuICBkZXBlbmRlbmNpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgcGVlckRlcGVuZGVuY2llczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgb3B0aW9uYWxEZXBlbmRlbmNpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gICduZy1hZGQnPzoge1xuICAgIHNhdmU/OiBOZ0FkZFNhdmVEZXBlZGVuY3k7XG4gIH07XG4gICduZy11cGRhdGUnPzoge1xuICAgIG1pZ3JhdGlvbnM6IHN0cmluZztcbiAgICBwYWNrYWdlR3JvdXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZU1ldGFkYXRhIHtcbiAgbmFtZTogc3RyaW5nO1xuICB0YWdzOiB7IFt0YWc6IHN0cmluZ106IFBhY2thZ2VNYW5pZmVzdCB8IHVuZGVmaW5lZCB9O1xuICB2ZXJzaW9uczogUmVjb3JkPHN0cmluZywgUGFja2FnZU1hbmlmZXN0PjtcbiAgJ2Rpc3QtdGFncyc/OiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZU1hbmFnZXJPcHRpb25zIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICBmb3JjZUF1dGg/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxubGV0IG5wbXJjOiBQYWNrYWdlTWFuYWdlck9wdGlvbnM7XG5cbmZ1bmN0aW9uIGVuc3VyZU5wbXJjKGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksIHVzaW5nWWFybjogYm9vbGVhbiwgdmVyYm9zZTogYm9vbGVhbik6IHZvaWQge1xuICBpZiAoIW5wbXJjKSB7XG4gICAgdHJ5IHtcbiAgICAgIG5wbXJjID0gcmVhZE9wdGlvbnMobG9nZ2VyLCBmYWxzZSwgdmVyYm9zZSk7XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgaWYgKHVzaW5nWWFybikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbnBtcmMgPSB7IC4uLm5wbXJjLCAuLi5yZWFkT3B0aW9ucyhsb2dnZXIsIHRydWUsIHZlcmJvc2UpIH07XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRPcHRpb25zKFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICB5YXJuID0gZmFsc2UsXG4gIHNob3dQb3RlbnRpYWxzID0gZmFsc2UsXG4pOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBiYXNlRmlsZW5hbWUgPSB5YXJuID8gJ3lhcm5yYycgOiAnbnBtcmMnO1xuICBjb25zdCBkb3RGaWxlbmFtZSA9ICcuJyArIGJhc2VGaWxlbmFtZTtcblxuICBsZXQgZ2xvYmFsUHJlZml4OiBzdHJpbmc7XG4gIGlmIChwcm9jZXNzLmVudi5QUkVGSVgpIHtcbiAgICBnbG9iYWxQcmVmaXggPSBwcm9jZXNzLmVudi5QUkVGSVg7XG4gIH0gZWxzZSB7XG4gICAgZ2xvYmFsUHJlZml4ID0gcGF0aC5kaXJuYW1lKHByb2Nlc3MuZXhlY1BhdGgpO1xuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSAnd2luMzInKSB7XG4gICAgICBnbG9iYWxQcmVmaXggPSBwYXRoLmRpcm5hbWUoZ2xvYmFsUHJlZml4KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBkZWZhdWx0Q29uZmlnTG9jYXRpb25zID0gW1xuICAgICgheWFybiAmJiBwcm9jZXNzLmVudi5OUE1fQ09ORklHX0dMT0JBTENPTkZJRykgfHwgcGF0aC5qb2luKGdsb2JhbFByZWZpeCwgJ2V0YycsIGJhc2VGaWxlbmFtZSksXG4gICAgKCF5YXJuICYmIHByb2Nlc3MuZW52Lk5QTV9DT05GSUdfVVNFUkNPTkZJRykgfHwgcGF0aC5qb2luKGhvbWVkaXIoKSwgZG90RmlsZW5hbWUpLFxuICBdO1xuXG4gIGNvbnN0IHByb2plY3RDb25maWdMb2NhdGlvbnM6IHN0cmluZ1tdID0gW3BhdGguam9pbihjd2QsIGRvdEZpbGVuYW1lKV07XG4gIGlmICh5YXJuKSB7XG4gICAgY29uc3Qgcm9vdCA9IHBhdGgucGFyc2UoY3dkKS5yb290O1xuICAgIGZvciAobGV0IGN1ckRpciA9IHBhdGguZGlybmFtZShjd2QpOyBjdXJEaXIgJiYgY3VyRGlyICE9PSByb290OyBjdXJEaXIgPSBwYXRoLmRpcm5hbWUoY3VyRGlyKSkge1xuICAgICAgcHJvamVjdENvbmZpZ0xvY2F0aW9ucy51bnNoaWZ0KHBhdGguam9pbihjdXJEaXIsIGRvdEZpbGVuYW1lKSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHNob3dQb3RlbnRpYWxzKSB7XG4gICAgbG9nZ2VyLmluZm8oYExvY2F0aW5nIHBvdGVudGlhbCAke2Jhc2VGaWxlbmFtZX0gZmlsZXM6YCk7XG4gIH1cblxuICBsZXQgcmNPcHRpb25zOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMgPSB7fTtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBbLi4uZGVmYXVsdENvbmZpZ0xvY2F0aW9ucywgLi4ucHJvamVjdENvbmZpZ0xvY2F0aW9uc10pIHtcbiAgICBpZiAoZXhpc3RzU3luYyhsb2NhdGlvbikpIHtcbiAgICAgIGlmIChzaG93UG90ZW50aWFscykge1xuICAgICAgICBsb2dnZXIuaW5mbyhgVHJ5aW5nICcke2xvY2F0aW9ufScuLi5mb3VuZC5gKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGF0YSA9IHJlYWRGaWxlU3luYyhsb2NhdGlvbiwgJ3V0ZjgnKTtcbiAgICAgIC8vIE5vcm1hbGl6ZSBSQyBvcHRpb25zIHRoYXQgYXJlIG5lZWRlZCBieSAnbnBtLXJlZ2lzdHJ5LWZldGNoJy5cbiAgICAgIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL25wbS9ucG0tcmVnaXN0cnktZmV0Y2gvYmxvYi9lYmRkYmU3OGE1ZjY3MTE4YzFmN2FmMmUwMmM4YTIyYmNhZjllODUwL2luZGV4LmpzI0w5OS1MMTI2XG4gICAgICBjb25zdCByY0NvbmZpZzogUGFja2FnZU1hbmFnZXJPcHRpb25zID0geWFybiA/IGxvY2tmaWxlLnBhcnNlKGRhdGEpIDogaW5pLnBhcnNlKGRhdGEpO1xuXG4gICAgICByY09wdGlvbnMgPSBub3JtYWxpemVPcHRpb25zKHJjQ29uZmlnLCBsb2NhdGlvbiwgcmNPcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBlbnZWYXJpYWJsZXNPcHRpb25zOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMgPSB7fTtcbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocHJvY2Vzcy5lbnYpKSB7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgbGV0IG5vcm1hbGl6ZWROYW1lID0ga2V5LnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKG5vcm1hbGl6ZWROYW1lLnN0YXJ0c1dpdGgoJ25wbV9jb25maWdfJykpIHtcbiAgICAgIG5vcm1hbGl6ZWROYW1lID0gbm9ybWFsaXplZE5hbWUuc3Vic3RyaW5nKDExKTtcbiAgICB9IGVsc2UgaWYgKHlhcm4gJiYgbm9ybWFsaXplZE5hbWUuc3RhcnRzV2l0aCgneWFybl8nKSkge1xuICAgICAgbm9ybWFsaXplZE5hbWUgPSBub3JtYWxpemVkTmFtZS5zdWJzdHJpbmcoNSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIG5vcm1hbGl6ZWROYW1lID0gbm9ybWFsaXplZE5hbWUucmVwbGFjZSgvKD8hXilfL2csICctJyk7IC8vIGRvbid0IHJlcGxhY2UgXyBhdCB0aGUgc3RhcnQgb2YgdGhlIGtleS5zXG4gICAgZW52VmFyaWFibGVzT3B0aW9uc1tub3JtYWxpemVkTmFtZV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBub3JtYWxpemVPcHRpb25zKGVudlZhcmlhYmxlc09wdGlvbnMsIHVuZGVmaW5lZCwgcmNPcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplT3B0aW9ucyhcbiAgcmF3T3B0aW9uczogUGFja2FnZU1hbmFnZXJPcHRpb25zLFxuICBsb2NhdGlvbiA9IHByb2Nlc3MuY3dkKCksXG4gIGV4aXN0aW5nTm9ybWFsaXplZE9wdGlvbnM6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyA9IHt9LFxuKTogUGFja2FnZU1hbmFnZXJPcHRpb25zIHtcbiAgY29uc3Qgb3B0aW9ucyA9IHsgLi4uZXhpc3RpbmdOb3JtYWxpemVkT3B0aW9ucyB9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHJhd09wdGlvbnMpKSB7XG4gICAgbGV0IHN1YnN0aXR1dGVkVmFsdWUgPSB2YWx1ZTtcblxuICAgIC8vIFN1YnN0aXR1dGUgYW55IGVudmlyb25tZW50IHZhcmlhYmxlIHJlZmVyZW5jZXMuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHN1YnN0aXR1dGVkVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9cXCRcXHsoW159XSspXFx9LywgKF8sIG5hbWUpID0+IHByb2Nlc3MuZW52W25hbWVdIHx8ICcnKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgLy8gVW5sZXNzIGF1dGggb3B0aW9ucyBhcmUgc2NvcGUgd2l0aCB0aGUgcmVnaXN0cnkgdXJsIGl0IGFwcGVhcnMgdGhhdCBucG0tcmVnaXN0cnktZmV0Y2ggaWdub3JlcyB0aGVtLFxuICAgICAgLy8gZXZlbiB0aG91Z2ggdGhleSBhcmUgZG9jdW1lbnRlZC5cbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ucG0vbnBtLXJlZ2lzdHJ5LWZldGNoL2Jsb2IvODk1NGY2MWQ4ZDcwM2U1ZWI3ZjNkOTNjOWI0MDQ4OGY4YjFiNjJhYy9SRUFETUUubWRcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ucG0vbnBtLXJlZ2lzdHJ5LWZldGNoL2Jsb2IvODk1NGY2MWQ4ZDcwM2U1ZWI3ZjNkOTNjOWI0MDQ4OGY4YjFiNjJhYy9hdXRoLmpzI0w0NS1MOTFcbiAgICAgIGNhc2UgJ19hdXRoVG9rZW4nOlxuICAgICAgY2FzZSAndG9rZW4nOlxuICAgICAgY2FzZSAndXNlcm5hbWUnOlxuICAgICAgY2FzZSAncGFzc3dvcmQnOlxuICAgICAgY2FzZSAnX2F1dGgnOlxuICAgICAgY2FzZSAnYXV0aCc6XG4gICAgICAgIG9wdGlvbnNbJ2ZvcmNlQXV0aCddID8/PSB7fTtcbiAgICAgICAgb3B0aW9uc1snZm9yY2VBdXRoJ11ba2V5XSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbm9wcm94eSc6XG4gICAgICBjYXNlICduby1wcm94eSc6XG4gICAgICAgIG9wdGlvbnNbJ25vUHJveHknXSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbWF4c29ja2V0cyc6XG4gICAgICAgIG9wdGlvbnNbJ21heFNvY2tldHMnXSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnaHR0cHMtcHJveHknOlxuICAgICAgY2FzZSAncHJveHknOlxuICAgICAgICBvcHRpb25zWydwcm94eSddID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzdHJpY3Qtc3NsJzpcbiAgICAgICAgb3B0aW9uc1snc3RyaWN0U1NMJ10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2xvY2FsLWFkZHJlc3MnOlxuICAgICAgICBvcHRpb25zWydsb2NhbEFkZHJlc3MnXSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnY2FmaWxlJzpcbiAgICAgICAgaWYgKHR5cGVvZiBzdWJzdGl0dXRlZFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGNvbnN0IGNhZmlsZSA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUobG9jYXRpb24pLCBzdWJzdGl0dXRlZFZhbHVlKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgb3B0aW9uc1snY2EnXSA9IHJlYWRGaWxlU3luYyhjYWZpbGUsICd1dGY4JykucmVwbGFjZSgvXFxyP1xcbi9nLCAnXFxuJyk7XG4gICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgb3B0aW9uc1trZXldID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1hbmlmZXN0KHJhd01hbmlmZXN0OiB7IG5hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nIH0pOiBQYWNrYWdlTWFuaWZlc3Qge1xuICAvLyBUT0RPOiBGdWxseSBub3JtYWxpemUgYW5kIHNhbml0aXplXG5cbiAgcmV0dXJuIHtcbiAgICBkZXBlbmRlbmNpZXM6IHt9LFxuICAgIGRldkRlcGVuZGVuY2llczoge30sXG4gICAgcGVlckRlcGVuZGVuY2llczoge30sXG4gICAgb3B0aW9uYWxEZXBlbmRlbmNpZXM6IHt9LFxuICAgIC4uLnJhd01hbmlmZXN0LFxuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hQYWNrYWdlTWV0YWRhdGEoXG4gIG5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgb3B0aW9ucz86IHtcbiAgICByZWdpc3RyeT86IHN0cmluZztcbiAgICB1c2luZ1lhcm4/OiBib29sZWFuO1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xuICB9LFxuKTogUHJvbWlzZTxQYWNrYWdlTWV0YWRhdGE+IHtcbiAgY29uc3QgeyB1c2luZ1lhcm4sIHZlcmJvc2UsIHJlZ2lzdHJ5IH0gPSB7XG4gICAgcmVnaXN0cnk6IHVuZGVmaW5lZCxcbiAgICB1c2luZ1lhcm46IGZhbHNlLFxuICAgIHZlcmJvc2U6IGZhbHNlLFxuICAgIC4uLm9wdGlvbnMsXG4gIH07XG5cbiAgZW5zdXJlTnBtcmMobG9nZ2VyLCB1c2luZ1lhcm4sIHZlcmJvc2UpO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGFjb3RlLnBhY2t1bWVudChuYW1lLCB7XG4gICAgZnVsbE1ldGFkYXRhOiB0cnVlLFxuICAgIC4uLm5wbXJjLFxuICAgIC4uLihyZWdpc3RyeSA/IHsgcmVnaXN0cnkgfSA6IHt9KSxcbiAgfSk7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSByZXNwb25zZVxuICBjb25zdCBtZXRhZGF0YTogUGFja2FnZU1ldGFkYXRhID0ge1xuICAgIG5hbWU6IHJlc3BvbnNlLm5hbWUsXG4gICAgdGFnczoge30sXG4gICAgdmVyc2lvbnM6IHt9LFxuICB9O1xuXG4gIGlmIChyZXNwb25zZS52ZXJzaW9ucykge1xuICAgIGZvciAoY29uc3QgW3ZlcnNpb24sIG1hbmlmZXN0XSBvZiBPYmplY3QuZW50cmllcyhyZXNwb25zZS52ZXJzaW9ucykpIHtcbiAgICAgIG1ldGFkYXRhLnZlcnNpb25zW3ZlcnNpb25dID0gbm9ybWFsaXplTWFuaWZlc3QobWFuaWZlc3QgYXMgeyBuYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZyB9KTtcbiAgICB9XG4gIH1cblxuICBpZiAocmVzcG9uc2VbJ2Rpc3QtdGFncyddKSB7XG4gICAgLy8gU3RvcmUgdGhpcyBmb3IgdXNlIHdpdGggb3RoZXIgbnBtIHV0aWxpdHkgcGFja2FnZXNcbiAgICBtZXRhZGF0YVsnZGlzdC10YWdzJ10gPSByZXNwb25zZVsnZGlzdC10YWdzJ107XG5cbiAgICBmb3IgKGNvbnN0IFt0YWcsIHZlcnNpb25dIG9mIE9iamVjdC5lbnRyaWVzKHJlc3BvbnNlWydkaXN0LXRhZ3MnXSkpIHtcbiAgICAgIGNvbnN0IG1hbmlmZXN0ID0gbWV0YWRhdGEudmVyc2lvbnNbdmVyc2lvbiBhcyBzdHJpbmddO1xuICAgICAgaWYgKG1hbmlmZXN0KSB7XG4gICAgICAgIG1ldGFkYXRhLnRhZ3NbdGFnXSA9IG1hbmlmZXN0O1xuICAgICAgfSBlbHNlIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBQYWNrYWdlICR7bWV0YWRhdGEubmFtZX0gaGFzIGludmFsaWQgdmVyc2lvbiBtZXRhZGF0YSBmb3IgJyR7dGFnfScuYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1ldGFkYXRhO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hQYWNrYWdlTWFuaWZlc3QoXG4gIG5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgb3B0aW9uczoge1xuICAgIHJlZ2lzdHJ5Pzogc3RyaW5nO1xuICAgIHVzaW5nWWFybj86IGJvb2xlYW47XG4gICAgdmVyYm9zZT86IGJvb2xlYW47XG4gIH0gPSB7fSxcbik6IFByb21pc2U8UGFja2FnZU1hbmlmZXN0PiB7XG4gIGNvbnN0IHsgdXNpbmdZYXJuID0gZmFsc2UsIHZlcmJvc2UgPSBmYWxzZSwgcmVnaXN0cnkgfSA9IG9wdGlvbnM7XG4gIGVuc3VyZU5wbXJjKGxvZ2dlciwgdXNpbmdZYXJuLCB2ZXJib3NlKTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBhY290ZS5tYW5pZmVzdChuYW1lLCB7XG4gICAgZnVsbE1ldGFkYXRhOiB0cnVlLFxuICAgIC4uLm5wbXJjLFxuICAgIC4uLihyZWdpc3RyeSA/IHsgcmVnaXN0cnkgfSA6IHt9KSxcbiAgfSk7XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZU1hbmlmZXN0KHJlc3BvbnNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5wbVBhY2thZ2VKc29uKFxuICBwYWNrYWdlTmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBvcHRpb25zOiB7XG4gICAgcmVnaXN0cnk/OiBzdHJpbmc7XG4gICAgdXNpbmdZYXJuPzogYm9vbGVhbjtcbiAgICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgfSA9IHt9LFxuKTogUHJvbWlzZTxQYXJ0aWFsPE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4+IHtcbiAgY29uc3QgY2FjaGVkUmVzcG9uc2UgPSBucG1QYWNrYWdlSnNvbkNhY2hlLmdldChwYWNrYWdlTmFtZSk7XG4gIGlmIChjYWNoZWRSZXNwb25zZSkge1xuICAgIHJldHVybiBjYWNoZWRSZXNwb25zZTtcbiAgfVxuXG4gIGNvbnN0IHsgdXNpbmdZYXJuID0gZmFsc2UsIHZlcmJvc2UgPSBmYWxzZSwgcmVnaXN0cnkgfSA9IG9wdGlvbnM7XG4gIGVuc3VyZU5wbXJjKGxvZ2dlciwgdXNpbmdZYXJuLCB2ZXJib3NlKTtcblxuICBjb25zdCByZXN1bHRQcm9taXNlOiBQcm9taXNlPE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4gPSBwYWNvdGUucGFja3VtZW50KHBhY2thZ2VOYW1lLCB7XG4gICAgZnVsbE1ldGFkYXRhOiB0cnVlLFxuICAgIC4uLm5wbXJjLFxuICAgIC4uLihyZWdpc3RyeSA/IHsgcmVnaXN0cnkgfSA6IHt9KSxcbiAgfSk7XG5cbiAgLy8gVE9ETzogZmluZCBzb21lIHdheSB0byB0ZXN0IHRoaXNcbiAgY29uc3QgcmVzcG9uc2UgPSByZXN1bHRQcm9taXNlLmNhdGNoKChlcnIpID0+IHtcbiAgICBsb2dnZXIud2FybihlcnIubWVzc2FnZSB8fCBlcnIpO1xuXG4gICAgcmV0dXJuIHsgcmVxdWVzdGVkTmFtZTogcGFja2FnZU5hbWUgfTtcbiAgfSk7XG5cbiAgbnBtUGFja2FnZUpzb25DYWNoZS5zZXQocGFja2FnZU5hbWUsIHJlc3BvbnNlKTtcblxuICByZXR1cm4gcmVzcG9uc2U7XG59XG4iXX0=