"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable no-any
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7O0FBRUgsaURBQWlEO0FBQ2pELHlEQUttQztBQUNuQywrQ0FBaUY7QUFDakYsb0RBQWdGO0FBQ2hGLCtCQUEwQjtBQUMxQiwrQkFBNEI7QUFDNUIsOENBQThEO0FBQzlELGlFQUE2RDtBQUM3RCx1Q0FBNEM7QUFlNUMsc0JBQXVDLFNBQVEsaUJBQWdDO0lBQS9FOztRQUVVLFVBQUssR0FBRyxJQUFJLHFCQUFjLEVBQUUsQ0FBQztRQUc3QixZQUFPLEdBQUcsMEJBQW1CLEVBQUUsQ0FBQztRQUN4QyxxREFBcUQ7UUFDM0MsZ0JBQVcsR0FBRyxLQUFLLENBQUM7UUFFckIsWUFBTyxHQUFhLENBQUM7Z0JBQzVCLElBQUksRUFBRSxlQUFlO2dCQUNyQixXQUFXLEVBQUUsbUJBQW1CO2dCQUNoQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDZixDQUFDLENBQUM7UUFFTSxjQUFTLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQWlHdkIsZUFBVSxHQUFXO1lBQzdCLElBQUksRUFBRSxNQUFNO1lBQ1osV0FBVyxFQUFFLHNDQUFzQztZQUNuRCxJQUFJLEVBQUUsT0FBTztTQUNkLENBQUM7UUFFUSx3QkFBbUIsR0FBVztZQUN0QyxJQUFJLEVBQUUsZUFBZTtZQUNyQixXQUFXLEVBQUUsbUNBQW1DO1lBQ2hELElBQUksRUFBRSxNQUFNO1lBQ1osT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2YsQ0FBQztJQStISixDQUFDO0lBdk9jLFVBQVUsQ0FBQyxPQUFnQzs7WUFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLElBQUksQ0FDM0Ms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R0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQzFCLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3JCLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1lBQy9CLENBQUM7WUFFRCxTQUFTLHFCQUFRLE9BQU8sQ0FBRSxDQUFDO1lBRTNCLE9BQU8sU0FBUyxDQUFDLGFBQWEsQ0FBQztZQUMvQixPQUFPLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDdEIsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDO1FBQzNCLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDYixPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2YsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNaLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxDQUFDO1lBQ0wsT0FBTztZQUNQLGFBQWE7WUFDYixNQUFNO1lBQ04sU0FBUztTQUNWLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUEzUEQsNENBMlBDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgbm8tYW55XG5pbXBvcnQge1xuICBBcmNoaXRlY3QsXG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXJEZXNjcmlwdGlvbixcbiAgVGFyZ2V0U3BlY2lmaWVyLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IEpzb25PYmplY3QsIGV4cGVyaW1lbnRhbCwgc2NoZW1hLCBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZUpzU3luY0hvc3QsIGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmcm9tIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwLCB0b0FycmF5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgV29ya3NwYWNlTG9hZGVyIH0gZnJvbSAnLi4vbW9kZWxzL3dvcmtzcGFjZS1sb2FkZXInO1xuaW1wb3J0IHsgQ29tbWFuZCwgT3B0aW9uIH0gZnJvbSAnLi9jb21tYW5kJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3RBbmRDb25maWd1cmF0aW9uT3B0aW9ucyB7XG4gIHByb2plY3Q/OiBzdHJpbmc7XG4gIGNvbmZpZ3VyYXRpb24/OiBzdHJpbmc7XG4gIHByb2Q6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGFyZ2V0T3B0aW9ucyB7XG4gIHRhcmdldD86IHN0cmluZztcbn1cblxuZXhwb3J0IHR5cGUgQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMgPSBQcm9qZWN0QW5kQ29uZmlndXJhdGlvbk9wdGlvbnMgJiBUYXJnZXRPcHRpb25zICYgSnNvbk9iamVjdDtcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdENvbW1hbmQgZXh0ZW5kcyBDb21tYW5kPEFyY2hpdGVjdENvbW1hbmRPcHRpb25zPiB7XG5cbiAgcHJpdmF0ZSBfaG9zdCA9IG5ldyBOb2RlSnNTeW5jSG9zdCgpO1xuICBwcml2YXRlIF9hcmNoaXRlY3Q6IEFyY2hpdGVjdDtcbiAgcHJpdmF0ZSBfd29ya3NwYWNlOiBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZTtcbiAgcHJpdmF0ZSBfbG9nZ2VyID0gY3JlYXRlQ29uc29sZUxvZ2dlcigpO1xuICAvLyBJZiB0aGlzIGNvbW1hbmQgc3VwcG9ydHMgcnVubmluZyBtdWx0aXBsZSB0YXJnZXRzLlxuICBwcm90ZWN0ZWQgbXVsdGlUYXJnZXQgPSBmYWxzZTtcblxuICByZWFkb25seSBPcHRpb25zOiBPcHRpb25bXSA9IFt7XG4gICAgbmFtZTogJ2NvbmZpZ3VyYXRpb24nLFxuICAgIGRlc2NyaXB0aW9uOiAnVGhlIGNvbmZpZ3VyYXRpb24nLFxuICAgIHR5cGU6IFN0cmluZyxcbiAgICBhbGlhc2VzOiBbJ2MnXSxcbiAgfV07XG5cbiAgcmVhZG9ubHkgYXJndW1lbnRzID0gWydwcm9qZWN0J107XG5cbiAgdGFyZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgcHVibGljIGFzeW5jIGluaXRpYWxpemUob3B0aW9uczogQXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5fbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoKCkgPT4ge1xuICAgICAgICBjb25zdCB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuXG4gICAgICAgIGlmICh0aGlzLnRhcmdldCAmJiAhdGFyZ2V0U3BlYy5wcm9qZWN0KSB7XG4gICAgICAgICAgY29uc3QgcHJvamVjdHMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KTtcblxuICAgICAgICAgIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIGEgc2luZ2xlIHRhcmdldCwgdXNlIGl0IHRvIHBhcnNlIG92ZXJyaWRlcy5cbiAgICAgICAgICAgIHRhcmdldFNwZWMucHJvamVjdCA9IHByb2plY3RzWzBdO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBNdWx0aXBsZSB0YXJnZXRzIGNhbiBoYXZlIGRpZmZlcmVudCwgaW5jb21wYXRpYmxlIG9wdGlvbnMuXG4gICAgICAgICAgICAvLyBXZSBvbmx5IGxvb2t1cCBvcHRpb25zIGZvciBzaW5nbGUgdGFyZ2V0cy5cbiAgICAgICAgICAgIHJldHVybiBvZihudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRhcmdldFNwZWMucHJvamVjdCB8fCAhdGFyZ2V0U3BlYy50YXJnZXQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlcm1pbmUgcHJvamVjdCBvciB0YXJnZXQgZm9yIEFyY2hpdGVjdCBjb21tYW5kLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYnVpbGRlckNvbmZpZyA9IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyQ29uZmlndXJhdGlvbih0YXJnZXRTcGVjKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJEZXNjcmlwdGlvbihidWlsZGVyQ29uZmlnKS5waXBlKFxuICAgICAgICAgIHRhcDxCdWlsZGVyRGVzY3JpcHRpb24+KGJ1aWxkZXJEZXNjID0+IHsgdGhpcy5tYXBBcmNoaXRlY3RPcHRpb25zKGJ1aWxkZXJEZXNjLnNjaGVtYSk7IH0pLFxuICAgICAgICApO1xuICAgICAgfSksXG4gICAgKS50b1Byb21pc2UoKVxuICAgICAgLnRoZW4oKCkgPT4geyB9KTtcbiAgfVxuXG4gIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5wcm9qZWN0ICYmIHRoaXMudGFyZ2V0KSB7XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZXMgPSB0aGlzLmdldFByb2plY3ROYW1lc0J5VGFyZ2V0KHRoaXMudGFyZ2V0KTtcbiAgICAgIGNvbnN0IHsgb3ZlcnJpZGVzIH0gPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuICAgICAgaWYgKHByb2plY3ROYW1lcy5sZW5ndGggPiAxICYmIE9iamVjdC5rZXlzKG92ZXJyaWRlcyB8fCB7fSkubGVuZ3RoID4gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyY2hpdGVjdCBjb21tYW5kcyB3aXRoIG11bHRpcGxlIHRhcmdldHMgY2Fubm90IHNwZWNpZnkgb3ZlcnJpZGVzLidcbiAgICAgICAgICArIGAnJHt0aGlzLnRhcmdldH0nIHdvdWxkIGJlIHJ1biBvbiB0aGUgZm9sbG93aW5nIHByb2plY3RzOiAke3Byb2plY3ROYW1lcy5qb2luKCl9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcm90ZWN0ZWQgbWFwQXJjaGl0ZWN0T3B0aW9ucyhzY2hlbWE6IGFueSkge1xuICAgIGNvbnN0IHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcztcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyk7XG4gICAga2V5c1xuICAgICAgLm1hcChrZXkgPT4gKHsgLi4ucHJvcGVydGllc1trZXldLCAuLi57IG5hbWU6IHN0cmluZ3MuZGFzaGVyaXplKGtleSkgfSB9KSlcbiAgICAgIC5tYXAob3B0ID0+IHtcbiAgICAgICAgbGV0IHR5cGU7XG4gICAgICAgIGNvbnN0IHNjaGVtYXRpY1R5cGUgPSBvcHQudHlwZTtcbiAgICAgICAgc3dpdGNoIChvcHQudHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICB0eXBlID0gU3RyaW5nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICB0eXBlID0gQm9vbGVhbjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICB0eXBlID0gTnVtYmVyO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAvLyBJZ25vcmUgYXJyYXlzIC8gb2JqZWN0cy5cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGFsaWFzZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGlmIChvcHQuYWxpYXMpIHtcbiAgICAgICAgICBhbGlhc2VzID0gWy4uLmFsaWFzZXMsIG9wdC5hbGlhc107XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdC5hbGlhc2VzKSB7XG4gICAgICAgICAgYWxpYXNlcyA9IFsuLi5hbGlhc2VzLCAuLi5vcHQuYWxpYXNlc107XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzY2hlbWF0aWNEZWZhdWx0ID0gb3B0LmRlZmF1bHQ7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgYWxpYXNlcyxcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIHNjaGVtYXRpY1R5cGUsXG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLCAvLyBkbyBub3QgY2Fycnkgb3ZlciBzY2hlbWF0aWNzIGRlZmF1bHRzXG4gICAgICAgICAgc2NoZW1hdGljRGVmYXVsdCxcbiAgICAgICAgICBoaWRkZW46IG9wdC52aXNpYmxlID09PSBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICAuZmlsdGVyKHggPT4geClcbiAgICAgIC5mb3JFYWNoKG9wdGlvbiA9PiB0aGlzLm9wdGlvbnMucHVzaChvcHRpb24pKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwcm9kT3B0aW9uOiBPcHRpb24gPSB7XG4gICAgbmFtZTogJ3Byb2QnLFxuICAgIGRlc2NyaXB0aW9uOiAnRmxhZyB0byBzZXQgY29uZmlndXJhdGlvbiB0byBcInByb2RcIi4nLFxuICAgIHR5cGU6IEJvb2xlYW4sXG4gIH07XG5cbiAgcHJvdGVjdGVkIGNvbmZpZ3VyYXRpb25PcHRpb246IE9wdGlvbiA9IHtcbiAgICBuYW1lOiAnY29uZmlndXJhdGlvbicsXG4gICAgZGVzY3JpcHRpb246ICdTcGVjaWZ5IHRoZSBjb25maWd1cmF0aW9uIHRvIHVzZS4nLFxuICAgIHR5cGU6IFN0cmluZyxcbiAgICBhbGlhc2VzOiBbJ2MnXSxcbiAgfTtcblxuICBwcm90ZWN0ZWQgYXN5bmMgcnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB0YXJnZXRTcGVjID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcblxuICAgIGNvbnN0IHJ1blNpbmdsZVRhcmdldCA9ICh0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIpID0+IHRoaXMuX2FyY2hpdGVjdC5ydW4oXG4gICAgICB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24odGFyZ2V0U3BlYyksXG4gICAgICB7IGxvZ2dlcjogdGhpcy5fbG9nZ2VyIH0sXG4gICAgKS5waXBlKFxuICAgICAgbWFwKChidWlsZEV2ZW50OiBCdWlsZEV2ZW50KSA9PiBidWlsZEV2ZW50LnN1Y2Nlc3MgPyAwIDogMSksXG4gICAgKTtcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRhcmdldFNwZWMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgICAvLyBUaGlzIHJ1bnMgZWFjaCB0YXJnZXQgc2VxdWVudGlhbGx5LlxuICAgICAgICAvLyBSdW5uaW5nIHRoZW0gaW4gcGFyYWxsZWwgd291bGQganVtYmxlIHRoZSBsb2cgbWVzc2FnZXMuXG4gICAgICAgIHJldHVybiBhd2FpdCBmcm9tKHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpKS5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcChwcm9qZWN0ID0+IHJ1blNpbmdsZVRhcmdldCh7IC4uLnRhcmdldFNwZWMsIHByb2plY3QgfSkpLFxuICAgICAgICAgIHRvQXJyYXkoKSxcbiAgICAgICAgKS50b1Byb21pc2UoKS50aGVuKHJlc3VsdHMgPT4gcmVzdWx0cy5ldmVyeShyZXMgPT4gcmVzID09PSAwKSA/IDAgOiAxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhd2FpdCBydW5TaW5nbGVUYXJnZXQodGFyZ2V0U3BlYykudG9Qcm9taXNlKCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICBjb25zdCBuZXdFcnJvcnM6IHNjaGVtYS5TY2hlbWFWYWxpZGF0b3JFcnJvcltdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2NoZW1hRXJyb3Igb2YgZS5lcnJvcnMpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hRXJyb3Iua2V5d29yZCA9PT0gJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJykge1xuICAgICAgICAgICAgY29uc3QgdW5rbm93blByb3BlcnR5ID0gc2NoZW1hRXJyb3IucGFyYW1zLmFkZGl0aW9uYWxQcm9wZXJ0eTtcbiAgICAgICAgICAgIGlmICh1bmtub3duUHJvcGVydHkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICBjb25zdCBkYXNoZXMgPSB1bmtub3duUHJvcGVydHkubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJztcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHtkYXNoZXN9JHt1bmtub3duUHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RXJyb3JzLnB1c2goc2NoZW1hRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0Vycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IobmV3IHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKG5ld0Vycm9ycykubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXROYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lID0gdGhpcy5fd29ya3NwYWNlLmxpc3RQcm9qZWN0TmFtZXMoKS5tYXAocHJvamVjdE5hbWUgPT5cbiAgICAgIHRoaXMuX2FyY2hpdGVjdC5saXN0UHJvamVjdFRhcmdldHMocHJvamVjdE5hbWUpLmluY2x1ZGVzKHRhcmdldE5hbWUpID8gcHJvamVjdE5hbWUgOiBudWxsLFxuICAgICkuZmlsdGVyKHggPT4gISF4KSBhcyBzdHJpbmdbXTtcblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igc2luZ2xlIHRhcmdldCBjb21tYW5kcywgd2UgdHJ5IHRyeSB0aGUgZGVmYXVsdCBwcm9qZWN0IHByb2plY3QgZmlyc3QsXG4gICAgICAvLyB0aGVuIHRoZSBmdWxsIGxpc3QgaWYgaXQgaGFzIGEgc2luZ2xlIHByb2plY3QsIHRoZW4gZXJyb3Igb3V0LlxuICAgICAgY29uc3QgbWF5YmVEZWZhdWx0UHJvamVjdCA9IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgIGlmIChtYXliZURlZmF1bHRQcm9qZWN0ICYmIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZURlZmF1bHRQcm9qZWN0KSkge1xuICAgICAgICByZXR1cm4gW21heWJlRGVmYXVsdFByb2plY3RdO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBkZXRlcm1pbmUgYSBzaW5nbGUgcHJvamVjdCBmb3IgdGhlICcke3RhcmdldE5hbWV9JyB0YXJnZXQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpIHtcbiAgICBjb25zdCB3b3Jrc3BhY2VMb2FkZXIgPSBuZXcgV29ya3NwYWNlTG9hZGVyKHRoaXMuX2hvc3QpO1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZUxvYWRlci5sb2FkV29ya3NwYWNlKHRoaXMucHJvamVjdC5yb290KS5waXBlKFxuICAgICAgdGFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB0aGlzLl93b3Jrc3BhY2UgPSB3b3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKCh3b3Jrc3BhY2U6IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgQXJjaGl0ZWN0KHdvcmtzcGFjZSkubG9hZEFyY2hpdGVjdCgpO1xuICAgICAgfSksXG4gICAgICB0YXAoKGFyY2hpdGVjdDogQXJjaGl0ZWN0KSA9PiB0aGlzLl9hcmNoaXRlY3QgPSBhcmNoaXRlY3QpLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogVGFyZ2V0U3BlY2lmaWVyIHtcbiAgICBsZXQgcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uLCBvdmVycmlkZXM7XG5cbiAgICBpZiAob3B0aW9ucy50YXJnZXQpIHtcbiAgICAgIFtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb25dID0gb3B0aW9ucy50YXJnZXQuc3BsaXQoJzonKTtcblxuICAgICAgb3ZlcnJpZGVzID0geyAuLi5vcHRpb25zIH07XG4gICAgICBkZWxldGUgb3ZlcnJpZGVzLnRhcmdldDtcblxuICAgICAgaWYgKG92ZXJyaWRlcy5jb25maWd1cmF0aW9uKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSBvdmVycmlkZXMuY29uZmlndXJhdGlvbjtcbiAgICAgICAgZGVsZXRlIG92ZXJyaWRlcy5jb25maWd1cmF0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9qZWN0ID0gb3B0aW9ucy5wcm9qZWN0O1xuICAgICAgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICBjb25maWd1cmF0aW9uID0gb3B0aW9ucy5jb25maWd1cmF0aW9uO1xuICAgICAgaWYgKCFjb25maWd1cmF0aW9uICYmIG9wdGlvbnMucHJvZCkge1xuICAgICAgICBjb25maWd1cmF0aW9uID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgfVxuXG4gICAgICBvdmVycmlkZXMgPSB7IC4uLm9wdGlvbnMgfTtcblxuICAgICAgZGVsZXRlIG92ZXJyaWRlcy5jb25maWd1cmF0aW9uO1xuICAgICAgZGVsZXRlIG92ZXJyaWRlcy5wcm9kO1xuICAgICAgZGVsZXRlIG92ZXJyaWRlcy5wcm9qZWN0O1xuICAgIH1cblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcHJvamVjdCA9ICcnO1xuICAgIH1cbiAgICBpZiAoIXRhcmdldCkge1xuICAgICAgdGFyZ2V0ID0gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgICAgdGFyZ2V0LFxuICAgICAgb3ZlcnJpZGVzLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==