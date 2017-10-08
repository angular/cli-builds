"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const build_1 = require("./build");
const config_1 = require("../models/config");
const version_1 = require("../upgrade/version");
const check_port_1 = require("../utilities/check-port");
const override_options_1 = require("../utilities/override-options");
const Command = require('../ember-cli/lib/models/command');
const config = config_1.CliConfig.fromProject() || config_1.CliConfig.fromGlobal();
const serveConfigDefaults = config.getPaths('defaults.serve', [
    'port', 'host'
]);
const defaultPort = process.env.PORT || serveConfigDefaults['port'];
// Expose options unrelated to live-reload to other commands that need to run serve
exports.baseServeCommandOptions = override_options_1.overrideOptions([
    ...build_1.baseBuildCommandOptions,
    {
        name: 'port',
        type: Number,
        default: defaultPort,
        aliases: ['p'],
        description: 'Port to listen to for serving.'
    },
    {
        name: 'host',
        type: String,
        default: serveConfigDefaults['host'],
        aliases: ['H'],
        description: `Listens only on ${serveConfigDefaults['host']} by default.`
    }
], [
    {
        name: 'watch',
        default: true,
        description: 'Rebuild on change.'
    }
]);
const ServeCommand = Command.extend({
    name: 'serve',
    description: 'Builds and serves your app, rebuilding on file changes.',
    aliases: ['server', 's'],
    availableOptions: exports.baseServeCommandOptions,
    run: function (commandOptions, rawArgs) {
        const ServeTask = require('../tasks/serve').default;
        version_1.Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
        const app = (rawArgs.length > 0 && !rawArgs[0].startsWith('-')) ?
            rawArgs[0] : commandOptions.app;
        return check_port_1.checkPort(commandOptions.port, commandOptions.host, defaultPort)
            .then(port => {
            commandOptions.port = port;
            const serve = new ServeTask({
                ui: this.ui,
                project: this.project,
                app
            });
            return serve.run(commandOptions);
        });
    }
});
exports.default = ServeCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/serve.js.map