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
// tslint:disable:no-global-tslint-disable no-any file-header
const architect_1 = require("@angular-devkit/architect");
const core_1 = require("@angular-devkit/core");
const node_1 = require("@angular-devkit/core/node");
const rxjs_1 = require("rxjs");
const rxjs_2 = require("rxjs");
const operators_1 = require("rxjs/operators");
const workspace_loader_1 = require("../models/workspace-loader");
const command_1 = require("./command");
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
    runArchitectTarget(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const targetSpec = this._makeTargetSpecifier(options);
            const runSingleTarget = (targetSpec) => this._architect.run(this._architect.getBuilderConfiguration(targetSpec), { logger: this._logger }).pipe(operators_1.map((buildEvent) => buildEvent.success ? 0 : 1));
            try {
                if (!targetSpec.project && this.target) {
                    // This runs each target sequentially.
                    // Running them in parallel would jumble the log messages.
                    return yield rxjs_2.from(this.getProjectNamesByTarget(this.target)).pipe(operators_1.concatMap(project => runSingleTarget(Object.assign({}, targetSpec, { project }))), operators_1.toArray()).toPromise().then(results => results.every(res => res === 0) ? 0 : 1);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsNkRBQTZEO0FBQzdELHlEQUttQztBQUNuQywrQ0FBaUY7QUFDakYsb0RBQWdGO0FBQ2hGLCtCQUEwQjtBQUMxQiwrQkFBNEI7QUFDNUIsOENBQThEO0FBQzlELGlFQUE2RDtBQUM3RCx1Q0FBNEM7QUFlNUMsc0JBQXVDLFNBQVEsaUJBQWdDO0lBQS9FOztRQUVVLFVBQUssR0FBRyxJQUFJLHFCQUFjLEVBQUUsQ0FBQztRQUc3QixZQUFPLEdBQUcsMEJBQW1CLEVBQUUsQ0FBQztRQUN4QyxxREFBcUQ7UUFDM0MsZ0JBQVcsR0FBRyxLQUFLLENBQUM7UUFFckIsWUFBTyxHQUFhLENBQUM7Z0JBQzVCLElBQUksRUFBRSxlQUFlO2dCQUNyQixXQUFXLEVBQUUsbUJBQW1CO2dCQUNoQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDZixDQUFDLENBQUM7UUFFTSxjQUFTLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQWlHdkIsZUFBVSxHQUFXO1lBQzdCLElBQUksRUFBRSxNQUFNO1lBQ1osV0FBVyxFQUFFLHNDQUFzQztZQUNuRCxJQUFJLEVBQUUsT0FBTztTQUNkLENBQUM7UUFFUSx3QkFBbUIsR0FBVztZQUN0QyxJQUFJLEVBQUUsZUFBZTtZQUNyQixXQUFXLEVBQUUsbUNBQW1DO1lBQ2hELElBQUksRUFBRSxNQUFNO1lBQ1osT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2YsQ0FBQztJQStISixDQUFDO0lBdk9jLFVBQVUsQ0FBQyxPQUFnQzs7WUFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLElBQUksQ0FDM0MscUJBQVMsQ0FBQyxHQUFH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T0FBTyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3JCLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1lBQy9CLENBQUM7WUFFRCxTQUFTLHFCQUFRLE9BQU8sQ0FBRSxDQUFDO1lBRTNCLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUMvQixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDO1FBQzNCLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDYixPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2YsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNaLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxDQUFDO1lBQ0wsT0FBTztZQUNQLGFBQWE7WUFDYixNQUFNO1lBQ04sU0FBUztTQUNWLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUEzUEQsNENBMlBDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tZ2xvYmFsLXRzbGludC1kaXNhYmxlIG5vLWFueSBmaWxlLWhlYWRlclxuaW1wb3J0IHtcbiAgQXJjaGl0ZWN0LFxuICBCdWlsZEV2ZW50LFxuICBCdWlsZGVyRGVzY3JpcHRpb24sXG4gIFRhcmdldFNwZWNpZmllcixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBKc29uT2JqZWN0LCBleHBlcmltZW50YWwsIHNjaGVtYSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IE5vZGVKc1N5bmNIb3N0LCBjcmVhdGVDb25zb2xlTG9nZ2VyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUvbm9kZSc7XG5pbXBvcnQgeyBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY29uY2F0TWFwLCBtYXAsIHRhcCwgdG9BcnJheSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IFdvcmtzcGFjZUxvYWRlciB9IGZyb20gJy4uL21vZGVscy93b3Jrc3BhY2UtbG9hZGVyJztcbmltcG9ydCB7IENvbW1hbmQsIE9wdGlvbiB9IGZyb20gJy4vY29tbWFuZCc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0QW5kQ29uZmlndXJhdGlvbk9wdGlvbnMge1xuICBwcm9qZWN0Pzogc3RyaW5nO1xuICBjb25maWd1cmF0aW9uPzogc3RyaW5nO1xuICBwcm9kOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRhcmdldE9wdGlvbnMge1xuICB0YXJnZXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zID0gUHJvamVjdEFuZENvbmZpZ3VyYXRpb25PcHRpb25zICYgVGFyZ2V0T3B0aW9ucyAmIEpzb25PYmplY3Q7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBcmNoaXRlY3RDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxBcmNoaXRlY3RDb21tYW5kT3B0aW9ucz4ge1xuXG4gIHByaXZhdGUgX2hvc3QgPSBuZXcgTm9kZUpzU3luY0hvc3QoKTtcbiAgcHJpdmF0ZSBfYXJjaGl0ZWN0OiBBcmNoaXRlY3Q7XG4gIHByaXZhdGUgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2U7XG4gIHByaXZhdGUgX2xvZ2dlciA9IGNyZWF0ZUNvbnNvbGVMb2dnZXIoKTtcbiAgLy8gSWYgdGhpcyBjb21tYW5kIHN1cHBvcnRzIHJ1bm5pbmcgbXVsdGlwbGUgdGFyZ2V0cy5cbiAgcHJvdGVjdGVkIG11bHRpVGFyZ2V0ID0gZmFsc2U7XG5cbiAgcmVhZG9ubHkgT3B0aW9uczogT3B0aW9uW10gPSBbe1xuICAgIG5hbWU6ICdjb25maWd1cmF0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ1RoZSBjb25maWd1cmF0aW9uJyxcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgYWxpYXNlczogWydjJ10sXG4gIH1dO1xuXG4gIHJlYWRvbmx5IGFyZ3VtZW50cyA9IFsncHJvamVjdCddO1xuXG4gIHRhcmdldDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX2xvYWRXb3Jrc3BhY2VBbmRBcmNoaXRlY3QoKS5waXBlKFxuICAgICAgY29uY2F0TWFwKCgpID0+IHtcbiAgICAgICAgY29uc3QgdGFyZ2V0U3BlYzogVGFyZ2V0U3BlY2lmaWVyID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcblxuICAgICAgICBpZiAodGhpcy50YXJnZXQgJiYgIXRhcmdldFNwZWMucHJvamVjdCkge1xuICAgICAgICAgIGNvbnN0IHByb2plY3RzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG5cbiAgICAgICAgICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIHNpbmdsZSB0YXJnZXQsIHVzZSBpdCB0byBwYXJzZSBvdmVycmlkZXMuXG4gICAgICAgICAgICB0YXJnZXRTcGVjLnByb2plY3QgPSBwcm9qZWN0c1swXTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTXVsdGlwbGUgdGFyZ2V0cyBjYW4gaGF2ZSBkaWZmZXJlbnQsIGluY29tcGF0aWJsZSBvcHRpb25zLlxuICAgICAgICAgICAgLy8gV2Ugb25seSBsb29rdXAgb3B0aW9ucyBmb3Igc2luZ2xlIHRhcmdldHMuXG4gICAgICAgICAgICByZXR1cm4gb2YobnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0YXJnZXRTcGVjLnByb2plY3QgfHwgIXRhcmdldFNwZWMudGFyZ2V0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGV0ZXJtaW5lIHByb2plY3Qgb3IgdGFyZ2V0IGZvciBBcmNoaXRlY3QgY29tbWFuZC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJ1aWxkZXJDb25maWcgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24odGFyZ2V0U3BlYyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmZpZykucGlwZShcbiAgICAgICAgICB0YXA8QnVpbGRlckRlc2NyaXB0aW9uPihidWlsZGVyRGVzYyA9PiB7IHRoaXMubWFwQXJjaGl0ZWN0T3B0aW9ucyhidWlsZGVyRGVzYy5zY2hlbWEpOyB9KSxcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICkudG9Qcm9taXNlKClcbiAgICAgIC50aGVuKCgpID0+IHsgfSk7XG4gIH1cblxuICBwdWJsaWMgdmFsaWRhdGUob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG4gICAgICBjb25zdCB7IG92ZXJyaWRlcyB9ID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgIGlmIChwcm9qZWN0TmFtZXMubGVuZ3RoID4gMSAmJiBPYmplY3Qua2V5cyhvdmVycmlkZXMgfHwge30pLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmNoaXRlY3QgY29tbWFuZHMgd2l0aCBtdWx0aXBsZSB0YXJnZXRzIGNhbm5vdCBzcGVjaWZ5IG92ZXJyaWRlcy4nXG4gICAgICAgICAgKyBgJyR7dGhpcy50YXJnZXR9JyB3b3VsZCBiZSBydW4gb24gdGhlIGZvbGxvd2luZyBwcm9qZWN0czogJHtwcm9qZWN0TmFtZXMuam9pbigpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIG1hcEFyY2hpdGVjdE9wdGlvbnMoc2NoZW1hOiBhbnkpIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXM7XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpO1xuICAgIGtleXNcbiAgICAgIC5tYXAoa2V5ID0+ICh7IC4uLnByb3BlcnRpZXNba2V5XSwgLi4ueyBuYW1lOiBzdHJpbmdzLmRhc2hlcml6ZShrZXkpIH0gfSkpXG4gICAgICAubWFwKG9wdCA9PiB7XG4gICAgICAgIGxldCB0eXBlO1xuICAgICAgICBjb25zdCBzY2hlbWF0aWNUeXBlID0gb3B0LnR5cGU7XG4gICAgICAgIHN3aXRjaCAob3B0LnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgdHlwZSA9IFN0cmluZztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgdHlwZSA9IEJvb2xlYW47XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcbiAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgdHlwZSA9IE51bWJlcjtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgLy8gSWdub3JlIGFycmF5cyAvIG9iamVjdHMuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGxldCBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAob3B0LmFsaWFzKSB7XG4gICAgICAgICAgYWxpYXNlcyA9IFsuLi5hbGlhc2VzLCBvcHQuYWxpYXNdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvcHQuYWxpYXNlcykge1xuICAgICAgICAgIGFsaWFzZXMgPSBbLi4uYWxpYXNlcywgLi4ub3B0LmFsaWFzZXNdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2NoZW1hdGljRGVmYXVsdCA9IG9wdC5kZWZhdWx0O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgIGFsaWFzZXMsXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICBzY2hlbWF0aWNUeXBlLFxuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCwgLy8gZG8gbm90IGNhcnJ5IG92ZXIgc2NoZW1hdGljcyBkZWZhdWx0c1xuICAgICAgICAgIHNjaGVtYXRpY0RlZmF1bHQsXG4gICAgICAgICAgaGlkZGVuOiBvcHQudmlzaWJsZSA9PT0gZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgICAgLmZpbHRlcih4ID0+IHgpXG4gICAgICAuZm9yRWFjaChvcHRpb24gPT4gdGhpcy5vcHRpb25zLnB1c2gob3B0aW9uKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcHJvZE9wdGlvbjogT3B0aW9uID0ge1xuICAgIG5hbWU6ICdwcm9kJyxcbiAgICBkZXNjcmlwdGlvbjogJ0ZsYWcgdG8gc2V0IGNvbmZpZ3VyYXRpb24gdG8gXCJwcm9kXCIuJyxcbiAgICB0eXBlOiBCb29sZWFuLFxuICB9O1xuXG4gIHByb3RlY3RlZCBjb25maWd1cmF0aW9uT3B0aW9uOiBPcHRpb24gPSB7XG4gICAgbmFtZTogJ2NvbmZpZ3VyYXRpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnU3BlY2lmeSB0aGUgY29uZmlndXJhdGlvbiB0byB1c2UuJyxcbiAgICB0eXBlOiBTdHJpbmcsXG4gICAgYWxpYXNlczogWydjJ10sXG4gIH07XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1bkFyY2hpdGVjdFRhcmdldChvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgdGFyZ2V0U3BlYyA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG5cbiAgICBjb25zdCBydW5TaW5nbGVUYXJnZXQgPSAodGFyZ2V0U3BlYzogVGFyZ2V0U3BlY2lmaWVyKSA9PiB0aGlzLl9hcmNoaXRlY3QucnVuKFxuICAgICAgdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHRhcmdldFNwZWMpLFxuICAgICAgeyBsb2dnZXI6IHRoaXMuX2xvZ2dlciB9LFxuICAgICkucGlwZShcbiAgICAgIG1hcCgoYnVpbGRFdmVudDogQnVpbGRFdmVudCkgPT4gYnVpbGRFdmVudC5zdWNjZXNzID8gMCA6IDEpLFxuICAgICk7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0YXJnZXRTcGVjLnByb2plY3QgJiYgdGhpcy50YXJnZXQpIHtcbiAgICAgICAgLy8gVGhpcyBydW5zIGVhY2ggdGFyZ2V0IHNlcXVlbnRpYWxseS5cbiAgICAgICAgLy8gUnVubmluZyB0aGVtIGluIHBhcmFsbGVsIHdvdWxkIGp1bWJsZSB0aGUgbG9nIG1lc3NhZ2VzLlxuICAgICAgICByZXR1cm4gYXdhaXQgZnJvbSh0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KSkucGlwZShcbiAgICAgICAgICBjb25jYXRNYXAocHJvamVjdCA9PiBydW5TaW5nbGVUYXJnZXQoeyAuLi50YXJnZXRTcGVjLCBwcm9qZWN0IH0pKSxcbiAgICAgICAgICB0b0FycmF5KCksXG4gICAgICAgICkudG9Qcm9taXNlKCkudGhlbihyZXN1bHRzID0+IHJlc3VsdHMuZXZlcnkocmVzID0+IHJlcyA9PT0gMCkgPyAwIDogMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYXdhaXQgcnVuU2luZ2xlVGFyZ2V0KHRhcmdldFNwZWMpLnRvUHJvbWlzZSgpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlIGluc3RhbmNlb2Ygc2NoZW1hLlNjaGVtYVZhbGlkYXRpb25FeGNlcHRpb24pIHtcbiAgICAgICAgY29uc3QgbmV3RXJyb3JzOiBzY2hlbWEuU2NoZW1hVmFsaWRhdG9yRXJyb3JbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHNjaGVtYUVycm9yIG9mIGUuZXJyb3JzKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYUVycm9yLmtleXdvcmQgPT09ICdhZGRpdGlvbmFsUHJvcGVydGllcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHVua25vd25Qcm9wZXJ0eSA9IHNjaGVtYUVycm9yLnBhcmFtcy5hZGRpdGlvbmFsUHJvcGVydHk7XG4gICAgICAgICAgICBpZiAodW5rbm93blByb3BlcnR5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGFzaGVzID0gdW5rbm93blByb3BlcnR5Lmxlbmd0aCA9PT0gMSA/ICctJyA6ICctLSc7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGBVbmtub3duIG9wdGlvbjogJyR7ZGFzaGVzfSR7dW5rbm93blByb3BlcnR5fSdgKTtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0Vycm9ycy5wdXNoKHNjaGVtYUVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdFcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKG5ldyBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbihuZXdFcnJvcnMpLm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGFyZ2V0TmFtZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZSA9IHRoaXMuX3dvcmtzcGFjZS5saXN0UHJvamVjdE5hbWVzKCkubWFwKHByb2plY3ROYW1lID0+XG4gICAgICB0aGlzLl9hcmNoaXRlY3QubGlzdFByb2plY3RUYXJnZXRzKHByb2plY3ROYW1lKS5pbmNsdWRlcyh0YXJnZXROYW1lKSA/IHByb2plY3ROYW1lIDogbnVsbCxcbiAgICApLmZpbHRlcih4ID0+ICEheCkgYXMgc3RyaW5nW107XG5cbiAgICBpZiAodGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgLy8gRm9yIG11bHRpIHRhcmdldCBjb21tYW5kcywgd2UgYWx3YXlzIGxpc3QgYWxsIHByb2plY3RzIHRoYXQgaGF2ZSB0aGUgdGFyZ2V0LlxuICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIHNpbmdsZSB0YXJnZXQgY29tbWFuZHMsIHdlIHRyeSB0cnkgdGhlIGRlZmF1bHQgcHJvamVjdCBwcm9qZWN0IGZpcnN0LFxuICAgICAgLy8gdGhlbiB0aGUgZnVsbCBsaXN0IGlmIGl0IGhhcyBhIHNpbmdsZSBwcm9qZWN0LCB0aGVuIGVycm9yIG91dC5cbiAgICAgIGNvbnN0IG1heWJlRGVmYXVsdFByb2plY3QgPSB0aGlzLl93b3Jrc3BhY2UuZ2V0RGVmYXVsdFByb2plY3ROYW1lKCk7XG4gICAgICBpZiAobWF5YmVEZWZhdWx0UHJvamVjdCAmJiBhbGxQcm9qZWN0c0ZvclRhcmdldE5hbWUuaW5jbHVkZXMobWF5YmVEZWZhdWx0UHJvamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIFttYXliZURlZmF1bHRQcm9qZWN0XTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZGV0ZXJtaW5lIGEgc2luZ2xlIHByb2plY3QgZm9yIHRoZSAnJHt0YXJnZXROYW1lfScgdGFyZ2V0LmApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2xvYWRXb3Jrc3BhY2VBbmRBcmNoaXRlY3QoKSB7XG4gICAgY29uc3Qgd29ya3NwYWNlTG9hZGVyID0gbmV3IFdvcmtzcGFjZUxvYWRlcih0aGlzLl9ob3N0KTtcblxuICAgIHJldHVybiB3b3Jrc3BhY2VMb2FkZXIubG9hZFdvcmtzcGFjZSh0aGlzLnByb2plY3Qucm9vdCkucGlwZShcbiAgICAgIHRhcCgod29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZSkgPT4gdGhpcy5fd29ya3NwYWNlID0gd29ya3NwYWNlKSxcbiAgICAgIGNvbmNhdE1hcCgod29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZSkgPT4ge1xuICAgICAgICByZXR1cm4gbmV3IEFyY2hpdGVjdCh3b3Jrc3BhY2UpLmxvYWRBcmNoaXRlY3QoKTtcbiAgICAgIH0pLFxuICAgICAgdGFwKChhcmNoaXRlY3Q6IEFyY2hpdGVjdCkgPT4gdGhpcy5fYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyk6IFRhcmdldFNwZWNpZmllciB7XG4gICAgbGV0IHByb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbiwgb3ZlcnJpZGVzO1xuXG4gICAgaWYgKG9wdGlvbnMudGFyZ2V0KSB7XG4gICAgICBbcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uXSA9IG9wdGlvbnMudGFyZ2V0LnNwbGl0KCc6Jyk7XG5cbiAgICAgIG92ZXJyaWRlcyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgICAgZGVsZXRlIG92ZXJyaWRlcy50YXJnZXQ7XG5cbiAgICAgIGlmIChvdmVycmlkZXMuY29uZmlndXJhdGlvbikge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gb3ZlcnJpZGVzLmNvbmZpZ3VyYXRpb247XG4gICAgICAgIGRlbGV0ZSBvdmVycmlkZXMuY29uZmlndXJhdGlvbjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcHJvamVjdCA9IG9wdGlvbnMucHJvamVjdDtcbiAgICAgIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgICAgY29uZmlndXJhdGlvbiA9IG9wdGlvbnMuY29uZmlndXJhdGlvbjtcbiAgICAgIGlmICghY29uZmlndXJhdGlvbiAmJiBvcHRpb25zLnByb2QpIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9ICdwcm9kdWN0aW9uJztcbiAgICAgIH1cblxuICAgICAgb3ZlcnJpZGVzID0geyAuLi5vcHRpb25zIH07XG5cbiAgICAgIGRlbGV0ZSBvdmVycmlkZXMuY29uZmlndXJhdGlvbjtcbiAgICAgIGRlbGV0ZSBvdmVycmlkZXMucHJvZDtcbiAgICAgIGRlbGV0ZSBvdmVycmlkZXMucHJvamVjdDtcbiAgICB9XG5cbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHByb2plY3QgPSAnJztcbiAgICB9XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgIHRhcmdldCA9ICcnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgY29uZmlndXJhdGlvbixcbiAgICAgIHRhcmdldCxcbiAgICAgIG92ZXJyaWRlcyxcbiAgICB9O1xuICB9XG59XG4iXX0=