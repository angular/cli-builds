"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../models/config");
const command_1 = require("../models/command");
const SilentError = require('silent-error');
class GetCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'get';
        this.description = 'Get a value from the configuration. Example: ng get [key]';
        this.arguments = ['jsonPath'];
        this.options = [
            {
                name: 'global',
                type: Boolean,
                'default': false,
                aliases: ['g'],
                description: 'Get the value in the global configuration (in your home directory).'
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
            resolve();
        });
    }
}
exports.default = GetCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/get.js.map