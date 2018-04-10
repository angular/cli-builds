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
const rxjs_1 = require("rxjs");
const rxjs_2 = require("rxjs");
const operators_1 = require("rxjs/operators");
const workspace_loader_1 = require("../models/workspace-loader");
class ArchitectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this._host = new node_1.NodeJsSyncHost();
        this._logger = node_1.createConsoleLogger();
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
            return this._loadWorkspaceAndArchitect().pipe(operators_1.concatMap(() => {
                let targetSpec;
                if (options.project) {
                    targetSpec = {
                        project: options.project,
                        target: this.target
                    };
                }
                else if (options.target) {
                    const [project, target] = options.target.split(':');
                    targetSpec = { project, target };
                }
                else if (this.target) {
                    const projects = this.getAllProjectsForTargetName(this.target);
                    if (projects.length === 1) {
                        // If there is a single target, use it to parse overrides.
                        targetSpec = {
                            project: projects[0],
                            target: this.target
                        };
                    }
                    else {
                        // Multiple targets can have different, incompatible options.
                        // We only lookup options for single targets.
                        return rxjs_1.of(null);
                    }
                }
                else {
                    throw new Error('Cannot determine project or target for Architect command.');
                }
                const builderConfig = this._architect.getBuilderConfiguration(targetSpec);
                return this._architect.getBuilderDescription(builderConfig).pipe(operators_1.tap(builderDesc => { this.mapArchitectOptions(builderDesc.schema); }));
            })).toPromise()
                .then(() => { });
        });
    }
    validate(options) {
        if (!options.project && this.target) {
            const projectNames = this.getAllProjectsForTargetName(this.target);
            const overrides = Object.assign({}, options);
            delete overrides.project;
            delete overrides.configuration;
            delete overrides.prod;
            if (projectNames.length > 1 && Object.keys(overrides).length > 0) {
                throw new Error('Architect commands with multiple targets cannot specify overrides.'
                    + `'${this.target}' would be run on the following projects: ${projectNames.join()}`);
            }
        }
        return true;
    }
    mapArchitectOptions(schema) {
        const properties = schema.properties;
        const keys = Object.keys(properties);
        keys
            .map(key => (Object.assign({}, properties[key], { name: core_1.strings.dasherize(key) })))
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
    runArchitectTarget(targetSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            const runSingleTarget = (targetSpec) => this._architect.run(this._architect.getBuilderConfiguration(targetSpec), { logger: this._logger }).pipe(operators_1.map((buildEvent) => buildEvent.success ? 0 : 1));
            if (!targetSpec.project && this.target) {
                // This runs each target sequentially. Running them in parallel would jumble the log messages.
                return rxjs_2.from(this.getAllProjectsForTargetName(this.target)).pipe(operators_1.concatMap(project => runSingleTarget(Object.assign({}, targetSpec, { project }))), operators_1.toArray()).toPromise().then(results => results.every(res => res === 0) ? 0 : 1);
            }
            else {
                return runSingleTarget(targetSpec).toPromise();
            }
        });
    }
    getAllProjectsForTargetName(targetName) {
        return this._workspace.listProjectNames().map(projectName => this._architect.listProjectTargets(projectName).includes(targetName) ? projectName : null).filter(x => !!x);
    }
    _loadWorkspaceAndArchitect() {
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        return workspaceLoader.loadWorkspace().pipe(operators_1.tap((workspace) => this._workspace = workspace), operators_1.concatMap((workspace) => {
            return new architect_1.Architect(workspace).loadArchitect();
        }), operators_1.tap((architect) => this._architect = architect));
    }
}
exports.ArchitectCommand = ArchitectCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/models/architect-command.js.map