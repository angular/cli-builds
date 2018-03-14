"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const fs = require("fs");
const config_1 = require("../models/config");
const common_tags_1 = require("common-tags");
const SilentError = require('silent-error');
class ConfigCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'config';
        this.description = 'Get/set configuration values.';
        this.arguments = ['jsonPath', 'value'];
        this.options = [
            {
                name: 'global',
                type: Boolean,
                'default': false,
                aliases: ['g'],
                description: 'Get/set the value in the global configuration (in your home directory).'
            }
        ];
    }
    run(options) {
        const config = options.global ? config_1.CliConfig.fromGlobal() : config_1.CliConfig.fromProject();
        if (config === null) {
            throw new SilentError('No config found. If you want to use global configuration, '
                + 'you need the --global argument.');
        }
        const action = !!options.value ? 'set' : 'get';
        if (action === 'get') {
            this.get(config, options);
        }
        else {
            this.set(config, options);
        }
    }
    get(config, options) {
        const value = config.get(options.jsonPath);
        if (value === null || value === undefined) {
            throw new SilentError('Value cannot be found.');
        }
        else if (typeof value == 'object') {
            this.logger.info(JSON.stringify(value, null, 2));
        }
        else {
            this.logger.info(value.toString());
        }
    }
    set(config, options) {
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
        if (options.jsonPath.endsWith('.prefix')) {
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
        const val = Number(raw);
        if (Number.isNaN(val)) {
            throw new SilentError(`Invalid number value: "${raw}"`);
        }
        return val;
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
        if (Array.isArray(tsLint.rules['component-selector'][2])) {
            tsLint.rules['component-selector'][2].push(prefix);
        }
        else {
            tsLint.rules['component-selector'][2] = prefix;
        }
        if (Array.isArray(tsLint.rules['directive-selector'][2])) {
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
exports.default = ConfigCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/config.js.map