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
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const architect_1 = require("@angular-devkit/architect");
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const rxjs_1 = require("rxjs");
const rxjs_2 = require("rxjs");
const operators_1 = require("rxjs/operators");
const command_1 = require("./command");
const workspace_loader_1 = require("./workspace-loader");
class ArchitectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this._host = new node_1.NodeJsSyncHost();
        this._logger = node_1.createConsoleLogger();
        // If this command supports running multiple targets.
        this.multiTarget = false;
        this.Options = [{
                name: 'configuration',
                description: 'The configuration',
                type: String,
                aliases: ['c'],
            }];
        this.arguments = ['project'];
        this.prodOption = {
            name: 'prod',
            description: 'Flag to set configuration to "prod".',
            type: Boolean,
        };
        this.configurationOption = {
            name: 'configuration',
            description: 'Specify the configuration to use.',
            type: String,
            aliases: ['c'],
        };
    }
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._loadWorkspaceAndArchitect().pipe(operators_1.concatMap(() => {
                const targetSpec = this._makeTargetSpecifier(options);
                if (this.target && !targetSpec.project) {
                    const projects = this.getProjectNamesByTarget(this.target);
                    if (projects.length === 1) {
                        // If there is a single target, use it to parse overrides.
                        targetSpec.project = projects[0];
                    }
                    else {
                        // Multiple targets can have different, incompatible options.
                        // We only lookup options for single targets.
                        return rxjs_1.of(null);
                    }
                }
                if (!targetSpec.project || !targetSpec.target) {
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
            const projectNames = this.getProjectNamesByTarget(this.target);
            const { overrides } = this._makeTargetSpecifier(options);
            if (projectNames.length > 1 && Object.keys(overrides || {}).length > 0) {
                // Verify that all builders are the same, otherwise error out (since the meaning of an
                // option could vary from builder to builder).
                const builders = [];
                for (const projectName of projectNames) {
                    const targetSpec = this._makeTargetSpecifier(options);
                    const targetDesc = this._architect.getBuilderConfiguration({
                        project: projectName,
                        target: targetSpec.target,
                    });
                    if (builders.indexOf(targetDesc.builder) == -1) {
                        builders.push(targetDesc.builder);
                    }
                }
                if (builders.length > 1) {
                    throw new Error(core_1.tags.oneLine `
            Architect commands with command line overrides cannot target different builders. The
            '${this.target}' target would run on projects ${projectNames.join()} which have the
            following builders: ${'\n  ' + builders.join('\n  ')}
          `);
                }
            }
        }
        return true;
    }
    mapArchitectOptions(schema) {
        const properties = schema.properties;
        if (typeof properties != 'object' || properties === null || Array.isArray(properties)) {
            throw new core_1.UnknownException('Invalid schema.');
        }
        const keys = Object.keys(properties);
        keys
            .map(key => {
            const value = properties[key];
            if (typeof value != 'object') {
                throw new core_1.UnknownException('Invalid schema.');
            }
            return Object.assign({}, value, { name: core_1.strings.dasherize(key) }); // tslint:disable-line:no-any
        })
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
    runArchitectTarget(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const targetSpec = this._makeTargetSpecifier(options);
            const runSingleTarget = (targetSpec) => this._architect.run(this._architect.getBuilderConfiguration(targetSpec), { logger: this._logger }).pipe(operators_1.map((buildEvent) => buildEvent.success ? 0 : 1));
            try {
                if (!targetSpec.project && this.target) {
                    // This runs each target sequentially.
                    // Running them in parallel would jumble the log messages.
                    return yield rxjs_2.from(this.getProjectNamesByTarget(this.target)).pipe(operators_1.concatMap(project => runSingleTarget(Object.assign({}, targetSpec, { project }))), operators_1.toArray(), operators_1.map(results => results.every(res => res === 0) ? 0 : 1))
                        .toPromise();
                }
                else {
                    return yield runSingleTarget(targetSpec).toPromise();
                }
            }
            catch (e) {
                if (e instanceof core_1.schema.SchemaValidationException) {
                    const newErrors = [];
                    for (const schemaError of e.errors) {
                        if (schemaError.keyword === 'additionalProperties') {
                            const unknownProperty = schemaError.params.additionalProperty;
                            if (unknownProperty in options) {
                                const dashes = unknownProperty.length === 1 ? '-' : '--';
                                this.logger.fatal(`Unknown option: '${dashes}${unknownProperty}'`);
                                continue;
                            }
                        }
                        newErrors.push(schemaError);
                    }
                    if (newErrors.length > 0) {
                        this.logger.error(new core_1.schema.SchemaValidationException(newErrors).message);
                    }
                    return 1;
                }
                else {
                    throw e;
                }
            }
        });
    }
    getProjectNamesByTarget(targetName) {
        const allProjectsForTargetName = this._workspace.listProjectNames().map(projectName => this._architect.listProjectTargets(projectName).includes(targetName) ? projectName : null).filter(x => !!x);
        if (this.multiTarget) {
            // For multi target commands, we always list all projects that have the target.
            return allProjectsForTargetName;
        }
        else {
            // For single target commands, we try try the default project project first,
            // then the full list if it has a single project, then error out.
            const maybeDefaultProject = this._workspace.getDefaultProjectName();
            if (maybeDefaultProject && allProjectsForTargetName.includes(maybeDefaultProject)) {
                return [maybeDefaultProject];
            }
            if (allProjectsForTargetName.length === 1) {
                return allProjectsForTargetName;
            }
            throw new Error(`Could not determine a single project for the '${targetName}' target.`);
        }
    }
    _loadWorkspaceAndArchitect() {
        const workspaceLoader = new workspace_loader_1.WorkspaceLoader(this._host);
        return workspaceLoader.loadWorkspace(this.project.root).pipe(operators_1.tap((workspace) => this._workspace = workspace), operators_1.concatMap((workspace) => {
            return new architect_1.Architect(workspace).loadArchitect();
        }), operators_1.tap((architect) => this._architect = architect));
    }
    _makeTargetSpecifier(options) {
        let project, target, configuration, overrides;
        if (options.target) {
            [project, target, configuration] = options.target.split(':');
            overrides = Object.assign({}, options);
            delete overrides.target;
            if (overrides.configuration) {
                configuration = overrides.configuration;
                delete overrides.configuration;
            }
        }
        else {
            project = options.project;
            target = this.target;
            configuration = options.configuration;
            if (!configuration && options.prod) {
                configuration = 'production';
            }
            overrides = Object.assign({}, options);
            delete overrides.configuration;
            delete overrides.prod;
            delete overrides.project;
        }
        if (!project) {
            project = '';
        }
        if (!target) {
            target = '';
        }
        return {
            project,
            configuration,
            target,
            overrides,
        };
    }
}
exports.ArchitectCommand = ArchitectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gseURBS21DO0FBQ25DLCtDQU84QjtBQUM5QixvREFBZ0Y7QUFDaEYsK0JBQTBCO0FBQzFCLCtCQUE0QjtBQUM1Qiw4Q0FBOEQ7QUFDOUQsdUNBQTRDO0FBQzVDLHlEQUFxRDtBQWNyRCxzQkFBdUMsU0FBUSxpQkFBZ0M7SUFBL0U7O1FBRVUsVUFBSyxHQUFHLElBQUkscUJBQWMsRUFBRSxDQUFDO1FBRzdCLFlBQU8sR0FBRywwQkFBbUIsRUFBRSxDQUFDO1FBQ3hDLHFEQUFxRDtRQUMzQyxnQkFBVyxHQUFHLEtBQUssQ0FBQztRQUVyQixZQUFPLEdBQWEsQ0FBQztnQkFDNUIsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFBRSxtQkFBbUI7Z0JBQ2hDLElBQUksRUFBRSxNQUFNO2dCQUNaLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUNmLENBQUMsQ0FBQztRQUVNLGNBQVMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBbUl2QixlQUFVLEdBQVc7WUFDN0IsSUFBSSxFQUFFLE1BQU07WUFDWixXQUFXLEVBQUUsc0NBQXNDO1lBQ25ELElBQUksRUFBRSxPQUFPO1NBQ2QsQ0FBQztRQUVRLHdCQUFtQixHQUFXO1lBQ3RDLElBQUksRUFBRSxlQUFlO1lBQ3JCLFdBQVcsRUFBRSxtQ0FBbUM7WUFDaEQsSUFBSSxFQUFFLE1BQU07WUFDWixPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDZixDQUFDO0lBaUlKLENBQUM7SUEzUWMsVUFBVSxDQUFDLE9BQWdDOztZQUN0RCxPQUFPLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLElBQUksQ0FDM0MscUJBQVMsQ0FBQyxHQUFHLEVB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QkFDM0IsYUFBYSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUM7Z0JBQ3hDLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQzthQUNoQztTQUNGO2FBQU07WUFDTCxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUMxQixNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNyQixhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztZQUN0QyxJQUFJLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7Z0JBQ2xDLGFBQWEsR0FBRyxZQUFZLENBQUM7YUFDOUI7WUFFRCxTQUFTLHFCQUFRLE9BQU8sQ0FBRSxDQUFDO1lBRTNCLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUMvQixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDO1NBQzFCO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDZDtRQUNELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxNQUFNLEdBQUcsRUFBRSxDQUFDO1NBQ2I7UUFFRCxPQUFPO1lBQ0wsT0FBTztZQUNQLGFBQWE7WUFDYixNQUFNO1lBQ04sU0FBUztTQUNWLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUEvUkQsNENBK1JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgQXJjaGl0ZWN0LFxuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyRGVzY3JpcHRpb24sXG4gIFRhcmdldFNwZWNpZmllcixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQge1xuICBKc29uT2JqZWN0LFxuICBVbmtub3duRXhjZXB0aW9uLFxuICBleHBlcmltZW50YWwsXG4gIHNjaGVtYSxcbiAgc3RyaW5ncyxcbiAgdGFncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZUpzU3luY0hvc3QsIGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmcm9tIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwLCB0b0FycmF5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgQ29tbWFuZCwgT3B0aW9uIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4vd29ya3NwYWNlLWxvYWRlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdEFuZENvbmZpZ3VyYXRpb25PcHRpb25zIHtcbiAgcHJvamVjdD86IHN0cmluZztcbiAgY29uZmlndXJhdGlvbj86IHN0cmluZztcbiAgcHJvZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYXJnZXRPcHRpb25zIHtcbiAgdGFyZ2V0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyA9IFByb2plY3RBbmRDb25maWd1cmF0aW9uT3B0aW9ucyAmIFRhcmdldE9wdGlvbnMgJiBKc29uT2JqZWN0O1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJjaGl0ZWN0Q29tbWFuZCBleHRlbmRzIENvbW1hbmQ8QXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnM+IHtcblxuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByaXZhdGUgX2FyY2hpdGVjdDogQXJjaGl0ZWN0O1xuICBwcml2YXRlIF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlO1xuICBwcml2YXRlIF9sb2dnZXIgPSBjcmVhdGVDb25zb2xlTG9nZ2VyKCk7XG4gIC8vIElmIHRoaXMgY29tbWFuZCBzdXBwb3J0cyBydW5uaW5nIG11bHRpcGxlIHRhcmdldHMuXG4gIHByb3RlY3RlZCBtdWx0aVRhcmdldCA9IGZhbHNlO1xuXG4gIHJlYWRvbmx5IE9wdGlvbnM6IE9wdGlvbltdID0gW3tcbiAgICBuYW1lOiAnY29uZmlndXJhdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdUaGUgY29uZmlndXJhdGlvbicsXG4gICAgdHlwZTogU3RyaW5nLFxuICAgIGFsaWFzZXM6IFsnYyddLFxuICB9XTtcblxuICByZWFkb25seSBhcmd1bWVudHMgPSBbJ3Byb2plY3QnXTtcblxuICB0YXJnZXQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZShvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLl9sb2FkV29ya3NwYWNlQW5kQXJjaGl0ZWN0KCkucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG5cbiAgICAgICAgaWYgKHRoaXMudGFyZ2V0ICYmICF0YXJnZXRTcGVjLnByb2plY3QpIHtcbiAgICAgICAgICBjb25zdCBwcm9qZWN0cyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuXG4gICAgICAgICAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBzaW5nbGUgdGFyZ2V0LCB1c2UgaXQgdG8gcGFyc2Ugb3ZlcnJpZGVzLlxuICAgICAgICAgICAgdGFyZ2V0U3BlYy5wcm9qZWN0ID0gcHJvamVjdHNbMF07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE11bHRpcGxlIHRhcmdldHMgY2FuIGhhdmUgZGlmZmVyZW50LCBpbmNvbXBhdGlibGUgb3B0aW9ucy5cbiAgICAgICAgICAgIC8vIFdlIG9ubHkgbG9va3VwIG9wdGlvbnMgZm9yIHNpbmdsZSB0YXJnZXRzLlxuICAgICAgICAgICAgcmV0dXJuIG9mKG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGFyZ2V0U3BlYy5wcm9qZWN0IHx8ICF0YXJnZXRTcGVjLnRhcmdldCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldCBmb3IgQXJjaGl0ZWN0IGNvbW1hbmQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBidWlsZGVyQ29uZmlnID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHRhcmdldFNwZWMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckRlc2NyaXB0aW9uKGJ1aWxkZXJDb25maWcpLnBpcGUoXG4gICAgICAgICAgdGFwPEJ1aWxkZXJEZXNjcmlwdGlvbj4oYnVpbGRlckRlc2MgPT4geyB0aGlzLm1hcEFyY2hpdGVjdE9wdGlvbnMoYnVpbGRlckRlc2Muc2NoZW1hKTsgfSksXG4gICAgICAgICk7XG4gICAgICB9KSxcbiAgICApLnRvUHJvbWlzZSgpXG4gICAgICAudGhlbigoKSA9PiB7IH0pO1xuICB9XG5cbiAgcHVibGljIHZhbGlkYXRlKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnByb2plY3QgJiYgdGhpcy50YXJnZXQpIHtcbiAgICAgIGNvbnN0IHByb2plY3ROYW1lcyA9IHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpO1xuICAgICAgY29uc3QgeyBvdmVycmlkZXMgfSA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICBpZiAocHJvamVjdE5hbWVzLmxlbmd0aCA+IDEgJiYgT2JqZWN0LmtleXMob3ZlcnJpZGVzIHx8IHt9KS5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIFZlcmlmeSB0aGF0IGFsbCBidWlsZGVycyBhcmUgdGhlIHNhbWUsIG90aGVyd2lzZSBlcnJvciBvdXQgKHNpbmNlIHRoZSBtZWFuaW5nIG9mIGFuXG4gICAgICAgIC8vIG9wdGlvbiBjb3VsZCB2YXJ5IGZyb20gYnVpbGRlciB0byBidWlsZGVyKS5cblxuICAgICAgICBjb25zdCBidWlsZGVyczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9qZWN0TmFtZSBvZiBwcm9qZWN0TmFtZXMpIHtcbiAgICAgICAgICBjb25zdCB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgICAgIGNvbnN0IHRhcmdldERlc2MgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgICAgcHJvamVjdDogcHJvamVjdE5hbWUsXG4gICAgICAgICAgICB0YXJnZXQ6IHRhcmdldFNwZWMudGFyZ2V0LFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGJ1aWxkZXJzLmluZGV4T2YodGFyZ2V0RGVzYy5idWlsZGVyKSA9PSAtMSkge1xuICAgICAgICAgICAgYnVpbGRlcnMucHVzaCh0YXJnZXREZXNjLmJ1aWxkZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChidWlsZGVycy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKHRhZ3Mub25lTGluZWBcbiAgICAgICAgICAgIEFyY2hpdGVjdCBjb21tYW5kcyB3aXRoIGNvbW1hbmQgbGluZSBvdmVycmlkZXMgY2Fubm90IHRhcmdldCBkaWZmZXJlbnQgYnVpbGRlcnMuIFRoZVxuICAgICAgICAgICAgJyR7dGhpcy50YXJnZXR9JyB0YXJnZXQgd291bGQgcnVuIG9uIHByb2plY3RzICR7cHJvamVjdE5hbWVzLmpvaW4oKX0gd2hpY2ggaGF2ZSB0aGVcbiAgICAgICAgICAgIGZvbGxvd2luZyBidWlsZGVyczogJHsnXFxuICAnICsgYnVpbGRlcnMuam9pbignXFxuICAnKX1cbiAgICAgICAgICBgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIG1hcEFyY2hpdGVjdE9wdGlvbnMoc2NoZW1hOiBKc29uT2JqZWN0KSB7XG4gICAgY29uc3QgcHJvcGVydGllcyA9IHNjaGVtYS5wcm9wZXJ0aWVzO1xuICAgIGlmICh0eXBlb2YgcHJvcGVydGllcyAhPSAnb2JqZWN0JyB8fCBwcm9wZXJ0aWVzID09PSBudWxsIHx8IEFycmF5LmlzQXJyYXkocHJvcGVydGllcykpIHtcbiAgICAgIHRocm93IG5ldyBVbmtub3duRXhjZXB0aW9uKCdJbnZhbGlkIHNjaGVtYS4nKTtcbiAgICB9XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpO1xuICAgIGtleXNcbiAgICAgIC5tYXAoa2V5ID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwcm9wZXJ0aWVzW2tleV07XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVW5rbm93bkV4Y2VwdGlvbignSW52YWxpZCBzY2hlbWEuJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLnZhbHVlLFxuICAgICAgICAgIG5hbWU6IHN0cmluZ3MuZGFzaGVyaXplKGtleSksXG4gICAgICAgIH0gYXMgYW55OyAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuICAgICAgfSlcbiAgICAgIC5tYXAob3B0ID0+IHtcbiAgICAgICAgbGV0IHR5cGU7XG4gICAgICAgIGNvbnN0IHNjaGVtYXRpY1R5cGUgPSBvcHQudHlwZTtcbiAgICAgICAgc3dpdGNoIChvcHQudHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICB0eXBlID0gU3RyaW5nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICB0eXBlID0gQm9vbGVhbjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICB0eXBlID0gTnVtYmVyO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAvLyBJZ25vcmUgYXJyYXlzIC8gb2JqZWN0cy5cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGFsaWFzZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGlmIChvcHQuYWxpYXMpIHtcbiAgICAgICAgICBhbGlhc2VzID0gWy4uLmFsaWFzZXMsIG9wdC5hbGlhc107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdC5hbGlhc2VzKSB7XG4gICAgICAgICAgYWxpYXNlcyA9IFsuLi5hbGlhc2VzLCAuLi5vcHQuYWxpYXNlc107XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzY2hlbWF0aWNEZWZhdWx0ID0gb3B0LmRlZmF1bHQ7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgYWxpYXNlcyxcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIHNjaGVtYXRpY1R5cGUsXG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLCAvLyBkbyBub3QgY2Fycnkgb3ZlciBzY2hlbWF0aWNzIGRlZmF1bHRzXG4gICAgICAgICAgc2NoZW1hdGljRGVmYXVsdCxcbiAgICAgICAgICBoaWRkZW46IG9wdC52aXNpYmxlID09PSBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICAuZmlsdGVyKHggPT4geClcbiAgICAgIC5mb3JFYWNoKG9wdGlvbiA9PiB0aGlzLm9wdGlvbnMucHVzaChvcHRpb24pKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwcm9kT3B0aW9uOiBPcHRpb24gPSB7XG4gICAgbmFtZTogJ3Byb2QnLFxuICAgIGRlc2NyaXB0aW9uOiAnRmxhZyB0byBzZXQgY29uZmlndXJhdGlvbiB0byBcInByb2RcIi4nLFxuICAgIHR5cGU6IEJvb2xlYW4sXG4gIH07XG5cbiAgcHJvdGVjdGVkIGNvbmZpZ3VyYXRpb25PcHRpb246IE9wdGlvbiA9IHtcbiAgICBuYW1lOiAnY29uZmlndXJhdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdTcGVjaWZ5IHRoZSBjb25maWd1cmF0aW9uIHRvIHVzZS4nLFxuICAgIHR5cGU6IFN0cmluZyxcbiAgICBhbGlhc2VzOiBbJ2MnXSxcbiAgfTtcblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB0YXJnZXRTcGVjID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcblxuICAgIGNvbnN0IHJ1blNpbmdsZVRhcmdldCA9ICh0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIpID0+IHRoaXMuX2FyY2hpdGVjdC5ydW4oXG4gICAgICB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24odGFyZ2V0U3BlYyksXG4gICAgICB7IGxvZ2dlcjogdGhpcy5fbG9nZ2VyIH0sXG4gICAgKS5waXBlKFxuICAgICAgbWFwKChidWlsZEV2ZW50OiBCdWlsZEV2ZW50KSA9PiBidWlsZEV2ZW50LnN1Y2Nlc3MgPyAwIDogMSksXG4gICAgKTtcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRhcmdldFNwZWMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgICAvLyBUaGlzIHJ1bnMgZWFjaCB0YXJnZXQgc2VxdWVudGlhbGx5LlxuICAgICAgICAvLyBSdW5uaW5nIHRoZW0gaW4gcGFyYWxsZWwgd291bGQganVtYmxlIHRoZSBsb2cgbWVzc2FnZXMuXG4gICAgICAgIHJldHVybiBhd2FpdCBmcm9tKHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpKS5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcChwcm9qZWN0ID0+IHJ1blNpbmdsZVRhcmdldCh7IC4uLnRhcmdldFNwZWMsIHByb2plY3QgfSkpLFxuICAgICAgICAgIHRvQXJyYXkoKSxcbiAgICAgICAgICBtYXAocmVzdWx0cyA9PiByZXN1bHRzLmV2ZXJ5KHJlcyA9PiByZXMgPT09IDApID8gMCA6IDEpLFxuICAgICAgICApXG4gICAgICAgIC50b1Byb21pc2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhd2FpdCBydW5TaW5nbGVUYXJnZXQodGFyZ2V0U3BlYykudG9Qcm9taXNlKCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICBjb25zdCBuZXdFcnJvcnM6IHNjaGVtYS5TY2hlbWFWYWxpZGF0b3JFcnJvcltdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2NoZW1hRXJyb3Igb2YgZS5lcnJvcnMpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hRXJyb3Iua2V5d29yZCA9PT0gJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJykge1xuICAgICAgICAgICAgY29uc3QgdW5rbm93blByb3BlcnR5ID0gc2NoZW1hRXJyb3IucGFyYW1zLmFkZGl0aW9uYWxQcm9wZXJ0eTtcbiAgICAgICAgICAgIGlmICh1bmtub3duUHJvcGVydHkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICBjb25zdCBkYXNoZXMgPSB1bmtub3duUHJvcGVydHkubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJztcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHtkYXNoZXN9JHt1bmtub3duUHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RXJyb3JzLnB1c2goc2NoZW1hRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0Vycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IobmV3IHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKG5ld0Vycm9ycykubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXROYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lID0gdGhpcy5fd29ya3NwYWNlLmxpc3RQcm9qZWN0TmFtZXMoKS5tYXAocHJvamVjdE5hbWUgPT5cbiAgICAgIHRoaXMuX2FyY2hpdGVjdC5saXN0UHJvamVjdFRhcmdldHMocHJvamVjdE5hbWUpLmluY2x1ZGVzKHRhcmdldE5hbWUpID8gcHJvamVjdE5hbWUgOiBudWxsLFxuICAgICkuZmlsdGVyKHggPT4gISF4KSBhcyBzdHJpbmdbXTtcblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igc2luZ2xlIHRhcmdldCBjb21tYW5kcywgd2UgdHJ5IHRyeSB0aGUgZGVmYXVsdCBwcm9qZWN0IHByb2plY3QgZmlyc3QsXG4gICAgICAvLyB0aGVuIHRoZSBmdWxsIGxpc3QgaWYgaXQgaGFzIGEgc2luZ2xlIHByb2plY3QsIHRoZW4gZXJyb3Igb3V0LlxuICAgICAgY29uc3QgbWF5YmVEZWZhdWx0UHJvamVjdCA9IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgIGlmIChtYXliZURlZmF1bHRQcm9qZWN0ICYmIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZURlZmF1bHRQcm9qZWN0KSkge1xuICAgICAgICByZXR1cm4gW21heWJlRGVmYXVsdFByb2plY3RdO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBkZXRlcm1pbmUgYSBzaW5nbGUgcHJvamVjdCBmb3IgdGhlICcke3RhcmdldE5hbWV9JyB0YXJnZXQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpIHtcbiAgICBjb25zdCB3b3Jrc3BhY2VMb2FkZXIgPSBuZXcgV29ya3NwYWNlTG9hZGVyKHRoaXMuX2hvc3QpO1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZUxvYWRlci5sb2FkV29ya3NwYWNlKHRoaXMucHJvamVjdC5yb290KS5waXBlKFxuICAgICAgdGFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgQXJjaGl0ZWN0KHdvcmtzcGFjZSkubG9hZEFyY2hpdGVjdCgpO1xuICAgICAgfSksXG4gICAgICB0YXAoKGFyY2hpdGVjdDogQXJjaGl0ZWN0KSA9PiB0aGlzLl9hcmNoaXRlY3QgPSBhcmNoaXRlY3QpLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogVGFyZ2V0U3BlY2lmaWVyIHtcbiAgICBsZXQgcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uLCBvdmVycmlkZXM7XG5cbiAgICBpZiAob3B0aW9ucy50YXJnZXQpIHtcbiAgICAgIFtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb25dID0gb3B0aW9ucy50YXJnZXQuc3BsaXQoJzonKTtcblxuICAgICAgb3ZlcnJpZGVzID0geyAuLi5vcHRpb25zIH07XG4gICAgICBkZWxldGUgb3ZlcnJpZGVzLnRhcmdldDtcblxuICAgICAgaWYgKG92ZXJyaWRlcy5jb25maWd1cmF0aW9uKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSBvdmVycmlkZXMuY29uZmlndXJhdGlvbjtcbiAgICAgICAgZGVsZXRlIG92ZXJyaWRlcy5jb25maWd1cmF0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9qZWN0ID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgICAgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICBjb25maWd1cmF0aW9uID0gb3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgaWYgKCFjb25maWd1cmF0aW9uICYmIG9wdGlvbnMucHJvZCkge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgfVxuXG4gICAgICBvdmVycmlkZXMgPSB7IC4uLm9wdGlvbnMgfTtcblxuICAgICAgZGVsZXRlIG92ZXJyaWRlcy5jb25maWd1cmF0aW9uO1xuICAgICAgZGVsZXRlIG92ZXJyaWRlcy5wcm9kO1xuICAgICAgZGVsZXRlIG92ZXJyaWRlcy5wcm9qZWN0O1xuICAgIH1cblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcHJvamVjdCA9ICcnO1xuICAgIH1cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGFyZ2V0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgICAgdGFyZ2V0LFxuICAgICAgb3ZlcnJpZGVzLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==