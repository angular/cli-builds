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
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const architect_1 = require("@angular-devkit/architect");
const command_1 = require("./command");
const architect_2 = require("../utilities/architect");
const operators_1 = require("rxjs/operators");
const build_webpack_compat_1 = require("../utilities/build-webpack-compat");
const config_1 = require("./config");
const stringUtils = require('ember-cli-string-utils');
class ArchitectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.Options = [{
                name: 'configuration',
                description: 'The configuration',
                type: String,
                aliases: ['c']
            }];
        this.arguments = ['project'];
        this.prodOption = {
            name: 'prod',
            description: 'Flag to set configuration to "prod".',
            type: Boolean
        };
        this.configurationOption = {
            name: 'configuration',
            description: 'Specify the configuration to use.',
            type: String,
            aliases: ['c']
        };
    }
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const targetOptions = {
                project: options.project || '$$proj0',
                target: this.target,
                configuration: options.configuration,
            };
            let architectTarget;
            const host = new node_1.NodeJsSyncHost();
            const architect = new architect_1.Architect(core_1.normalize(this.project.root), host);
            const cliConfig = config_1.CliConfig.fromProject().config;
            const workspaceConfig = build_webpack_compat_1.createArchitectWorkspace(cliConfig);
            return architect.loadWorkspaceFromJson(workspaceConfig).pipe(operators_1.concatMap(() => {
                // Get the target without overrides to get the builder description.
                architectTarget = architect.getTarget(targetOptions);
                // Load the description.
                return architect.getBuilderDescription(architectTarget);
            }), operators_1.map(builderDescription => {
                return builderDescription.schema;
            }))
                .toPromise()
                .then((schema) => this.mapArchitectOptions(schema))
                .then(() => { });
        });
    }
    mapArchitectOptions(schema) {
        const properties = schema.properties;
        const keys = Object.keys(properties);
        keys
            .map(key => (Object.assign({}, properties[key], { name: stringUtils.dasherize(key) })))
            .map(opt => {
            let type;
            const schematicType = opt.type;
            switch (opt.type) {
                case 'string':
                    type = String;
                    break;
                case 'boolean':
                    type = Boolean;
                    break;
                case 'integer':
                case 'number':
                    type = Number;
                    break;
                // Ignore arrays / objects.
                default:
                    return null;
            }
            let aliases = [];
            if (opt.alias) {
                aliases = [...aliases, opt.alias];
            }
            if (opt.aliases) {
                aliases = [...aliases, ...opt.aliases];
            }
            const schematicDefault = opt.default;
            return Object.assign({}, opt, { aliases,
                type,
                schematicType, default: undefined, // do not carry over schematics defaults
                schematicDefault, hidden: opt.visible === false });
        })
            .filter(x => x)
            .forEach(option => this.options.push(option));
    }
    runArchitect(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const runOptions = Object.assign({ target: this.target, root: this.project.root }, options);
            const buildResult = yield architect_2.run(runOptions).toPromise();
            return buildResult.success ? 0 : 1;
        });
    }
}
exports.ArchitectCommand = ArchitectCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/architect-command.js.map