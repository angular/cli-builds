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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tZXRhZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvcGFja2FnZS1tZXRhZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0gsNERBQThDO0FBQzlDLDJCQUE4QztBQUM5Qyx5Q0FBMkI7QUFDM0IsMkJBQTZCO0FBQzdCLCtDQUFpQztBQUNqQywyQ0FBNkI7QUFHN0IsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBc0QsQ0FBQztBQStEMUYsSUFBSSxLQUE0QixDQUFDO0FBRWpDLFNBQVMsV0FBVyxDQUFDLE1BQXlCLEVBQUUsU0FBa0IsRUFBRSxPQUFnQjtJQUNsRixJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ1YsSUFBSTtZQUNGLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM3QztRQUFDLFdBQU0sR0FBRTtRQUVWLElBQUksU0FBUyxFQUFFO1lBQ2IsSUFBSTtnQkFDRixLQUFLLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUM7YUFDN0Q7WUFBQyxXQUFNLEdBQUU7U0FDWDtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUNsQixNQUF5QixFQUN6QixJQUFJLEdBQUcsS0FBSyxFQUNaLGNBQWMsR0FBRyxLQUFLO0lBRXRCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQy9DLE1BQU0sV0FBVyxHQUFHLEdBQUcsR0FBRyxZ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QUM7QUFDbEIsQ0FBQztBQWpDRCw4Q0FpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbG9nZ2luZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIGxvY2tmaWxlIGZyb20gJ0B5YXJucGtnL2xvY2tmaWxlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIGluaSBmcm9tICdpbmknO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhY290ZSBmcm9tICdwYWNvdGUnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzIH0gZnJvbSAnLi9wYWNrYWdlLWpzb24nO1xuXG5jb25zdCBucG1QYWNrYWdlSnNvbkNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFByb21pc2U8UGFydGlhbDxOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24+Pj4oKTtcblxuZXhwb3J0IGludGVyZmFjZSBOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHJlcXVlc3RlZE5hbWU6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcblxuICAnZGlzdC10YWdzJzoge1xuICAgIFtuYW1lOiBzdHJpbmddOiBzdHJpbmc7XG4gIH07XG4gIHZlcnNpb25zOiB7XG4gICAgW3ZlcnNpb246IHN0cmluZ106IEpzb25TY2hlbWFGb3JOcG1QYWNrYWdlSnNvbkZpbGVzO1xuICB9O1xuICB0aW1lOiB7XG4gICAgbW9kaWZpZWQ6IHN0cmluZztcbiAgICBjcmVhdGVkOiBzdHJpbmc7XG5cbiAgICBbdmVyc2lvbjogc3RyaW5nXTogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBOZ0FkZFNhdmVEZXBlZGVuY3kgPSAnZGVwZW5kZW5jaWVzJyB8ICdkZXZEZXBlbmRlbmNpZXMnIHwgYm9vbGVhbjtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSWRlbnRpZmllciB7XG4gIHR5cGU6ICdnaXQnIHwgJ3RhZycgfCAndmVyc2lvbicgfCAncmFuZ2UnIHwgJ2ZpbGUnIHwgJ2RpcmVjdG9yeScgfCAncmVtb3RlJztcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nIHwgbnVsbDtcbiAgcmVnaXN0cnk6IGJvb2xlYW47XG4gIHJhdzogc3RyaW5nO1xuICBmZXRjaFNwZWM6IHN0cmluZztcbiAgcmF3U3BlYzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VNYW5pZmVzdCB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBsaWNlbnNlPzogc3RyaW5nO1xuICBwcml2YXRlPzogYm9vbGVhbjtcbiAgZGVwcmVjYXRlZD86IGJvb2xlYW47XG4gIGRlcGVuZGVuY2llczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgZGV2RGVwZW5kZW5jaWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBwZWVyRGVwZW5kZW5jaWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBvcHRpb25hbERlcGVuZGVuY2llczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgJ25nLWFkZCc/OiB7XG4gICAgc2F2ZT86IE5nQWRkU2F2ZURlcGVkZW5jeTtcbiAgfTtcbiAgJ25nLXVwZGF0ZSc/OiB7XG4gICAgbWlncmF0aW9uczogc3RyaW5nO1xuICAgIHBhY2thZ2VHcm91cDogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlTWV0YWRhdGEge1xuICBuYW1lOiBzdHJpbmc7XG4gIHRhZ3M6IHsgW3RhZzogc3RyaW5nXTogUGFja2FnZU1hbmlmZXN0IHwgdW5kZWZpbmVkIH07XG4gIHZlcnNpb25zOiBSZWNvcmQ8c3RyaW5nLCBQYWNrYWdlTWFuaWZlc3Q+O1xuICAnZGlzdC10YWdzJz86IHVua25vd247XG59XG5cbmludGVyZmFjZSBQYWNrYWdlTWFuYWdlck9wdGlvbnMgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIGZvcmNlQXV0aD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufVxuXG5sZXQgbnBtcmM6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucztcblxuZnVuY3Rpb24gZW5zdXJlTnBtcmMobG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSwgdXNpbmdZYXJuOiBib29sZWFuLCB2ZXJib3NlOiBib29sZWFuKTogdm9pZCB7XG4gIGlmICghbnBtcmMpIHtcbiAgICB0cnkge1xuICAgICAgbnBtcmMgPSByZWFkT3B0aW9ucyhsb2dnZXIsIGZhbHNlLCB2ZXJib3NlKTtcbiAgICB9IGNhdGNoIHt9XG5cbiAgICBpZiAodXNpbmdZYXJuKSB7XG4gICAgICB0cnkge1xuICAgICAgICBucG1yYyA9IHsgLi4ubnBtcmMsIC4uLnJlYWRPcHRpb25zKGxvZ2dlciwgdHJ1ZSwgdmVyYm9zZSkgfTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVhZE9wdGlvbnMoXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIHlhcm4gPSBmYWxzZSxcbiAgc2hvd1BvdGVudGlhbHMgPSBmYWxzZSxcbik6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGJhc2VGaWxlbmFtZSA9IHlhcm4gPyAneWFybnJjJyA6ICducG1yYyc7XG4gIGNvbnN0IGRvdEZpbGVuYW1lID0gJy4nICsgYmFzZUZpbGVuYW1lO1xuXG4gIGxldCBnbG9iYWxQcmVmaXg6IHN0cmluZztcbiAgaWYgKHByb2Nlc3MuZW52LlBSRUZJWCkge1xuICAgIGdsb2JhbFByZWZpeCA9IHByb2Nlc3MuZW52LlBSRUZJWDtcbiAgfSBlbHNlIHtcbiAgICBnbG9iYWxQcmVmaXggPSBwYXRoLmRpcm5hbWUocHJvY2Vzcy5leGVjUGF0aCk7XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gIT09ICd3aW4zMicpIHtcbiAgICAgIGdsb2JhbFByZWZpeCA9IHBhdGguZGlybmFtZShnbG9iYWxQcmVmaXgpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGRlZmF1bHRDb25maWdMb2NhdGlvbnMgPSBbXG4gICAgKCF5YXJuICYmIHByb2Nlc3MuZW52Lk5QTV9DT05GSUdfR0xPQkFMQ09ORklHKSB8fCBwYXRoLmpvaW4oZ2xvYmFsUHJlZml4LCAnZXRjJywgYmFzZUZpbGVuYW1lKSxcbiAgICAoIXlhcm4gJiYgcHJvY2Vzcy5lbnYuTlBNX0NPTkZJR19VU0VSQ09ORklHKSB8fCBwYXRoLmpvaW4oaG9tZWRpcigpLCBkb3RGaWxlbmFtZSksXG4gIF07XG5cbiAgY29uc3QgcHJvamVjdENvbmZpZ0xvY2F0aW9uczogc3RyaW5nW10gPSBbcGF0aC5qb2luKGN3ZCwgZG90RmlsZW5hbWUpXTtcbiAgaWYgKHlhcm4pIHtcbiAgICBjb25zdCByb290ID0gcGF0aC5wYXJzZShjd2QpLnJvb3Q7XG4gICAgZm9yIChsZXQgY3VyRGlyID0gcGF0aC5kaXJuYW1lKGN3ZCk7IGN1ckRpciAmJiBjdXJEaXIgIT09IHJvb3Q7IGN1ckRpciA9IHBhdGguZGlybmFtZShjdXJEaXIpKSB7XG4gICAgICBwcm9qZWN0Q29uZmlnTG9jYXRpb25zLnVuc2hpZnQocGF0aC5qb2luKGN1ckRpciwgZG90RmlsZW5hbWUpKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc2hvd1BvdGVudGlhbHMpIHtcbiAgICBsb2dnZXIuaW5mbyhgTG9jYXRpbmcgcG90ZW50aWFsICR7YmFzZUZpbGVuYW1lfSBmaWxlczpgKTtcbiAgfVxuXG4gIGxldCByY09wdGlvbnM6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyA9IHt9O1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIFsuLi5kZWZhdWx0Q29uZmlnTG9jYXRpb25zLCAuLi5wcm9qZWN0Q29uZmlnTG9jYXRpb25zXSkge1xuICAgIGlmIChleGlzdHNTeW5jKGxvY2F0aW9uKSkge1xuICAgICAgaWYgKHNob3dQb3RlbnRpYWxzKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBUcnlpbmcgJyR7bG9jYXRpb259Jy4uLmZvdW5kLmApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkYXRhID0gcmVhZEZpbGVTeW5jKGxvY2F0aW9uLCAndXRmOCcpO1xuICAgICAgLy8gTm9ybWFsaXplIFJDIG9wdGlvbnMgdGhhdCBhcmUgbmVlZGVkIGJ5ICducG0tcmVnaXN0cnktZmV0Y2gnLlxuICAgICAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vbnBtL25wbS1yZWdpc3RyeS1mZXRjaC9ibG9iL2ViZGRiZTc4YTVmNjcxMThjMWY3YWYyZTAyYzhhMjJiY2FmOWU4NTAvaW5kZXguanMjTDk5LUwxMjZcbiAgICAgIGNvbnN0IHJjQ29uZmlnOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMgPSB5YXJuID8gbG9ja2ZpbGUucGFyc2UoZGF0YSkgOiBpbmkucGFyc2UoZGF0YSk7XG5cbiAgICAgIHJjT3B0aW9ucyA9IG5vcm1hbGl6ZU9wdGlvbnMocmNDb25maWcsIGxvY2F0aW9uLCByY09wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGVudlZhcmlhYmxlc09wdGlvbnM6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyA9IHt9O1xuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwcm9jZXNzLmVudikpIHtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBsZXQgbm9ybWFsaXplZE5hbWUgPSBrZXkudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAobm9ybWFsaXplZE5hbWUuc3RhcnRzV2l0aCgnbnBtX2NvbmZpZ18nKSkge1xuICAgICAgbm9ybWFsaXplZE5hbWUgPSBub3JtYWxpemVkTmFtZS5zdWJzdHJpbmcoMTEpO1xuICAgIH0gZWxzZSBpZiAoeWFybiAmJiBub3JtYWxpemVkTmFtZS5zdGFydHNXaXRoKCd5YXJuXycpKSB7XG4gICAgICBub3JtYWxpemVkTmFtZSA9IG5vcm1hbGl6ZWROYW1lLnN1YnN0cmluZyg1KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgbm9ybWFsaXplZE5hbWUgPSBub3JtYWxpemVkTmFtZS5yZXBsYWNlKC8oPyFeKV8vZywgJy0nKTsgLy8gZG9uJ3QgcmVwbGFjZSBfIGF0IHRoZSBzdGFydCBvZiB0aGUga2V5LnNcbiAgICBlbnZWYXJpYWJsZXNPcHRpb25zW25vcm1hbGl6ZWROYW1lXSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG5vcm1hbGl6ZU9wdGlvbnMoZW52VmFyaWFibGVzT3B0aW9ucywgdW5kZWZpbmVkLCByY09wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVPcHRpb25zKFxuICByYXdPcHRpb25zOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMsXG4gIGxvY2F0aW9uID0gcHJvY2Vzcy5jd2QoKSxcbiAgZXhpc3RpbmdOb3JtYWxpemVkT3B0aW9uczogUGFja2FnZU1hbmFnZXJPcHRpb25zID0ge30sXG4pOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMge1xuICBjb25zdCBvcHRpb25zID0geyAuLi5leGlzdGluZ05vcm1hbGl6ZWRPcHRpb25zIH07XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocmF3T3B0aW9ucykpIHtcbiAgICBsZXQgc3Vic3RpdHV0ZWRWYWx1ZSA9IHZhbHVlO1xuXG4gICAgLy8gU3Vic3RpdHV0ZSBhbnkgZW52aXJvbm1lbnQgdmFyaWFibGUgcmVmZXJlbmNlcy5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgc3Vic3RpdHV0ZWRWYWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1xcJFxceyhbXn1dKylcXH0vLCAoXywgbmFtZSkgPT4gcHJvY2Vzcy5lbnZbbmFtZV0gfHwgJycpO1xuICAgIH1cblxuICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAvLyBVbmxlc3MgYXV0aCBvcHRpb25zIGFyZSBzY29wZSB3aXRoIHRoZSByZWdpc3RyeSB1cmwgaXQgYXBwZWFycyB0aGF0IG5wbS1yZWdpc3RyeS1mZXRjaCBpZ25vcmVzIHRoZW0sXG4gICAgICAvLyBldmVuIHRob3VnaCB0aGV5IGFyZSBkb2N1bWVudGVkLlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25wbS9ucG0tcmVnaXN0cnktZmV0Y2gvYmxvYi84OTU0ZjYxZDhkNzAzZTVlYjdmM2Q5M2M5YjQwNDg4ZjhiMWI2MmFjL1JFQURNRS5tZFxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25wbS9ucG0tcmVnaXN0cnktZmV0Y2gvYmxvYi84OTU0ZjYxZDhkNzAzZTVlYjdmM2Q5M2M5YjQwNDg4ZjhiMWI2MmFjL2F1dGguanMjTDQ1LUw5MVxuICAgICAgY2FzZSAnX2F1dGhUb2tlbic6XG4gICAgICBjYXNlICd0b2tlbic6XG4gICAgICBjYXNlICd1c2VybmFtZSc6XG4gICAgICBjYXNlICdwYXNzd29yZCc6XG4gICAgICBjYXNlICdfYXV0aCc6XG4gICAgICBjYXNlICdhdXRoJzpcbiAgICAgICAgb3B0aW9uc1snZm9yY2VBdXRoJ10gPz89IHt9O1xuICAgICAgICBvcHRpb25zWydmb3JjZUF1dGgnXVtrZXldID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdub3Byb3h5JzpcbiAgICAgIGNhc2UgJ25vLXByb3h5JzpcbiAgICAgICAgb3B0aW9uc1snbm9Qcm94eSddID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtYXhzb2NrZXRzJzpcbiAgICAgICAgb3B0aW9uc1snbWF4U29ja2V0cyddID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdodHRwcy1wcm94eSc6XG4gICAgICBjYXNlICdwcm94eSc6XG4gICAgICAgIG9wdGlvbnNbJ3Byb3h5J10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N0cmljdC1zc2wnOlxuICAgICAgICBvcHRpb25zWydzdHJpY3RTU0wnXSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbG9jYWwtYWRkcmVzcyc6XG4gICAgICAgIG9wdGlvbnNbJ2xvY2FsQWRkcmVzcyddID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjYWZpbGUnOlxuICAgICAgICBpZiAodHlwZW9mIHN1YnN0aXR1dGVkVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgY29uc3QgY2FmaWxlID0gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShsb2NhdGlvbiksIHN1YnN0aXR1dGVkVmFsdWUpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBvcHRpb25zWydjYSddID0gcmVhZEZpbGVTeW5jKGNhZmlsZSwgJ3V0ZjgnKS5yZXBsYWNlKC9cXHI/XFxuL2csICdcXG4nKTtcbiAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBvcHRpb25zW2tleV0gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplTWFuaWZlc3QocmF3TWFuaWZlc3Q6IHsgbmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmcgfSk6IFBhY2thZ2VNYW5pZmVzdCB7XG4gIC8vIFRPRE86IEZ1bGx5IG5vcm1hbGl6ZSBhbmQgc2FuaXRpemVcblxuICByZXR1cm4ge1xuICAgIGRlcGVuZGVuY2llczoge30sXG4gICAgZGV2RGVwZW5kZW5jaWVzOiB7fSxcbiAgICBwZWVyRGVwZW5kZW5jaWVzOiB7fSxcbiAgICBvcHRpb25hbERlcGVuZGVuY2llczoge30sXG4gICAgLi4ucmF3TWFuaWZlc3QsXG4gIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaFBhY2thZ2VNZXRhZGF0YShcbiAgbmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBvcHRpb25zPzoge1xuICAgIHJlZ2lzdHJ5Pzogc3RyaW5nO1xuICAgIHVzaW5nWWFybj86IGJvb2xlYW47XG4gICAgdmVyYm9zZT86IGJvb2xlYW47XG4gIH0sXG4pOiBQcm9taXNlPFBhY2thZ2VNZXRhZGF0YT4ge1xuICBjb25zdCB7IHVzaW5nWWFybiwgdmVyYm9zZSwgcmVnaXN0cnkgfSA9IHtcbiAgICByZWdpc3RyeTogdW5kZWZpbmVkLFxuICAgIHVzaW5nWWFybjogZmFsc2UsXG4gICAgdmVyYm9zZTogZmFsc2UsXG4gICAgLi4ub3B0aW9ucyxcbiAgfTtcblxuICBlbnN1cmVOcG1yYyhsb2dnZXIsIHVzaW5nWWFybiwgdmVyYm9zZSk7XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwYWNvdGUucGFja3VtZW50KG5hbWUsIHtcbiAgICBmdWxsTWV0YWRhdGE6IHRydWUsXG4gICAgLi4ubnBtcmMsXG4gICAgLi4uKHJlZ2lzdHJ5ID8geyByZWdpc3RyeSB9IDoge30pLFxuICB9KTtcblxuICAvLyBOb3JtYWxpemUgdGhlIHJlc3BvbnNlXG4gIGNvbnN0IG1ldGFkYXRhOiBQYWNrYWdlTWV0YWRhdGEgPSB7XG4gICAgbmFtZTogcmVzcG9uc2UubmFtZSxcbiAgICB0YWdzOiB7fSxcbiAgICB2ZXJzaW9uczoge30sXG4gIH07XG5cbiAgaWYgKHJlc3BvbnNlLnZlcnNpb25zKSB7XG4gICAgZm9yIChjb25zdCBbdmVyc2lvbiwgbWFuaWZlc3RdIG9mIE9iamVjdC5lbnRyaWVzKHJlc3BvbnNlLnZlcnNpb25zKSkge1xuICAgICAgbWV0YWRhdGEudmVyc2lvbnNbdmVyc2lvbl0gPSBub3JtYWxpemVNYW5pZmVzdChtYW5pZmVzdCBhcyB7IG5hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nIH0pO1xuICAgIH1cbiAgfVxuXG4gIGlmIChyZXNwb25zZVsnZGlzdC10YWdzJ10pIHtcbiAgICAvLyBTdG9yZSB0aGlzIGZvciB1c2Ugd2l0aCBvdGhlciBucG0gdXRpbGl0eSBwYWNrYWdlc1xuICAgIG1ldGFkYXRhWydkaXN0LXRhZ3MnXSA9IHJlc3BvbnNlWydkaXN0LXRhZ3MnXTtcblxuICAgIGZvciAoY29uc3QgW3RhZywgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMocmVzcG9uc2VbJ2Rpc3QtdGFncyddKSkge1xuICAgICAgY29uc3QgbWFuaWZlc3QgPSBtZXRhZGF0YS52ZXJzaW9uc1t2ZXJzaW9uIGFzIHN0cmluZ107XG4gICAgICBpZiAobWFuaWZlc3QpIHtcbiAgICAgICAgbWV0YWRhdGEudGFnc1t0YWddID0gbWFuaWZlc3Q7XG4gICAgICB9IGVsc2UgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oYFBhY2thZ2UgJHttZXRhZGF0YS5uYW1lfSBoYXMgaW52YWxpZCB2ZXJzaW9uIG1ldGFkYXRhIGZvciAnJHt0YWd9Jy5gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWV0YWRhdGE7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaFBhY2thZ2VNYW5pZmVzdChcbiAgbmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLFxuICBvcHRpb25zOiB7XG4gICAgcmVnaXN0cnk/OiBzdHJpbmc7XG4gICAgdXNpbmdZYXJuPzogYm9vbGVhbjtcbiAgICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgfSA9IHt9LFxuKTogUHJvbWlzZTxQYWNrYWdlTWFuaWZlc3Q+IHtcbiAgY29uc3QgeyB1c2luZ1lhcm4gPSBmYWxzZSwgdmVyYm9zZSA9IGZhbHNlLCByZWdpc3RyeSB9ID0gb3B0aW9ucztcbiAgZW5zdXJlTnBtcmMobG9nZ2VyLCB1c2luZ1lhcm4sIHZlcmJvc2UpO1xuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGFjb3RlLm1hbmlmZXN0KG5hbWUsIHtcbiAgICBmdWxsTWV0YWRhdGE6IHRydWUsXG4gICAgLi4ubnBtcmMsXG4gICAgLi4uKHJlZ2lzdHJ5ID8geyByZWdpc3RyeSB9IDoge30pLFxuICB9KTtcblxuICByZXR1cm4gbm9ybWFsaXplTWFuaWZlc3QocmVzcG9uc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TnBtUGFja2FnZUpzb24oXG4gIHBhY2thZ2VOYW1lOiBzdHJpbmcsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG9wdGlvbnM6IHtcbiAgICByZWdpc3RyeT86IHN0cmluZztcbiAgICB1c2luZ1lhcm4/OiBib29sZWFuO1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xuICB9ID0ge30sXG4pOiBQcm9taXNlPFBhcnRpYWw8TnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uPj4ge1xuICBjb25zdCBjYWNoZWRSZXNwb25zZSA9IG5wbVBhY2thZ2VKc29uQ2FjaGUuZ2V0KHBhY2thZ2VOYW1lKTtcbiAgaWYgKGNhY2hlZFJlc3BvbnNlKSB7XG4gICAgcmV0dXJuIGNhY2hlZFJlc3BvbnNlO1xuICB9XG5cbiAgY29uc3QgeyB1c2luZ1lhcm4gPSBmYWxzZSwgdmVyYm9zZSA9IGZhbHNlLCByZWdpc3RyeSB9ID0gb3B0aW9ucztcbiAgZW5zdXJlTnBtcmMobG9nZ2VyLCB1c2luZ1lhcm4sIHZlcmJvc2UpO1xuXG4gIGNvbnN0IHJlc3VsdFByb21pc2U6IFByb21pc2U8TnBtUmVwb3NpdG9yeVBhY2thZ2VKc29uPiA9IHBhY290ZS5wYWNrdW1lbnQocGFja2FnZU5hbWUsIHtcbiAgICBmdWxsTWV0YWRhdGE6IHRydWUsXG4gICAgLi4ubnBtcmMsXG4gICAgLi4uKHJlZ2lzdHJ5ID8geyByZWdpc3RyeSB9IDoge30pLFxuICB9KTtcblxuICAvLyBUT0RPOiBmaW5kIHNvbWUgd2F5IHRvIHRlc3QgdGhpc1xuICBjb25zdCByZXNwb25zZSA9IHJlc3VsdFByb21pc2UuY2F0Y2goKGVycikgPT4ge1xuICAgIGxvZ2dlci53YXJuKGVyci5tZXNzYWdlIHx8IGVycik7XG5cbiAgICByZXR1cm4geyByZXF1ZXN0ZWROYW1lOiBwYWNrYWdlTmFtZSB9O1xuICB9KTtcblxuICBucG1QYWNrYWdlSnNvbkNhY2hlLnNldChwYWNrYWdlTmFtZSwgcmVzcG9uc2UpO1xuXG4gIHJldHVybiByZXNwb25zZTtcbn1cbiJdfQ==