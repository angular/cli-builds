"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SilentError = require('silent-error');
const command_1 = require("../models/command");
const override_options_1 = require("../utilities/override-options");
const config_1 = require("../models/config");
const serve_1 = require("./serve");
const check_port_1 = require("../utilities/check-port");
const common_tags_1 = require("common-tags");
class E2eCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'e2e';
        this.description = 'Run e2e tests in existing project.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = [];
        this.options = override_options_1.overrideOptions([
            ...serve_1.baseServeCommandOptions,
            {
                name: 'config',
                type: String,
                aliases: ['c'],
                description: common_tags_1.oneLine `
        Use a specific config file.
        Defaults to the protractor config file in angular-cli.json.
      `
            },
            {
                name: 'specs',
                type: Array,
                default: [],
                aliases: ['sp'],
                description: common_tags_1.oneLine `
        Override specs in the protractor config.
        Can send in multiple specs by repeating flag (ng e2e --specs=spec1.ts --specs=spec2.ts).
      `
            },
            {
                name: 'suite',
                type: String,
                aliases: ['su'],
                description: common_tags_1.oneLine `
        Override suite in the protractor config.
        Can send in multiple suite by comma separated values (ng e2e --suite=suiteA,suiteB).
      `
            },
            {
                name: 'element-explorer',
                type: Boolean,
                default: false,
                aliases: ['ee'],
                description: 'Start Protractor\'s Element Explorer for debugging.'
            },
            {
                name: 'webdriver-update',
                type: Boolean,
                default: true,
                aliases: ['wu'],
                description: 'Try to update webdriver.'
            },
            {
                name: 'serve',
                type: Boolean,
                default: true,
                aliases: ['s'],
                description: common_tags_1.oneLine `
        Compile and Serve the app.
        All non-reload related serve options are also available (e.g. --port=4400).
      `
            }
        ], [
            {
                name: 'port',
                default: 0,
                description: 'The port to use to serve the application.'
            },
            {
                name: 'watch',
                default: false,
                description: 'Run build when files change.'
            },
        ]);
    }
    validate(options) {
        if (!options.config) {
            const e2eConfig = config_1.CliConfig.fromProject().config.e2e;
            if (!e2eConfig.protractor.config) {
                throw new SilentError('No protractor config found in .angular-cli.json.');
            }
        }
        return true;
    }
    run(options) {
        const E2eTask = require('../tasks/e2e').E2eTask;
        const e2eTask = new E2eTask({
            ui: this.ui,
            project: this.project
        });
        if (!options.config) {
            const e2eConfig = config_1.CliConfig.fromProject().config.e2e;
            options.config = e2eConfig.protractor.config;
        }
        if (options.serve) {
            const ServeTask = require('../tasks/serve').default;
            const serve = new ServeTask({
                ui: this.ui,
                project: this.project,
            });
            // Protractor will end the proccess, so we don't need to kill the dev server
            // TODO: Convert this promise to use observables which will allow for retries.
            return new Promise((resolve, reject) => {
                let firstRebuild = true;
                function rebuildCb(stats) {
                    // don't run re-run tests on subsequent rebuilds
                    const cleanBuild = !!!stats.compilation.errors.length;
                    if (firstRebuild && cleanBuild) {
                        firstRebuild = false;
                        return resolve(e2eTask.run(options));
                    }
                    else {
                        return reject('Build did not succeed. Please fix errors before running e2e task');
                    }
                }
                check_port_1.checkPort(options.port, options.host)
                    .then((port) => options.port = port)
                    .then(() => serve.run(options, rebuildCb))
                    .catch(reject);
            });
        }
        else {
            return e2eTask.run(options);
        }
    }
}
E2eCommand.aliases = ['e'];
exports.default = E2eCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/e2e.js.map