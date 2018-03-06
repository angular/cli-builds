"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const fs = require("fs");
const config_1 = require("../models/config");
const common_tags_1 = require("common-tags");
const SilentError = require('silent-error');
class SetCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'set';
        this.description = 'Set a value in the configuration.';
        this.arguments = ['jsonPath', 'value'];
        this.options = [
            {
                name: 'global',
                type: Boolean,
                'default': false,
                aliases: ['g'],
                description: 'Set the value in the global configuration rather than in your project\'s.'
            }
        ];
    }
    run(options) {
        return new Promise(resolve => {
            const config = options.global ? config_1.CliConfig.fromGlobal() : config_1.CliConfig.fromProject();
            if (config === null) {
                throw new SilentError('No config found. If you want to use global configuration, '
                    + 'you need the --global argument.');
            }
            if (options.value === undefined && options.jsonPath.indexOf('=') !== -1) {
                [options.jsonPath, options.value] = options.jsonPath.split('=', 2);
            }
            if (options.value === undefined) {
                throw new SilentError('Must specify a value.');
            }
            const type = config.typeOf(options.jsonPath);
            let value = options.value;
            switch (type) {
                case 'boolean':
                    value = this.asBoolean(options.value);
                    break;
                case 'number':
                    value = this.asNumber(options.value);
                    break;
                case 'string':
                    value = options.value;
                    break;
                default: value = this.parseValue(options.value, options.jsonPath);
            }
            if (options.jsonPath.indexOf('prefix') > 0) {
                // update tslint if prefix is updated
                this.updateLintForPrefix(this.project.root + '/tslint.json', value);
            }
            try {
                config.set(options.jsonPath, value);
                config.save();
            }
            catch (error) {
                throw new SilentError(error.message);
            }
            resolve();
        });
    }
    asBoolean(raw) {
        if (raw == 'true' || raw == '1') {
            return true;
        }
        else if (raw == 'false' || raw == '' || raw == '0') {
            return false;
        }
        else {
            throw new SilentError(`Invalid boolean value: "${raw}"`);
        }
    }
    asNumber(raw) {
        if (Number.isNaN(+raw)) {
            throw new SilentError(`Invalid number value: "${raw}"`);
        }
        return +raw;
    }
    parseValue(rawValue, path) {
        try {
            return JSON.parse(rawValue);
        }
        catch (error) {
            throw new SilentError(`No node found at path ${path}`);
        }
    }
    updateLintForPrefix(filePath, prefix) {
        if (!fs.existsSync(filePath)) {
            return;
        }
        const tsLint = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const componentLint = tsLint.rules['component-selector'][2];
        if (componentLint instanceof Array) {
            tsLint.rules['component-selector'][2].push(prefix);
        }
        else {
            tsLint.rules['component-selector'][2] = prefix;
        }
        const directiveLint = tsLint.rules['directive-selector'][2];
        if (directiveLint instanceof Array) {
            tsLint.rules['directive-selector'][2].push(prefix);
        }
        else {
            tsLint.rules['directive-selector'][2] = prefix;
        }
        fs.writeFileSync(filePath, JSON.stringify(tsLint, null, 2));
        this.logger.warn(common_tags_1.oneLine `
      tslint configuration updated to match new prefix,
      you may need to fix any linting errors.
    `);
    }
}
SetCommand.aliases = ['jsonPath'];
exports.default = SetCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/set.js.map