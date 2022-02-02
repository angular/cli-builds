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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1tZXRhZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9wYWNrYWdlLW1ldGFkYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCw0REFBOEM7QUFDOUMsMkJBQThDO0FBQzlDLHlDQUEyQjtBQUMzQiwyQkFBNkI7QUFDN0IsK0NBQWlDO0FBQ2pDLDJDQUE2QjtBQUc3QixNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFzRCxDQUFDO0FBK0QxRixJQUFJLEtBQTRCLENBQUM7QUFFakMsU0FBUyxXQUFXLENBQUMsTUFBeUIsRUFBRSxTQUFrQixFQUFFLE9BQWdCO0lBQ2xGLElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDVixJQUFJO1lBQ0YsS0FBSyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQzdDO1FBQUMsV0FBTSxHQUFFO1FBRVYsSUFBSSxTQUFTLEVBQUU7WUFDYixJQUFJO2dCQUNGLEtBQUssR0FBRyxFQUFFLEdBQUcsS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQzthQUM3RDtZQUFDLFdBQU0sR0FBRTtTQUNYO0tBQ0Y7QUFDSCxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQ2xCLE1BQXlCLEVBQ3pCLElBQUksR0FBRyxLQUFLLEVBQ1osY0FBYyxHQUFHLEtBQUs7SUFFdEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDL0MsTUFBTSxXQUFXLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FB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QixDQUFDO0FBakNELDhDQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBsb2dnaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgbG9ja2ZpbGUgZnJvbSAnQHlhcm5wa2cvbG9ja2ZpbGUnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgaW5pIGZyb20gJ2luaSc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGFjb3RlIGZyb20gJ3BhY290ZSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXMgfSBmcm9tICcuL3BhY2thZ2UtanNvbic7XG5cbmNvbnN0IG5wbVBhY2thZ2VKc29uQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgUHJvbWlzZTxQYXJ0aWFsPE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbj4+PigpO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5wbVJlcG9zaXRvcnlQYWNrYWdlSnNvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgcmVxdWVzdGVkTmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuXG4gICdkaXN0LXRhZ3MnOiB7XG4gICAgW25hbWU6IHN0cmluZ106IHN0cmluZztcbiAgfTtcbiAgdmVyc2lvbnM6IHtcbiAgICBbdmVyc2lvbjogc3RyaW5nXTogSnNvblNjaGVtYUZvck5wbVBhY2thZ2VKc29uRmlsZXM7XG4gIH07XG4gIHRpbWU6IHtcbiAgICBtb2RpZmllZDogc3RyaW5nO1xuICAgIGNyZWF0ZWQ6IHN0cmluZztcblxuICAgIFt2ZXJzaW9uOiBzdHJpbmddOiBzdHJpbmc7XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIE5nQWRkU2F2ZURlcGVkZW5jeSA9ICdkZXBlbmRlbmNpZXMnIHwgJ2RldkRlcGVuZGVuY2llcycgfCBib29sZWFuO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJZGVudGlmaWVyIHtcbiAgdHlwZTogJ2dpdCcgfCAndGFnJyB8ICd2ZXJzaW9uJyB8ICdyYW5nZScgfCAnZmlsZScgfCAnZGlyZWN0b3J5JyB8ICdyZW1vdGUnO1xuICBuYW1lOiBzdHJpbmc7XG4gIHNjb3BlOiBzdHJpbmcgfCBudWxsO1xuICByZWdpc3RyeTogYm9vbGVhbjtcbiAgcmF3OiBzdHJpbmc7XG4gIGZldGNoU3BlYzogc3RyaW5nO1xuICByYXdTcGVjOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZU1hbmlmZXN0IHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIGxpY2Vuc2U/OiBzdHJpbmc7XG4gIHByaXZhdGU/OiBib29sZWFuO1xuICBkZXByZWNhdGVkPzogYm9vbGVhbjtcbiAgZGVwZW5kZW5jaWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBkZXZEZXBlbmRlbmNpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIHBlZXJEZXBlbmRlbmNpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIG9wdGlvbmFsRGVwZW5kZW5jaWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICAnbmctYWRkJz86IHtcbiAgICBzYXZlPzogTmdBZGRTYXZlRGVwZWRlbmN5O1xuICB9O1xuICAnbmctdXBkYXRlJz86IHtcbiAgICBtaWdyYXRpb25zOiBzdHJpbmc7XG4gICAgcGFja2FnZUdyb3VwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VNZXRhZGF0YSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdGFnczogeyBbdGFnOiBzdHJpbmddOiBQYWNrYWdlTWFuaWZlc3QgfCB1bmRlZmluZWQgfTtcbiAgdmVyc2lvbnM6IFJlY29yZDxzdHJpbmcsIFBhY2thZ2VNYW5pZmVzdD47XG4gICdkaXN0LXRhZ3MnPzogdW5rbm93bjtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgZm9yY2VBdXRoPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbmxldCBucG1yYzogUGFja2FnZU1hbmFnZXJPcHRpb25zO1xuXG5mdW5jdGlvbiBlbnN1cmVOcG1yYyhsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpLCB1c2luZ1lhcm46IGJvb2xlYW4sIHZlcmJvc2U6IGJvb2xlYW4pOiB2b2lkIHtcbiAgaWYgKCFucG1yYykge1xuICAgIHRyeSB7XG4gICAgICBucG1yYyA9IHJlYWRPcHRpb25zKGxvZ2dlciwgZmFsc2UsIHZlcmJvc2UpO1xuICAgIH0gY2F0Y2gge31cblxuICAgIGlmICh1c2luZ1lhcm4pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5wbXJjID0geyAuLi5ucG1yYywgLi4ucmVhZE9wdGlvbnMobG9nZ2VyLCB0cnVlLCB2ZXJib3NlKSB9O1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkT3B0aW9ucyhcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgeWFybiA9IGZhbHNlLFxuICBzaG93UG90ZW50aWFscyA9IGZhbHNlLFxuKTogUGFja2FnZU1hbmFnZXJPcHRpb25zIHtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgYmFzZUZpbGVuYW1lID0geWFybiA/ICd5YXJucmMnIDogJ25wbXJjJztcbiAgY29uc3QgZG90RmlsZW5hbWUgPSAnLicgKyBiYXNlRmlsZW5hbWU7XG5cbiAgbGV0IGdsb2JhbFByZWZpeDogc3RyaW5nO1xuICBpZiAocHJvY2Vzcy5lbnYuUFJFRklYKSB7XG4gICAgZ2xvYmFsUHJlZml4ID0gcHJvY2Vzcy5lbnYuUFJFRklYO1xuICB9IGVsc2Uge1xuICAgIGdsb2JhbFByZWZpeCA9IHBhdGguZGlybmFtZShwcm9jZXNzLmV4ZWNQYXRoKTtcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gJ3dpbjMyJykge1xuICAgICAgZ2xvYmFsUHJlZml4ID0gcGF0aC5kaXJuYW1lKGdsb2JhbFByZWZpeCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZGVmYXVsdENvbmZpZ0xvY2F0aW9ucyA9IFtcbiAgICAoIXlhcm4gJiYgcHJvY2Vzcy5lbnYuTlBNX0NPTkZJR19HTE9CQUxDT05GSUcpIHx8IHBhdGguam9pbihnbG9iYWxQcmVmaXgsICdldGMnLCBiYXNlRmlsZW5hbWUpLFxuICAgICgheWFybiAmJiBwcm9jZXNzLmVudi5OUE1fQ09ORklHX1VTRVJDT05GSUcpIHx8IHBhdGguam9pbihob21lZGlyKCksIGRvdEZpbGVuYW1lKSxcbiAgXTtcblxuICBjb25zdCBwcm9qZWN0Q29uZmlnTG9jYXRpb25zOiBzdHJpbmdbXSA9IFtwYXRoLmpvaW4oY3dkLCBkb3RGaWxlbmFtZSldO1xuICBpZiAoeWFybikge1xuICAgIGNvbnN0IHJvb3QgPSBwYXRoLnBhcnNlKGN3ZCkucm9vdDtcbiAgICBmb3IgKGxldCBjdXJEaXIgPSBwYXRoLmRpcm5hbWUoY3dkKTsgY3VyRGlyICYmIGN1ckRpciAhPT0gcm9vdDsgY3VyRGlyID0gcGF0aC5kaXJuYW1lKGN1ckRpcikpIHtcbiAgICAgIHByb2plY3RDb25maWdMb2NhdGlvbnMudW5zaGlmdChwYXRoLmpvaW4oY3VyRGlyLCBkb3RGaWxlbmFtZSkpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzaG93UG90ZW50aWFscykge1xuICAgIGxvZ2dlci5pbmZvKGBMb2NhdGluZyBwb3RlbnRpYWwgJHtiYXNlRmlsZW5hbWV9IGZpbGVzOmApO1xuICB9XG5cbiAgbGV0IHJjT3B0aW9uczogUGFja2FnZU1hbmFnZXJPcHRpb25zID0ge307XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2YgWy4uLmRlZmF1bHRDb25maWdMb2NhdGlvbnMsIC4uLnByb2plY3RDb25maWdMb2NhdGlvbnNdKSB7XG4gICAgaWYgKGV4aXN0c1N5bmMobG9jYXRpb24pKSB7XG4gICAgICBpZiAoc2hvd1BvdGVudGlhbHMpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFRyeWluZyAnJHtsb2NhdGlvbn0nLi4uZm91bmQuYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSByZWFkRmlsZVN5bmMobG9jYXRpb24sICd1dGY4Jyk7XG4gICAgICAvLyBOb3JtYWxpemUgUkMgb3B0aW9ucyB0aGF0IGFyZSBuZWVkZWQgYnkgJ25wbS1yZWdpc3RyeS1mZXRjaCcuXG4gICAgICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9ucG0vbnBtLXJlZ2lzdHJ5LWZldGNoL2Jsb2IvZWJkZGJlNzhhNWY2NzExOGMxZjdhZjJlMDJjOGEyMmJjYWY5ZTg1MC9pbmRleC5qcyNMOTktTDEyNlxuICAgICAgY29uc3QgcmNDb25maWc6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyA9IHlhcm4gPyBsb2NrZmlsZS5wYXJzZShkYXRhKSA6IGluaS5wYXJzZShkYXRhKTtcblxuICAgICAgcmNPcHRpb25zID0gbm9ybWFsaXplT3B0aW9ucyhyY0NvbmZpZywgbG9jYXRpb24sIHJjT3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZW52VmFyaWFibGVzT3B0aW9uczogUGFja2FnZU1hbmFnZXJPcHRpb25zID0ge307XG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHByb2Nlc3MuZW52KSkge1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGxldCBub3JtYWxpemVkTmFtZSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChub3JtYWxpemVkTmFtZS5zdGFydHNXaXRoKCducG1fY29uZmlnXycpKSB7XG4gICAgICBub3JtYWxpemVkTmFtZSA9IG5vcm1hbGl6ZWROYW1lLnN1YnN0cmluZygxMSk7XG4gICAgfSBlbHNlIGlmICh5YXJuICYmIG5vcm1hbGl6ZWROYW1lLnN0YXJ0c1dpdGgoJ3lhcm5fJykpIHtcbiAgICAgIG5vcm1hbGl6ZWROYW1lID0gbm9ybWFsaXplZE5hbWUuc3Vic3RyaW5nKDUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBub3JtYWxpemVkTmFtZSA9IG5vcm1hbGl6ZWROYW1lLnJlcGxhY2UoLyg/IV4pXy9nLCAnLScpOyAvLyBkb24ndCByZXBsYWNlIF8gYXQgdGhlIHN0YXJ0IG9mIHRoZSBrZXkuc1xuICAgIGVudlZhcmlhYmxlc09wdGlvbnNbbm9ybWFsaXplZE5hbWVdID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gbm9ybWFsaXplT3B0aW9ucyhlbnZWYXJpYWJsZXNPcHRpb25zLCB1bmRlZmluZWQsIHJjT3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZU9wdGlvbnMoXG4gIHJhd09wdGlvbnM6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyxcbiAgbG9jYXRpb24gPSBwcm9jZXNzLmN3ZCgpLFxuICBleGlzdGluZ05vcm1hbGl6ZWRPcHRpb25zOiBQYWNrYWdlTWFuYWdlck9wdGlvbnMgPSB7fSxcbik6IFBhY2thZ2VNYW5hZ2VyT3B0aW9ucyB7XG4gIGNvbnN0IG9wdGlvbnMgPSB7IC4uLmV4aXN0aW5nTm9ybWFsaXplZE9wdGlvbnMgfTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhyYXdPcHRpb25zKSkge1xuICAgIGxldCBzdWJzdGl0dXRlZFZhbHVlID0gdmFsdWU7XG5cbiAgICAvLyBTdWJzdGl0dXRlIGFueSBlbnZpcm9ubWVudCB2YXJpYWJsZSByZWZlcmVuY2VzLlxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBzdWJzdGl0dXRlZFZhbHVlID0gdmFsdWUucmVwbGFjZSgvXFwkXFx7KFtefV0rKVxcfS8sIChfLCBuYW1lKSA9PiBwcm9jZXNzLmVudltuYW1lXSB8fCAnJyk7XG4gICAgfVxuXG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgIC8vIFVubGVzcyBhdXRoIG9wdGlvbnMgYXJlIHNjb3BlIHdpdGggdGhlIHJlZ2lzdHJ5IHVybCBpdCBhcHBlYXJzIHRoYXQgbnBtLXJlZ2lzdHJ5LWZldGNoIGlnbm9yZXMgdGhlbSxcbiAgICAgIC8vIGV2ZW4gdGhvdWdoIHRoZXkgYXJlIGRvY3VtZW50ZWQuXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbnBtL25wbS1yZWdpc3RyeS1mZXRjaC9ibG9iLzg5NTRmNjFkOGQ3MDNlNWViN2YzZDkzYzliNDA0ODhmOGIxYjYyYWMvUkVBRE1FLm1kXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbnBtL25wbS1yZWdpc3RyeS1mZXRjaC9ibG9iLzg5NTRmNjFkOGQ3MDNlNWViN2YzZDkzYzliNDA0ODhmOGIxYjYyYWMvYXV0aC5qcyNMNDUtTDkxXG4gICAgICBjYXNlICdfYXV0aFRva2VuJzpcbiAgICAgIGNhc2UgJ3Rva2VuJzpcbiAgICAgIGNhc2UgJ3VzZXJuYW1lJzpcbiAgICAgIGNhc2UgJ3Bhc3N3b3JkJzpcbiAgICAgIGNhc2UgJ19hdXRoJzpcbiAgICAgIGNhc2UgJ2F1dGgnOlxuICAgICAgICBvcHRpb25zWydmb3JjZUF1dGgnXSA/Pz0ge307XG4gICAgICAgIG9wdGlvbnNbJ2ZvcmNlQXV0aCddW2tleV0gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ25vcHJveHknOlxuICAgICAgY2FzZSAnbm8tcHJveHknOlxuICAgICAgICBvcHRpb25zWydub1Byb3h5J10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ21heHNvY2tldHMnOlxuICAgICAgICBvcHRpb25zWydtYXhTb2NrZXRzJ10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2h0dHBzLXByb3h5JzpcbiAgICAgIGNhc2UgJ3Byb3h5JzpcbiAgICAgICAgb3B0aW9uc1sncHJveHknXSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3RyaWN0LXNzbCc6XG4gICAgICAgIG9wdGlvbnNbJ3N0cmljdFNTTCddID0gc3Vic3RpdHV0ZWRWYWx1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdsb2NhbC1hZGRyZXNzJzpcbiAgICAgICAgb3B0aW9uc1snbG9jYWxBZGRyZXNzJ10gPSBzdWJzdGl0dXRlZFZhbHVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NhZmlsZSc6XG4gICAgICAgIGlmICh0eXBlb2Ygc3Vic3RpdHV0ZWRWYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBjb25zdCBjYWZpbGUgPSBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGxvY2F0aW9uKSwgc3Vic3RpdHV0ZWRWYWx1ZSk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9wdGlvbnNbJ2NhJ10gPSByZWFkRmlsZVN5bmMoY2FmaWxlLCAndXRmOCcpLnJlcGxhY2UoL1xccj9cXG4vZywgJ1xcbicpO1xuICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG9wdGlvbnNba2V5XSA9IHN1YnN0aXR1dGVkVmFsdWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVNYW5pZmVzdChyYXdNYW5pZmVzdDogeyBuYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZyB9KTogUGFja2FnZU1hbmlmZXN0IHtcbiAgLy8gVE9ETzogRnVsbHkgbm9ybWFsaXplIGFuZCBzYW5pdGl6ZVxuXG4gIHJldHVybiB7XG4gICAgZGVwZW5kZW5jaWVzOiB7fSxcbiAgICBkZXZEZXBlbmRlbmNpZXM6IHt9LFxuICAgIHBlZXJEZXBlbmRlbmNpZXM6IHt9LFxuICAgIG9wdGlvbmFsRGVwZW5kZW5jaWVzOiB7fSxcbiAgICAuLi5yYXdNYW5pZmVzdCxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoUGFja2FnZU1ldGFkYXRhKFxuICBuYW1lOiBzdHJpbmcsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG9wdGlvbnM/OiB7XG4gICAgcmVnaXN0cnk/OiBzdHJpbmc7XG4gICAgdXNpbmdZYXJuPzogYm9vbGVhbjtcbiAgICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgfSxcbik6IFByb21pc2U8UGFja2FnZU1ldGFkYXRhPiB7XG4gIGNvbnN0IHsgdXNpbmdZYXJuLCB2ZXJib3NlLCByZWdpc3RyeSB9ID0ge1xuICAgIHJlZ2lzdHJ5OiB1bmRlZmluZWQsXG4gICAgdXNpbmdZYXJuOiBmYWxzZSxcbiAgICB2ZXJib3NlOiBmYWxzZSxcbiAgICAuLi5vcHRpb25zLFxuICB9O1xuXG4gIGVuc3VyZU5wbXJjKGxvZ2dlciwgdXNpbmdZYXJuLCB2ZXJib3NlKTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBhY290ZS5wYWNrdW1lbnQobmFtZSwge1xuICAgIGZ1bGxNZXRhZGF0YTogdHJ1ZSxcbiAgICAuLi5ucG1yYyxcbiAgICAuLi4ocmVnaXN0cnkgPyB7IHJlZ2lzdHJ5IH0gOiB7fSksXG4gIH0pO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcmVzcG9uc2VcbiAgY29uc3QgbWV0YWRhdGE6IFBhY2thZ2VNZXRhZGF0YSA9IHtcbiAgICBuYW1lOiByZXNwb25zZS5uYW1lLFxuICAgIHRhZ3M6IHt9LFxuICAgIHZlcnNpb25zOiB7fSxcbiAgfTtcblxuICBpZiAocmVzcG9uc2UudmVyc2lvbnMpIHtcbiAgICBmb3IgKGNvbnN0IFt2ZXJzaW9uLCBtYW5pZmVzdF0gb2YgT2JqZWN0LmVudHJpZXMocmVzcG9uc2UudmVyc2lvbnMpKSB7XG4gICAgICBtZXRhZGF0YS52ZXJzaW9uc1t2ZXJzaW9uXSA9IG5vcm1hbGl6ZU1hbmlmZXN0KG1hbmlmZXN0IGFzIHsgbmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmcgfSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHJlc3BvbnNlWydkaXN0LXRhZ3MnXSkge1xuICAgIC8vIFN0b3JlIHRoaXMgZm9yIHVzZSB3aXRoIG90aGVyIG5wbSB1dGlsaXR5IHBhY2thZ2VzXG4gICAgbWV0YWRhdGFbJ2Rpc3QtdGFncyddID0gcmVzcG9uc2VbJ2Rpc3QtdGFncyddO1xuXG4gICAgZm9yIChjb25zdCBbdGFnLCB2ZXJzaW9uXSBvZiBPYmplY3QuZW50cmllcyhyZXNwb25zZVsnZGlzdC10YWdzJ10pKSB7XG4gICAgICBjb25zdCBtYW5pZmVzdCA9IG1ldGFkYXRhLnZlcnNpb25zW3ZlcnNpb24gYXMgc3RyaW5nXTtcbiAgICAgIGlmIChtYW5pZmVzdCkge1xuICAgICAgICBtZXRhZGF0YS50YWdzW3RhZ10gPSBtYW5pZmVzdDtcbiAgICAgIH0gZWxzZSBpZiAodmVyYm9zZSkge1xuICAgICAgICBsb2dnZXIud2FybihgUGFja2FnZSAke21ldGFkYXRhLm5hbWV9IGhhcyBpbnZhbGlkIHZlcnNpb24gbWV0YWRhdGEgZm9yICcke3RhZ30nLmApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXRhZGF0YTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoUGFja2FnZU1hbmlmZXN0KFxuICBuYW1lOiBzdHJpbmcsXG4gIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4gIG9wdGlvbnM6IHtcbiAgICByZWdpc3RyeT86IHN0cmluZztcbiAgICB1c2luZ1lhcm4/OiBib29sZWFuO1xuICAgIHZlcmJvc2U/OiBib29sZWFuO1xuICB9ID0ge30sXG4pOiBQcm9taXNlPFBhY2thZ2VNYW5pZmVzdD4ge1xuICBjb25zdCB7IHVzaW5nWWFybiA9IGZhbHNlLCB2ZXJib3NlID0gZmFsc2UsIHJlZ2lzdHJ5IH0gPSBvcHRpb25zO1xuICBlbnN1cmVOcG1yYyhsb2dnZXIsIHVzaW5nWWFybiwgdmVyYm9zZSk7XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwYWNvdGUubWFuaWZlc3QobmFtZSwge1xuICAgIGZ1bGxNZXRhZGF0YTogdHJ1ZSxcbiAgICAuLi5ucG1yYyxcbiAgICAuLi4ocmVnaXN0cnkgPyB7IHJlZ2lzdHJ5IH0gOiB7fSksXG4gIH0pO1xuXG4gIHJldHVybiBub3JtYWxpemVNYW5pZmVzdChyZXNwb25zZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROcG1QYWNrYWdlSnNvbihcbiAgcGFja2FnZU5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbiAgb3B0aW9uczoge1xuICAgIHJlZ2lzdHJ5Pzogc3RyaW5nO1xuICAgIHVzaW5nWWFybj86IGJvb2xlYW47XG4gICAgdmVyYm9zZT86IGJvb2xlYW47XG4gIH0gPSB7fSxcbik6IFByb21pc2U8UGFydGlhbDxOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24+PiB7XG4gIGNvbnN0IGNhY2hlZFJlc3BvbnNlID0gbnBtUGFja2FnZUpzb25DYWNoZS5nZXQocGFja2FnZU5hbWUpO1xuICBpZiAoY2FjaGVkUmVzcG9uc2UpIHtcbiAgICByZXR1cm4gY2FjaGVkUmVzcG9uc2U7XG4gIH1cblxuICBjb25zdCB7IHVzaW5nWWFybiA9IGZhbHNlLCB2ZXJib3NlID0gZmFsc2UsIHJlZ2lzdHJ5IH0gPSBvcHRpb25zO1xuICBlbnN1cmVOcG1yYyhsb2dnZXIsIHVzaW5nWWFybiwgdmVyYm9zZSk7XG5cbiAgY29uc3QgcmVzdWx0UHJvbWlzZTogUHJvbWlzZTxOcG1SZXBvc2l0b3J5UGFja2FnZUpzb24+ID0gcGFjb3RlLnBhY2t1bWVudChwYWNrYWdlTmFtZSwge1xuICAgIGZ1bGxNZXRhZGF0YTogdHJ1ZSxcbiAgICAuLi5ucG1yYyxcbiAgICAuLi4ocmVnaXN0cnkgPyB7IHJlZ2lzdHJ5IH0gOiB7fSksXG4gIH0pO1xuXG4gIC8vIFRPRE86IGZpbmQgc29tZSB3YXkgdG8gdGVzdCB0aGlzXG4gIGNvbnN0IHJlc3BvbnNlID0gcmVzdWx0UHJvbWlzZS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgbG9nZ2VyLndhcm4oZXJyLm1lc3NhZ2UgfHwgZXJyKTtcblxuICAgIHJldHVybiB7IHJlcXVlc3RlZE5hbWU6IHBhY2thZ2VOYW1lIH07XG4gIH0pO1xuXG4gIG5wbVBhY2thZ2VKc29uQ2FjaGUuc2V0KHBhY2thZ2VOYW1lLCByZXNwb25zZSk7XG5cbiAgcmV0dXJuIHJlc3BvbnNlO1xufVxuIl19