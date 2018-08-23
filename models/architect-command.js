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
                type: 'string',
                aliases: ['c'],
            }];
        this.arguments = ['project'];
        this.prodOption = {
            name: 'prod',
            description: 'Flag to set configuration to "prod".',
            type: 'boolean',
        };
        this.configurationOption = {
            name: 'configuration',
            description: 'Specify the configuration to use.',
            type: 'string',
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
            const types = ['string', 'boolean', 'integer', 'number'];
            // Ignore arrays / objects.
            if (types.indexOf(opt.type) === -1) {
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
            return Object.assign({}, opt, { aliases, default: undefined, // do not carry over schematics defaults
                schematicDefault, hidden: opt.visible === false });
        })
            .filter(x => x)
            .forEach(option => this.addOptions(option));
    }
    runArchitectTarget(options) {
        return __awaiter(this, void 0, void 0, function* () {
            delete options._;
            const targetSpec = this._makeTargetSpecifier(options);
            const runSingleTarget = (targetSpec) => this._architect.run(this._architect.getBuilderConfiguration(targetSpec), { logger: this._logger }).pipe(operators_1.map((buildEvent) => buildEvent.success ? 0 : 1));
            try {
                if (!targetSpec.project && this.target) {
                    // This runs each target sequentially.
                    // Running them in parallel would jumble the log messages.
                    return yield rxjs_1.from(this.getProjectNamesByTarget(this.target)).pipe(operators_1.concatMap(project => runSingleTarget(Object.assign({}, targetSpec, { project }))), operators_1.toArray(), operators_1.map(results => results.every(res => res === 0) ? 0 : 1))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7OztHQU1HO0FBQ0gseURBS21DO0FBQ25DLCtDQU84QjtBQUM5QixvREFBZ0Y7QUFDaEYsK0JBQWdDO0FBQ2hDLDhDQUE4RDtBQUM5RCx1Q0FBNEM7QUFDNUMseURBQXFEO0FBY3JELHNCQUF1QyxTQUFRLGlCQUFnQztJQUEvRTs7UUFFVSxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFHN0IsWUFBTyxHQUFHLDBCQUFtQixFQUFFLENBQUM7UUFDeEMscURBQXFEO1FBQzNDLGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBRXJCLFlBQU8sR0FBYSxDQUFDO2dCQUM1QixJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUFFLG1CQUFtQjtnQkFDaEMsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2FBQ2YsQ0FBQyxDQUFDO1FBRU0sY0FBUyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFvSHZCLGVBQVUsR0FBVztZQUM3QixJQUFJLEVBQUUsTUFBTTtZQUNaLFdBQVcsRUFBRSxzQ0FBc0M7WUFDbkQsSUFBSSxFQUFFLFNBQVM7U0FDaEIsQ0FBQztRQUVRLHdCQUFtQixHQUFXO1lBQ3RDLElBQUksRUFBRSxlQUFlO1lBQ3JCLFdBQVcsRUFBRSxtQ0FBbUM7WUFDaEQsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDZixDQUFDO0lBa0lKLENBQUM7SUE3UGMsVUFBVSxDQUFDLE9BQWdDOztZQUN0RCxPQUFPLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLElBQUksQ0FDM0MscUJBQVMsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2IsTUFB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Q0FBQztZQUNyQixhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztZQUN0QyxJQUFJLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7Z0JBQ2xDLGFBQWEsR0FBRyxZQUFZLENBQUM7YUFDOUI7WUFFRCxTQUFTLHFCQUFRLE9BQU8sQ0FBRSxDQUFDO1lBRTNCLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUMvQixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDO1NBQzFCO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDZDtRQUNELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxNQUFNLEdBQUcsRUFBRSxDQUFDO1NBQ2I7UUFFRCxPQUFPO1lBQ0wsT0FBTztZQUNQLGFBQWE7WUFDYixNQUFNO1lBQ04sU0FBUztTQUNWLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFqUkQsNENBaVJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgQXJjaGl0ZWN0LFxuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyRGVzY3JpcHRpb24sXG4gIFRhcmdldFNwZWNpZmllcixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQge1xuICBKc29uT2JqZWN0LFxuICBVbmtub3duRXhjZXB0aW9uLFxuICBleHBlcmltZW50YWwsXG4gIHNjaGVtYSxcbiAgc3RyaW5ncyxcbiAgdGFncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZUpzU3luY0hvc3QsIGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IGZyb20sIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwLCB0b0FycmF5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgQ29tbWFuZCwgT3B0aW9uIH0gZnJvbSAnLi9jb21tYW5kJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4vd29ya3NwYWNlLWxvYWRlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdEFuZENvbmZpZ3VyYXRpb25PcHRpb25zIHtcbiAgcHJvamVjdD86IHN0cmluZztcbiAgY29uZmlndXJhdGlvbj86IHN0cmluZztcbiAgcHJvZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYXJnZXRPcHRpb25zIHtcbiAgdGFyZ2V0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyA9IFByb2plY3RBbmRDb25maWd1cmF0aW9uT3B0aW9ucyAmIFRhcmdldE9wdGlvbnMgJiBKc29uT2JqZWN0O1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXJjaGl0ZWN0Q29tbWFuZCBleHRlbmRzIENvbW1hbmQ8QXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnM+IHtcblxuICBwcml2YXRlIF9ob3N0ID0gbmV3IE5vZGVKc1N5bmNIb3N0KCk7XG4gIHByaXZhdGUgX2FyY2hpdGVjdDogQXJjaGl0ZWN0O1xuICBwcml2YXRlIF93b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlO1xuICBwcml2YXRlIF9sb2dnZXIgPSBjcmVhdGVDb25zb2xlTG9nZ2VyKCk7XG4gIC8vIElmIHRoaXMgY29tbWFuZCBzdXBwb3J0cyBydW5uaW5nIG11bHRpcGxlIHRhcmdldHMuXG4gIHByb3RlY3RlZCBtdWx0aVRhcmdldCA9IGZhbHNlO1xuXG4gIHJlYWRvbmx5IE9wdGlvbnM6IE9wdGlvbltdID0gW3tcbiAgICBuYW1lOiAnY29uZmlndXJhdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdUaGUgY29uZmlndXJhdGlvbicsXG4gICAgdHlwZTogJ3N0cmluZycsXG4gICAgYWxpYXNlczogWydjJ10sXG4gIH1dO1xuXG4gIHJlYWRvbmx5IGFyZ3VtZW50cyA9IFsncHJvamVjdCddO1xuXG4gIHRhcmdldDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX2xvYWRXb3Jrc3BhY2VBbmRBcmNoaXRlY3QoKS5waXBlKFxuICAgICAgY29uY2F0TWFwKCgpID0+IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0U3BlYzogVGFyZ2V0U3BlY2lmaWVyID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcblxuICAgICAgICBpZiAodGhpcy50YXJnZXQgJiYgIXRhcmdldFNwZWMucHJvamVjdCkge1xuICAgICAgICAgIGNvbnN0IHByb2plY3RzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG5cbiAgICAgICAgICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIHNpbmdsZSB0YXJnZXQsIHVzZSBpdCB0byBwYXJzZSBvdmVycmlkZXMuXG4gICAgICAgICAgICB0YXJnZXRTcGVjLnByb2plY3QgPSBwcm9qZWN0c1swXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTXVsdGlwbGUgdGFyZ2V0cyBjYW4gaGF2ZSBkaWZmZXJlbnQsIGluY29tcGF0aWJsZSBvcHRpb25zLlxuICAgICAgICAgICAgLy8gV2Ugb25seSBsb29rdXAgb3B0aW9ucyBmb3Igc2luZ2xlIHRhcmdldHMuXG4gICAgICAgICAgICByZXR1cm4gb2YobnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0YXJnZXRTcGVjLnByb2plY3QgfHwgIXRhcmdldFNwZWMudGFyZ2V0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBBcmNoaXRlY3QgY29tbWFuZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJ1aWxkZXJDb25maWcgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24odGFyZ2V0U3BlYyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmZpZykucGlwZShcbiAgICAgICAgICB0YXA8QnVpbGRlckRlc2NyaXB0aW9uPihidWlsZGVyRGVzYyA9PiB7IHRoaXMubWFwQXJjaGl0ZWN0T3B0aW9ucyhidWlsZGVyRGVzYy5zY2hlbWEpOyB9KSxcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICkudG9Qcm9taXNlKClcbiAgICAgIC50aGVuKCgpID0+IHsgfSk7XG4gIH1cblxuICBwdWJsaWMgdmFsaWRhdGUob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG4gICAgICBjb25zdCB7IG92ZXJyaWRlcyB9ID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmIChwcm9qZWN0TmFtZXMubGVuZ3RoID4gMSAmJiBPYmplY3Qua2V5cyhvdmVycmlkZXMgfHwge30pLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gVmVyaWZ5IHRoYXQgYWxsIGJ1aWxkZXJzIGFyZSB0aGUgc2FtZSwgb3RoZXJ3aXNlIGVycm9yIG91dCAoc2luY2UgdGhlIG1lYW5pbmcgb2YgYW5cbiAgICAgICAgLy8gb3B0aW9uIGNvdWxkIHZhcnkgZnJvbSBidWlsZGVyIHRvIGJ1aWxkZXIpLlxuXG4gICAgICAgIGNvbnN0IGJ1aWxkZXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHByb2plY3ROYW1lIG9mIHByb2plY3ROYW1lcykge1xuICAgICAgICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICAgICAgY29uc3QgdGFyZ2V0RGVzYyA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih7XG4gICAgICAgICAgICBwcm9qZWN0OiBwcm9qZWN0TmFtZSxcbiAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0U3BlYy50YXJnZXQsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoYnVpbGRlcnMuaW5kZXhPZih0YXJnZXREZXNjLmJ1aWxkZXIpID09IC0xKSB7XG4gICAgICAgICAgICBidWlsZGVycy5wdXNoKHRhcmdldERlc2MuYnVpbGRlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJ1aWxkZXJzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgQXJjaGl0ZWN0IGNvbW1hbmRzIHdpdGggY29tbWFuZCBsaW5lIG92ZXJyaWRlcyBjYW5ub3QgdGFyZ2V0IGRpZmZlcmVudCBidWlsZGVycy4gVGhlXG4gICAgICAgICAgICAnJHt0aGlzLnRhcmdldH0nIHRhcmdldCB3b3VsZCBydW4gb24gcHJvamVjdHMgJHtwcm9qZWN0TmFtZXMuam9pbigpfSB3aGljaCBoYXZlIHRoZVxuICAgICAgICAgICAgZm9sbG93aW5nIGJ1aWxkZXJzOiAkeydcXG4gICcgKyBidWlsZGVycy5qb2luKCdcXG4gICcpfVxuICAgICAgICAgIGApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcm90ZWN0ZWQgbWFwQXJjaGl0ZWN0T3B0aW9ucyhzY2hlbWE6IEpzb25PYmplY3QpIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXM7XG4gICAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9ICdvYmplY3QnIHx8IHByb3BlcnRpZXMgPT09IG51bGwgfHwgQXJyYXkuaXNBcnJheShwcm9wZXJ0aWVzKSkge1xuICAgICAgdGhyb3cgbmV3IFVua25vd25FeGNlcHRpb24oJ0ludmFsaWQgc2NoZW1hLicpO1xuICAgIH1cbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyk7XG4gICAga2V5c1xuICAgICAgLm1hcChrZXkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHByb3BlcnRpZXNba2V5XTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0Jykge1xuICAgICAgICAgIHRocm93IG5ldyBVbmtub3duRXhjZXB0aW9uKCdJbnZhbGlkIHNjaGVtYS4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4udmFsdWUsXG4gICAgICAgICAgbmFtZTogc3RyaW5ncy5kYXNoZXJpemUoa2V5KSxcbiAgICAgICAgfSBhcyBhbnk7IC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG4gICAgICB9KVxuICAgICAgLm1hcChvcHQgPT4ge1xuICAgICAgICBjb25zdCB0eXBlcyA9IFsnc3RyaW5nJywgJ2Jvb2xlYW4nLCAnaW50ZWdlcicsICdudW1iZXInXTtcbiAgICAgICAgLy8gSWdub3JlIGFycmF5cyAvIG9iamVjdHMuXG4gICAgICAgIGlmICh0eXBlcy5pbmRleE9mKG9wdC50eXBlKSA9PT0gLTEpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAob3B0LmFsaWFzKSB7XG4gICAgICAgICAgYWxpYXNlcyA9IFsuLi5hbGlhc2VzLCBvcHQuYWxpYXNdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHQuYWxpYXNlcykge1xuICAgICAgICAgIGFsaWFzZXMgPSBbLi4uYWxpYXNlcywgLi4ub3B0LmFsaWFzZXNdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNjaGVtYXRpY0RlZmF1bHQgPSBvcHQuZGVmYXVsdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLm9wdCxcbiAgICAgICAgICBhbGlhc2VzLFxuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCwgLy8gZG8gbm90IGNhcnJ5IG92ZXIgc2NoZW1hdGljcyBkZWZhdWx0c1xuICAgICAgICAgIHNjaGVtYXRpY0RlZmF1bHQsXG4gICAgICAgICAgaGlkZGVuOiBvcHQudmlzaWJsZSA9PT0gZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgICAgLmZpbHRlcih4ID0+IHgpXG4gICAgICAuZm9yRWFjaChvcHRpb24gPT4gdGhpcy5hZGRPcHRpb25zKG9wdGlvbikpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHByb2RPcHRpb246IE9wdGlvbiA9IHtcbiAgICBuYW1lOiAncHJvZCcsXG4gICAgZGVzY3JpcHRpb246ICdGbGFnIHRvIHNldCBjb25maWd1cmF0aW9uIHRvIFwicHJvZFwiLicsXG4gICAgdHlwZTogJ2Jvb2xlYW4nLFxuICB9O1xuXG4gIHByb3RlY3RlZCBjb25maWd1cmF0aW9uT3B0aW9uOiBPcHRpb24gPSB7XG4gICAgbmFtZTogJ2NvbmZpZ3VyYXRpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnU3BlY2lmeSB0aGUgY29uZmlndXJhdGlvbiB0byB1c2UuJyxcbiAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICBhbGlhc2VzOiBbJ2MnXSxcbiAgfTtcblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBkZWxldGUgb3B0aW9ucy5fO1xuICAgIGNvbnN0IHRhcmdldFNwZWMgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuXG4gICAgY29uc3QgcnVuU2luZ2xlVGFyZ2V0ID0gKHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllcikgPT4gdGhpcy5fYXJjaGl0ZWN0LnJ1bihcbiAgICAgIHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih0YXJnZXRTcGVjKSxcbiAgICAgIHsgbG9nZ2VyOiB0aGlzLl9sb2dnZXIgfSxcbiAgICApLnBpcGUoXG4gICAgICBtYXAoKGJ1aWxkRXZlbnQ6IEJ1aWxkRXZlbnQpID0+IGJ1aWxkRXZlbnQuc3VjY2VzcyA/IDAgOiAxKSxcbiAgICApO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGFyZ2V0U3BlYy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICAgIC8vIFRoaXMgcnVucyBlYWNoIHRhcmdldCBzZXF1ZW50aWFsbHkuXG4gICAgICAgIC8vIFJ1bm5pbmcgdGhlbSBpbiBwYXJhbGxlbCB3b3VsZCBqdW1ibGUgdGhlIGxvZyBtZXNzYWdlcy5cbiAgICAgICAgcmV0dXJuIGF3YWl0IGZyb20odGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCkpLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKHByb2plY3QgPT4gcnVuU2luZ2xlVGFyZ2V0KHsgLi4udGFyZ2V0U3BlYywgcHJvamVjdCB9KSksXG4gICAgICAgICAgdG9BcnJheSgpLFxuICAgICAgICAgIG1hcChyZXN1bHRzID0+IHJlc3VsdHMuZXZlcnkocmVzID0+IHJlcyA9PT0gMCkgPyAwIDogMSksXG4gICAgICAgIClcbiAgICAgICAgLnRvUHJvbWlzZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHJ1blNpbmdsZVRhcmdldCh0YXJnZXRTcGVjKS50b1Byb21pc2UoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKSB7XG4gICAgICAgIGNvbnN0IG5ld0Vycm9yczogc2NoZW1hLlNjaGVtYVZhbGlkYXRvckVycm9yW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzY2hlbWFFcnJvciBvZiBlLmVycm9ycykge1xuICAgICAgICAgIGlmIChzY2hlbWFFcnJvci5rZXl3b3JkID09PSAnYWRkaXRpb25hbFByb3BlcnRpZXMnKSB7XG4gICAgICAgICAgICBjb25zdCB1bmtub3duUHJvcGVydHkgPSBzY2hlbWFFcnJvci5wYXJhbXMuYWRkaXRpb25hbFByb3BlcnR5O1xuICAgICAgICAgICAgaWYgKHVua25vd25Qcm9wZXJ0eSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRhc2hlcyA9IHVua25vd25Qcm9wZXJ0eS5sZW5ndGggPT09IDEgPyAnLScgOiAnLS0nO1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5mYXRhbChgVW5rbm93biBvcHRpb246ICcke2Rhc2hlc30ke3Vua25vd25Qcm9wZXJ0eX0nYCk7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdFcnJvcnMucHVzaChzY2hlbWFFcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3RXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihuZXcgc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24obmV3RXJyb3JzKS5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRhcmdldE5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUgPSB0aGlzLl93b3Jrc3BhY2UubGlzdFByb2plY3ROYW1lcygpLm1hcChwcm9qZWN0TmFtZSA9PlxuICAgICAgdGhpcy5fYXJjaGl0ZWN0Lmxpc3RQcm9qZWN0VGFyZ2V0cyhwcm9qZWN0TmFtZSkuaW5jbHVkZXModGFyZ2V0TmFtZSkgPyBwcm9qZWN0TmFtZSA6IG51bGwsXG4gICAgKS5maWx0ZXIoeCA9PiAhIXgpIGFzIHN0cmluZ1tdO1xuXG4gICAgaWYgKHRoaXMubXVsdGlUYXJnZXQpIHtcbiAgICAgIC8vIEZvciBtdWx0aSB0YXJnZXQgY29tbWFuZHMsIHdlIGFsd2F5cyBsaXN0IGFsbCBwcm9qZWN0cyB0aGF0IGhhdmUgdGhlIHRhcmdldC5cbiAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZvciBzaW5nbGUgdGFyZ2V0IGNvbW1hbmRzLCB3ZSB0cnkgdHJ5IHRoZSBkZWZhdWx0IHByb2plY3QgcHJvamVjdCBmaXJzdCxcbiAgICAgIC8vIHRoZW4gdGhlIGZ1bGwgbGlzdCBpZiBpdCBoYXMgYSBzaW5nbGUgcHJvamVjdCwgdGhlbiBlcnJvciBvdXQuXG4gICAgICBjb25zdCBtYXliZURlZmF1bHRQcm9qZWN0ID0gdGhpcy5fd29ya3NwYWNlLmdldERlZmF1bHRQcm9qZWN0TmFtZSgpO1xuICAgICAgaWYgKG1heWJlRGVmYXVsdFByb2plY3QgJiYgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmluY2x1ZGVzKG1heWJlRGVmYXVsdFByb2plY3QpKSB7XG4gICAgICAgIHJldHVybiBbbWF5YmVEZWZhdWx0UHJvamVjdF07XG4gICAgICB9XG5cbiAgICAgIGlmIChhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGRldGVybWluZSBhIHNpbmdsZSBwcm9qZWN0IGZvciB0aGUgJyR7dGFyZ2V0TmFtZX0nIHRhcmdldC5gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9sb2FkV29ya3NwYWNlQW5kQXJjaGl0ZWN0KCkge1xuICAgIGNvbnN0IHdvcmtzcGFjZUxvYWRlciA9IG5ldyBXb3Jrc3BhY2VMb2FkZXIodGhpcy5faG9zdCk7XG5cbiAgICByZXR1cm4gd29ya3NwYWNlTG9hZGVyLmxvYWRXb3Jrc3BhY2UodGhpcy5wcm9qZWN0LnJvb3QpLnBpcGUoXG4gICAgICB0YXAoKHdvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2UpID0+IHRoaXMuX3dvcmtzcGFjZSA9IHdvcmtzcGFjZSksXG4gICAgICBjb25jYXRNYXAoKHdvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2UpID0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcmNoaXRlY3Qod29ya3NwYWNlKS5sb2FkQXJjaGl0ZWN0KCk7XG4gICAgICB9KSxcbiAgICAgIHRhcCgoYXJjaGl0ZWN0OiBBcmNoaXRlY3QpID0+IHRoaXMuX2FyY2hpdGVjdCA9IGFyY2hpdGVjdCksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpOiBUYXJnZXRTcGVjaWZpZXIge1xuICAgIGxldCBwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb24sIG92ZXJyaWRlcztcblxuICAgIGlmIChvcHRpb25zLnRhcmdldCkge1xuICAgICAgW3Byb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbl0gPSBvcHRpb25zLnRhcmdldC5zcGxpdCgnOicpO1xuXG4gICAgICBvdmVycmlkZXMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICAgIGRlbGV0ZSBvdmVycmlkZXMudGFyZ2V0O1xuXG4gICAgICBpZiAob3ZlcnJpZGVzLmNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9IG92ZXJyaWRlcy5jb25maWd1cmF0aW9uO1xuICAgICAgICBkZWxldGUgb3ZlcnJpZGVzLmNvbmZpZ3VyYXRpb247XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2plY3QgPSBvcHRpb25zLnByb2plY3Q7XG4gICAgICB0YXJnZXQgPSB0aGlzLnRhcmdldDtcbiAgICAgIGNvbmZpZ3VyYXRpb24gPSBvcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICBpZiAoIWNvbmZpZ3VyYXRpb24gJiYgb3B0aW9ucy5wcm9kKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSAncHJvZHVjdGlvbic7XG4gICAgICB9XG5cbiAgICAgIG92ZXJyaWRlcyA9IHsgLi4ub3B0aW9ucyB9O1xuXG4gICAgICBkZWxldGUgb3ZlcnJpZGVzLmNvbmZpZ3VyYXRpb247XG4gICAgICBkZWxldGUgb3ZlcnJpZGVzLnByb2Q7XG4gICAgICBkZWxldGUgb3ZlcnJpZGVzLnByb2plY3Q7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICBwcm9qZWN0ID0gJyc7XG4gICAgfVxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0YXJnZXQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIGNvbmZpZ3VyYXRpb24sXG4gICAgICB0YXJnZXQsXG4gICAgICBvdmVycmlkZXMsXG4gICAgfTtcbiAgfVxufVxuIl19