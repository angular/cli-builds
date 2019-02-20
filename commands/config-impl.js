"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const fs_1 = require("fs");
const command_1 = require("../models/command");
const interface_1 = require("../models/interface");
const config_1 = require("../utilities/config");
const validCliPaths = new Map([
    ['cli.warnings.versionMismatch', 'boolean'],
    ['cli.defaultCollection', 'string'],
    ['cli.packageManager', 'string'],
]);
/**
 * Splits a JSON path string into fragments. Fragments can be used to get the value referenced
 * by the path. For example, a path of "a[3].foo.bar[2]" would give you a fragment array of
 * ["a", 3, "foo", "bar", 2].
 * @param path The JSON string to parse.
 * @returns {string[]} The fragments for the string.
 * @private
 */
function parseJsonPath(path) {
    const fragments = (path || '').split(/\./g);
    const result = [];
    while (fragments.length > 0) {
        const fragment = fragments.shift();
        if (fragment == undefined) {
            break;
        }
        const match = fragment.match(/([^\[]+)((\[.*\])*)/);
        if (!match) {
            throw new Error('Invalid JSON path.');
        }
        result.push(match[1]);
        if (match[2]) {
            const indices = match[2].slice(1, -1).split('][');
            result.push(...indices);
        }
    }
    return result.filter(fragment => !!fragment);
}
function getValueFromPath(root, path) {
    const fragments = parseJsonPath(path);
    try {
        return fragments.reduce((value, current) => {
            if (value == undefined || typeof value != 'object') {
                return undefined;
            }
            else if (typeof current == 'string' && !Array.isArray(value)) {
                return value[current];
            }
            else if (typeof current == 'number' && Array.isArray(value)) {
                return value[current];
            }
            else {
                return undefined;
            }
        }, root);
    }
    catch (_a) {
        return undefined;
    }
}
function setValueFromPath(root, path, newValue) {
    const fragments = parseJsonPath(path);
    try {
        return fragments.reduce((value, current, index) => {
            if (value == undefined || typeof value != 'object') {
                return undefined;
            }
            else if (typeof current == 'string' && !Array.isArray(value)) {
                if (index === fragments.length - 1) {
                    value[current] = newValue;
                }
                else if (value[current] == undefined) {
                    if (typeof fragments[index + 1] == 'number') {
                        value[current] = [];
                    }
                    else if (typeof fragments[index + 1] == 'string') {
                        value[current] = {};
                    }
                }
                return value[current];
            }
            else if (typeof current == 'number' && Array.isArray(value)) {
                if (index === fragments.length - 1) {
                    value[current] = newValue;
                }
                else if (value[current] == undefined) {
                    if (typeof fragments[index + 1] == 'number') {
                        value[current] = [];
                    }
                    else if (typeof fragments[index + 1] == 'string') {
                        value[current] = {};
                    }
                }
                return value[current];
            }
            else {
                return undefined;
            }
        }, root);
    }
    catch (_a) {
        return undefined;
    }
}
function normalizeValue(value, path) {
    const cliOptionType = validCliPaths.get(path);
    if (cliOptionType) {
        switch (cliOptionType) {
            case 'boolean':
                if (('' + value).trim() === 'true') {
                    return true;
                }
                else if (('' + value).trim() === 'false') {
                    return false;
                }
                break;
            case 'number':
                const numberValue = Number(value);
                if (!Number.isFinite(numberValue)) {
                    return numberValue;
                }
                break;
            case 'string':
                return value;
        }
        throw new Error(`Invalid value type; expected a ${cliOptionType}.`);
    }
    if (typeof value === 'string') {
        try {
            return core_1.parseJson(value, core_1.JsonParseMode.Loose);
        }
        catch (e) {
            if (e instanceof core_1.InvalidJsonCharacterException && !value.startsWith('{')) {
                return value;
            }
            else {
                throw e;
            }
        }
    }
    return value;
}
class ConfigCommand extends command_1.Command {
    async run(options) {
        const level = options.global ? 'global' : 'local';
        if (!options.global) {
            await this.validateScope(interface_1.CommandScope.InProject);
        }
        let config = config_1.getWorkspace(level);
        if (options.global && !config) {
            try {
                if (config_1.migrateLegacyGlobalConfig()) {
                    config =
                        config_1.getWorkspace(level);
                    this.logger.info(core_1.tags.oneLine `
            We found a global configuration that was used in Angular CLI 1.
            It has been automatically migrated.`);
                }
            }
            catch (_a) { }
        }
        if (options.value == undefined) {
            if (!config) {
                this.logger.error('No config found.');
                return 1;
            }
            return this.get(config._workspace, options);
        }
        else {
            return this.set(options);
        }
    }
    get(config, options) {
        let value;
        if (options.jsonPath) {
            if (options.jsonPath === 'cli.warnings.typescriptMismatch') {
                // NOTE: Remove this in 9.0.
                this.logger.warn('The "typescriptMismatch" warning has been removed in 8.0.');
                // Since there is no actual warning, this value is always false.
                this.logger.info('false');
                return 0;
            }
            value = getValueFromPath(config, options.jsonPath);
        }
        else {
            value = config;
        }
        if (value === undefined) {
            this.logger.error('Value cannot be found.');
            return 1;
        }
        else if (typeof value == 'object') {
            this.logger.info(JSON.stringify(value, null, 2));
        }
        else {
            this.logger.info(value.toString());
        }
        return 0;
    }
    set(options) {
        if (!options.jsonPath || !options.jsonPath.trim()) {
            throw new Error('Invalid Path.');
        }
        if (options.jsonPath === 'cli.warnings.typescriptMismatch') {
            // NOTE: Remove this in 9.0.
            this.logger.warn('The "typescriptMismatch" warning has been removed in 8.0.');
            return 0;
        }
        if (options.global
            && !options.jsonPath.startsWith('schematics.')
            && !validCliPaths.has(options.jsonPath)) {
            throw new Error('Invalid Path.');
        }
        const [config, configPath] = config_1.getWorkspaceRaw(options.global ? 'global' : 'local');
        if (!config || !configPath) {
            this.logger.error('Confguration file cannot be found.');
            return 1;
        }
        // TODO: Modify & save without destroying comments
        const configValue = config.value;
        const value = normalizeValue(options.value || '', options.jsonPath);
        const result = setValueFromPath(configValue, options.jsonPath, value);
        if (result === undefined) {
            this.logger.error('Value cannot be found.');
            return 1;
        }
        try {
            config_1.validateWorkspace(configValue);
        }
        catch (error) {
            this.logger.fatal(error.message);
            return 1;
        }
        const output = JSON.stringify(configValue, null, 2);
        fs_1.writeFileSync(configPath, output);
        return 0;
    }
}
exports.ConfigCommand = ConfigCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2NvbmZpZy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBUzhCO0FBQzlCLDJCQUFtQztBQUNuQywrQ0FBNEM7QUFDNUMsbURBQThEO0FBQzlELGdEQUs2QjtBQUk3QixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUM1QixDQUFDLDhCQUE4QixFQUFFLFNBQVMsQ0FBQztJQUMzQyxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQztJQUNuQyxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQztDQUNqQyxDQUFDLENBQUM7QUFFSDs7Ozs7OztHQU9HO0FBQ0gsU0FBUyxhQUFhLENBQUMsSUFBWTtJQUNqQyxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBRTVCLE9BQU8sU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDM0IsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25DLElBQUksUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUN6QixNQUFNO1NBQ1A7UUFFRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztTQUN2QztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDWixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7U0FDekI7S0FDRjtJQUVELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FDdkIsSUFBTyxFQUNQLElBQVk7SUFFWixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdEMsSUFBSTtRQUNGLE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQWdCLEVBQUUsT0FBd0IsRUFBRSxFQUFFO1lBQ3JFLElBQUksS0FBSyxJQUFJLFNBQVMsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7Z0JBQ2xELE9BQU8sU0FBUyxDQUFDO2FBQ2xCO2lCQUFNLElBQUksT0FBTyxPQUFPLElBQUksUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDOUQsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdkI7aUJBQU0sSUFBSSxPQUFPLE9BQU8sSUFBSSxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDN0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdkI7aUJBQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7UUFDSCxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDVjtJQUFDLFdBQU07UUFDTixPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUN2QixJQUFPLEVBQ1AsSUFBWSxFQUNaLFFBQW1CO0lBRW5CLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV0QyxJQUFJO1FBQ0YsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBZ0IsRUFBRSxPQUF3QixFQUFFLEtBQWEsRUFBRSxFQUFFO1lBQ3BGLElBQUksS0FBSyxJQUFJLFNBQVMsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7Z0JBQ2xELE9BQU8sU0FBUyxDQUFDO2FBQ2xCO2lCQUFNLElBQUksT0FBTyxPQUFPLElBQUksUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDOUQsSUFBSSxLQUFLLEtBQUssU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQ2xDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxRQUFRLENBQUM7aUJBQzNCO3FCQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFNBQVMsRUFBRTtvQkFDdEMsSUFBSSxPQUFPLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxFQUFFO3dCQUMzQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO3FCQUNyQjt5QkFBTSxJQUFJLE9BQU8sU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxRQUFRLEVBQUU7d0JBQ2xELEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7cUJBQ3JCO2lCQUNGO2dCQUVELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3ZCO2lCQUFNLElBQUksT0FBTyxPQUFPLElBQUksUUFBUSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzdELElBQUksS0FBSyxLQUFLLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUNsQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDO2lCQUMzQjtxQkFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxTQUFTLEVBQUU7b0JBQ3RDLElBQUksT0FBTyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLFFBQVEsRUFBRTt3QkFDM0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztxQkFDckI7eUJBQU0sSUFBSSxPQUFPLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxFQUFFO3dCQUNsRCxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO3FCQUNyQjtpQkFDRjtnQkFFRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUN2QjtpQkFBTTtnQkFDTCxPQUFPLFNBQVMsQ0FBQzthQUNsQjtRQUNILENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNWO0lBQUMsV0FBTTtRQUNOLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0FBQ0gsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLEtBQStCLEVBQUUsSUFBWTtJQUNuRSxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlDLElBQUksYUFBYSxFQUFFO1FBQ2pCLFFBQVEsYUFBYSxFQUFFO1lBQ3JCLEtBQUssU0FBUztnQkFDWixJQUFJLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLE1BQU0sRUFBRTtvQkFDbEMsT0FBTyxJQUFJLENBQUM7aUJBQ2I7cUJBQU0sSUFBSSxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxPQUFPLEVBQUU7b0JBQzFDLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELE1BQU07WUFDUixLQUFLLFFBQVE7Z0JBQ1gsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRTtvQkFDakMsT0FBTyxXQUFXLENBQUM7aUJBQ3BCO2dCQUNELE1BQU07WUFDUixLQUFLLFFBQVE7Z0JBQ1gsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO0tBQ3JFO0lBRUQsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7UUFDN0IsSUFBSTtZQUNGLE9BQU8sZ0JBQVMsQ0FBQyxLQUFLLEVBQUUsb0JBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM5QztRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsSUFBSSxDQUFDLFlBQVksb0NBQTZCLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUN4RSxPQUFPLEtBQUssQ0FBQzthQUNkO2lCQUFNO2dCQUNMLE1BQU0sQ0FBQyxDQUFDO2FBQ1Q7U0FDRjtLQUNGO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBYSxhQUFjLFNBQVEsaUJBQTRCO0lBQ3RELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBd0M7UUFDdkQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFFbEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDbkIsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLHdCQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDbEQ7UUFFRCxJQUFJLE1BQU0sR0FDUCxxQkFBWSxDQUFDLEtBQUssQ0FBa0UsQ0FBQztRQUV4RixJQUFJLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDN0IsSUFBSTtnQkFDRixJQUFJLGtDQUF5QixFQUFFLEVBQUU7b0JBQy9CLE1BQU07d0JBQ0gscUJBQVksQ0FBQyxLQUFLLENBQWtFLENBQUM7b0JBQ3hGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7O2dEQUVTLENBQUMsQ0FBQztpQkFDekM7YUFDRjtZQUFDLFdBQU0sR0FBRTtTQUNYO1FBRUQsSUFBSSxPQUFPLENBQUMsS0FBSyxJQUFJLFNBQVMsRUFBRTtZQUM5QixJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBRXRDLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7WUFFRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM3QzthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQzFCO0lBQ0gsQ0FBQztJQUVPLEdBQUcsQ0FBQyxNQUE4QyxFQUFFLE9BQTRCO1FBQ3RGLElBQUksS0FBSyxDQUFDO1FBQ1YsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3BCLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxpQ0FBaUMsRUFBRTtnQkFDMUQsNEJBQTRCO2dCQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQywyREFBMkQsQ0FBQyxDQUFDO2dCQUM5RSxnRUFBZ0U7Z0JBQ2hFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUUxQixPQUFPLENBQUMsQ0FBQzthQUNWO1lBRUQsS0FBSyxHQUFHLGdCQUFnQixDQUFDLE1BQTBCLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3hFO2FBQU07WUFDTCxLQUFLLEdBQUcsTUFBTSxDQUFDO1NBQ2hCO1FBRUQsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFFNUMsT0FBTyxDQUFDLENBQUM7U0FDVjthQUFNLElBQUksT0FBTyxLQUFLLElBQUksUUFBUSxFQUFFO1lBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2xEO2FBQU07WUFDTCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztTQUNwQztRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVPLEdBQUcsQ0FBQyxPQUE0QjtRQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDakQsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUNsQztRQUVELElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxpQ0FBaUMsRUFBRTtZQUMxRCw0QkFBNEI7WUFDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsMkRBQTJELENBQUMsQ0FBQztZQUU5RSxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSSxPQUFPLENBQUMsTUFBTTtlQUNYLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO2VBQzNDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUNsQztRQUVELE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEdBQUcsd0JBQWUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztZQUV4RCxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsa0RBQWtEO1FBQ2xELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFFakMsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRSxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV0RSxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUU1QyxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSTtZQUNGLDBCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQ2hDO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFakMsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxrQkFBYSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsQyxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FFRjtBQXJIRCxzQ0FxSEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIEludmFsaWRKc29uQ2hhcmFjdGVyRXhjZXB0aW9uLFxuICBKc29uQXJyYXksXG4gIEpzb25PYmplY3QsXG4gIEpzb25QYXJzZU1vZGUsXG4gIEpzb25WYWx1ZSxcbiAgZXhwZXJpbWVudGFsLFxuICBwYXJzZUpzb24sXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IHdyaXRlRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBDb21tYW5kU2NvcGUgfSBmcm9tICcuLi9tb2RlbHMvaW50ZXJmYWNlJztcbmltcG9ydCB7XG4gIGdldFdvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlUmF3LFxuICBtaWdyYXRlTGVnYWN5R2xvYmFsQ29uZmlnLFxuICB2YWxpZGF0ZVdvcmtzcGFjZSxcbn0gZnJvbSAnLi4vdXRpbGl0aWVzL2NvbmZpZyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29uZmlnQ29tbWFuZFNjaGVtYSwgVmFsdWUgYXMgQ29uZmlnQ29tbWFuZFNjaGVtYVZhbHVlIH0gZnJvbSAnLi9jb25maWcnO1xuXG5cbmNvbnN0IHZhbGlkQ2xpUGF0aHMgPSBuZXcgTWFwKFtcbiAgWydjbGkud2FybmluZ3MudmVyc2lvbk1pc21hdGNoJywgJ2Jvb2xlYW4nXSxcbiAgWydjbGkuZGVmYXVsdENvbGxlY3Rpb24nLCAnc3RyaW5nJ10sXG4gIFsnY2xpLnBhY2thZ2VNYW5hZ2VyJywgJ3N0cmluZyddLFxuXSk7XG5cbi8qKlxuICogU3BsaXRzIGEgSlNPTiBwYXRoIHN0cmluZyBpbnRvIGZyYWdtZW50cy4gRnJhZ21lbnRzIGNhbiBiZSB1c2VkIHRvIGdldCB0aGUgdmFsdWUgcmVmZXJlbmNlZFxuICogYnkgdGhlIHBhdGguIEZvciBleGFtcGxlLCBhIHBhdGggb2YgXCJhWzNdLmZvby5iYXJbMl1cIiB3b3VsZCBnaXZlIHlvdSBhIGZyYWdtZW50IGFycmF5IG9mXG4gKiBbXCJhXCIsIDMsIFwiZm9vXCIsIFwiYmFyXCIsIDJdLlxuICogQHBhcmFtIHBhdGggVGhlIEpTT04gc3RyaW5nIHRvIHBhcnNlLlxuICogQHJldHVybnMge3N0cmluZ1tdfSBUaGUgZnJhZ21lbnRzIGZvciB0aGUgc3RyaW5nLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gcGFyc2VKc29uUGF0aChwYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGZyYWdtZW50cyA9IChwYXRoIHx8ICcnKS5zcGxpdCgvXFwuL2cpO1xuICBjb25zdCByZXN1bHQ6IHN0cmluZ1tdID0gW107XG5cbiAgd2hpbGUgKGZyYWdtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZnJhZ21lbnQgPSBmcmFnbWVudHMuc2hpZnQoKTtcbiAgICBpZiAoZnJhZ21lbnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaCA9IGZyYWdtZW50Lm1hdGNoKC8oW15cXFtdKykoKFxcWy4qXFxdKSopLyk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04gcGF0aC4nKTtcbiAgICB9XG5cbiAgICByZXN1bHQucHVzaChtYXRjaFsxXSk7XG4gICAgaWYgKG1hdGNoWzJdKSB7XG4gICAgICBjb25zdCBpbmRpY2VzID0gbWF0Y2hbMl0uc2xpY2UoMSwgLTEpLnNwbGl0KCddWycpO1xuICAgICAgcmVzdWx0LnB1c2goLi4uaW5kaWNlcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5maWx0ZXIoZnJhZ21lbnQgPT4gISFmcmFnbWVudCk7XG59XG5cbmZ1bmN0aW9uIGdldFZhbHVlRnJvbVBhdGg8VCBleHRlbmRzIEpzb25BcnJheSB8IEpzb25PYmplY3Q+KFxuICByb290OiBULFxuICBwYXRoOiBzdHJpbmcsXG4pOiBKc29uVmFsdWUgfCB1bmRlZmluZWQge1xuICBjb25zdCBmcmFnbWVudHMgPSBwYXJzZUpzb25QYXRoKHBhdGgpO1xuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGZyYWdtZW50cy5yZWR1Y2UoKHZhbHVlOiBKc29uVmFsdWUsIGN1cnJlbnQ6IHN0cmluZyB8IG51bWJlcikgPT4ge1xuICAgICAgaWYgKHZhbHVlID09IHVuZGVmaW5lZCB8fCB0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnQgPT0gJ3N0cmluZycgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVtjdXJyZW50XTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnQgPT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlW2N1cnJlbnRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9LCByb290KTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRWYWx1ZUZyb21QYXRoPFQgZXh0ZW5kcyBKc29uQXJyYXkgfCBKc29uT2JqZWN0PihcbiAgcm9vdDogVCxcbiAgcGF0aDogc3RyaW5nLFxuICBuZXdWYWx1ZTogSnNvblZhbHVlLFxuKTogSnNvblZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZnJhZ21lbnRzID0gcGFyc2VKc29uUGF0aChwYXRoKTtcblxuICB0cnkge1xuICAgIHJldHVybiBmcmFnbWVudHMucmVkdWNlKCh2YWx1ZTogSnNvblZhbHVlLCBjdXJyZW50OiBzdHJpbmcgfCBudW1iZXIsIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgIGlmICh2YWx1ZSA9PSB1bmRlZmluZWQgfHwgdHlwZW9mIHZhbHVlICE9ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjdXJyZW50ID09ICdzdHJpbmcnICYmICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBpZiAoaW5kZXggPT09IGZyYWdtZW50cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgdmFsdWVbY3VycmVudF0gPSBuZXdWYWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZVtjdXJyZW50XSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGZyYWdtZW50c1tpbmRleCArIDFdID09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IFtdO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZyYWdtZW50c1tpbmRleCArIDFdID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB2YWx1ZVtjdXJyZW50XSA9IHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZVtjdXJyZW50XTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGN1cnJlbnQgPT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSBmcmFnbWVudHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIHZhbHVlW2N1cnJlbnRdID0gbmV3VmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWVbY3VycmVudF0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBmcmFnbWVudHNbaW5kZXggKyAxXSA9PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdmFsdWVbY3VycmVudF0gPSBbXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmcmFnbWVudHNbaW5kZXggKyAxXSA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFsdWVbY3VycmVudF0gPSB7fTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWVbY3VycmVudF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0sIHJvb3QpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlOiBDb25maWdDb21tYW5kU2NoZW1hVmFsdWUsIHBhdGg6IHN0cmluZyk6IEpzb25WYWx1ZSB7XG4gIGNvbnN0IGNsaU9wdGlvblR5cGUgPSB2YWxpZENsaVBhdGhzLmdldChwYXRoKTtcbiAgaWYgKGNsaU9wdGlvblR5cGUpIHtcbiAgICBzd2l0Y2ggKGNsaU9wdGlvblR5cGUpIHtcbiAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICBpZiAoKCcnICsgdmFsdWUpLnRyaW0oKSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoKCcnICsgdmFsdWUpLnRyaW0oKSA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIGNvbnN0IG51bWJlclZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobnVtYmVyVmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bWJlclZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB2YWx1ZSB0eXBlOyBleHBlY3RlZCBhICR7Y2xpT3B0aW9uVHlwZX0uYCk7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gcGFyc2VKc29uKHZhbHVlLCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIEludmFsaWRKc29uQ2hhcmFjdGVyRXhjZXB0aW9uICYmICF2YWx1ZS5zdGFydHNXaXRoKCd7JykpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maWdDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxDb25maWdDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIGNvbnN0IGxldmVsID0gb3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCc7XG5cbiAgICBpZiAoIW9wdGlvbnMuZ2xvYmFsKSB7XG4gICAgICBhd2FpdCB0aGlzLnZhbGlkYXRlU2NvcGUoQ29tbWFuZFNjb3BlLkluUHJvamVjdCk7XG4gICAgfVxuXG4gICAgbGV0IGNvbmZpZyA9XG4gICAgICAoZ2V0V29ya3NwYWNlKGxldmVsKSBhcyB7fSBhcyB7IF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlU2NoZW1hIH0pO1xuXG4gICAgaWYgKG9wdGlvbnMuZ2xvYmFsICYmICFjb25maWcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChtaWdyYXRlTGVnYWN5R2xvYmFsQ29uZmlnKCkpIHtcbiAgICAgICAgICBjb25maWcgPVxuICAgICAgICAgICAgKGdldFdvcmtzcGFjZShsZXZlbCkgYXMge30gYXMgeyBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYSB9KTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIFdlIGZvdW5kIGEgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gdGhhdCB3YXMgdXNlZCBpbiBBbmd1bGFyIENMSSAxLlxuICAgICAgICAgICAgSXQgaGFzIGJlZW4gYXV0b21hdGljYWxseSBtaWdyYXRlZC5gKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnZhbHVlID09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ05vIGNvbmZpZyBmb3VuZC4nKTtcblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KGNvbmZpZy5fd29ya3NwYWNlLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0KG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0KGNvbmZpZzogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2VTY2hlbWEsIG9wdGlvbnM6IENvbmZpZ0NvbW1hbmRTY2hlbWEpIHtcbiAgICBsZXQgdmFsdWU7XG4gICAgaWYgKG9wdGlvbnMuanNvblBhdGgpIHtcbiAgICAgIGlmIChvcHRpb25zLmpzb25QYXRoID09PSAnY2xpLndhcm5pbmdzLnR5cGVzY3JpcHRNaXNtYXRjaCcpIHtcbiAgICAgICAgLy8gTk9URTogUmVtb3ZlIHRoaXMgaW4gOS4wLlxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdUaGUgXCJ0eXBlc2NyaXB0TWlzbWF0Y2hcIiB3YXJuaW5nIGhhcyBiZWVuIHJlbW92ZWQgaW4gOC4wLicpO1xuICAgICAgICAvLyBTaW5jZSB0aGVyZSBpcyBubyBhY3R1YWwgd2FybmluZywgdGhpcyB2YWx1ZSBpcyBhbHdheXMgZmFsc2UuXG4gICAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ2ZhbHNlJyk7XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG5cbiAgICAgIHZhbHVlID0gZ2V0VmFsdWVGcm9tUGF0aChjb25maWcgYXMge30gYXMgSnNvbk9iamVjdCwgb3B0aW9ucy5qc29uUGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gY29uZmlnO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmFsdWUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5sb2dnZXIuaW5mbyhKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvZ2dlci5pbmZvKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXQob3B0aW9uczogQ29uZmlnQ29tbWFuZFNjaGVtYSkge1xuICAgIGlmICghb3B0aW9ucy5qc29uUGF0aCB8fCAhb3B0aW9ucy5qc29uUGF0aC50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBQYXRoLicpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmpzb25QYXRoID09PSAnY2xpLndhcm5pbmdzLnR5cGVzY3JpcHRNaXNtYXRjaCcpIHtcbiAgICAgIC8vIE5PVEU6IFJlbW92ZSB0aGlzIGluIDkuMC5cbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ1RoZSBcInR5cGVzY3JpcHRNaXNtYXRjaFwiIHdhcm5pbmcgaGFzIGJlZW4gcmVtb3ZlZCBpbiA4LjAuJyk7XG5cbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmdsb2JhbFxuICAgICAgICAmJiAhb3B0aW9ucy5qc29uUGF0aC5zdGFydHNXaXRoKCdzY2hlbWF0aWNzLicpXG4gICAgICAgICYmICF2YWxpZENsaVBhdGhzLmhhcyhvcHRpb25zLmpzb25QYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFBhdGguJyk7XG4gICAgfVxuXG4gICAgY29uc3QgW2NvbmZpZywgY29uZmlnUGF0aF0gPSBnZXRXb3Jrc3BhY2VSYXcob3B0aW9ucy5nbG9iYWwgPyAnZ2xvYmFsJyA6ICdsb2NhbCcpO1xuICAgIGlmICghY29uZmlnIHx8ICFjb25maWdQYXRoKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ29uZmd1cmF0aW9uIGZpbGUgY2Fubm90IGJlIGZvdW5kLicpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBNb2RpZnkgJiBzYXZlIHdpdGhvdXQgZGVzdHJveWluZyBjb21tZW50c1xuICAgIGNvbnN0IGNvbmZpZ1ZhbHVlID0gY29uZmlnLnZhbHVlO1xuXG4gICAgY29uc3QgdmFsdWUgPSBub3JtYWxpemVWYWx1ZShvcHRpb25zLnZhbHVlIHx8ICcnLCBvcHRpb25zLmpzb25QYXRoKTtcbiAgICBjb25zdCByZXN1bHQgPSBzZXRWYWx1ZUZyb21QYXRoKGNvbmZpZ1ZhbHVlLCBvcHRpb25zLmpzb25QYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgZm91bmQuJyk7XG5cbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB2YWxpZGF0ZVdvcmtzcGFjZShjb25maWdWYWx1ZSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGVycm9yLm1lc3NhZ2UpO1xuXG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXQgPSBKU09OLnN0cmluZ2lmeShjb25maWdWYWx1ZSwgbnVsbCwgMik7XG4gICAgd3JpdGVGaWxlU3luYyhjb25maWdQYXRoLCBvdXRwdXQpO1xuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxufVxuIl19