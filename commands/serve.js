"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("../models/command");
const build_1 = require("./build");
const config_1 = require("../models/config");
const version_1 = require("../upgrade/version");
const check_port_1 = require("../utilities/check-port");
const override_options_1 = require("../utilities/override-options");
// const Command = require('../ember-cli/lib/models/command');
const config = config_1.CliConfig.fromProject() || config_1.CliConfig.fromGlobal();
const serveConfigDefaults = config.getPaths('defaults.serve', [
    'port', 'host', 'ssl', 'sslKey', 'sslCert', 'proxyConfig'
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
    },
    {
        name: 'proxy-config',
        type: 'Path',
        default: serveConfigDefaults['proxyConfig'],
        aliases: ['pc'],
        description: 'Proxy configuration file.'
    },
    {
        name: 'ssl',
        type: Boolean,
        default: serveConfigDefaults['ssl'],
        description: 'Serve using HTTPS.'
    },
    {
        name: 'ssl-key',
        type: String,
        default: serveConfigDefaults['sslKey'],
        description: 'SSL key to use for serving HTTPS.'
    },
    {
        name: 'ssl-cert',
        type: String,
        default: serveConfigDefaults['sslCert'],
        description: 'SSL certificate to use for serving HTTPS.'
    },
    {
        name: 'open',
        type: Boolean,
        default: false,
        aliases: ['o'],
        description: 'Opens the url in default browser.',
    },
    {
        name: 'live-reload',
        type: Boolean,
        default: true,
        aliases: ['lr'],
        description: 'Whether to reload the page on change, using live-reload.'
    },
    {
        name: 'public-host',
        type: String,
        aliases: ['live-reload-client'],
        description: 'Specify the URL that the browser client will use.'
    },
    {
        name: 'disable-host-check',
        type: Boolean,
        default: false,
        description: 'Don\'t verify connected clients are part of allowed hosts.',
    },
    {
        name: 'serve-path',
        type: String,
        description: 'The pathname where the app will be served.'
    },
    {
        name: 'hmr',
        type: Boolean,
        default: false,
        description: 'Enable hot module replacement.',
    }
], [
    {
        name: 'watch',
        default: true,
        description: 'Rebuild on change.'
    }
]);
class ServeCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'serve';
        this.description = 'Builds and serves your app, rebuilding on file changes.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = [];
        this.options = exports.baseServeCommandOptions;
    }
    validate(_options) {
        // Check Angular and TypeScript versions.
        version_1.Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
        version_1.Version.assertTypescriptVersion(this.project.root);
        return true;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const ServeTask = require('../tasks/serve').default;
            // Default evalSourcemaps to true for serve. This makes rebuilds faster.
            options.evalSourcemaps = true;
            const port = yield check_port_1.checkPort(options.port, options.host, defaultPort);
            options.port = port;
            const serve = new ServeTask({
                ui: this.ui,
                project: this.project,
            });
            return yield serve.run(options);
        });
    }
}
ServeCommand.aliases = ['server', 's'];
exports.default = ServeCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/serve.js.map