"use strict";
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
const json_schema_1 = require("../utilities/json-schema");
const command_1 = require("./command");
const parser_1 = require("./parser");
const workspace_loader_1 = require("./workspace-loader");
class ArchitectCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this._host = new node_1.NodeJsSyncHost();
        this._logger = node_1.createConsoleLogger();
        // If this command supports running multiple targets.
        this.multiTarget = false;
    }
    async initialize(options) {
        await super.initialize(options);
        this._registry = new core_1.json.schema.CoreSchemaRegistry();
        this._registry.addPostTransform(core_1.json.schema.transforms.addUndefinedDefaults);
        await this._loadWorkspaceAndArchitect().toPromise();
        if (!options.project && this.target) {
            const projectNames = this.getProjectNamesByTarget(this.target);
            const leftovers = options['--'];
            if (projectNames.length > 1 && leftovers && leftovers.length > 0) {
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
        const targetSpec = this._makeTargetSpecifier(options);
        if (this.target && !targetSpec.project) {
            const projects = this.getProjectNamesByTarget(this.target);
            if (projects.length === 1) {
                // If there is a single target, use it to parse overrides.
                targetSpec.project = projects[0];
            }
        }
        if ((!targetSpec.project || !targetSpec.target) && !this.multiTarget) {
            if (options.help) {
                // This is a special case where we just return.
                return;
            }
            throw new Error('Cannot determine project or target for Architect command.');
        }
        if (this.target) {
            // Add options IF there's only one builder of this kind.
            const projectNames = this.getProjectNamesByTarget(this.target);
            const builderConfigurations = [];
            for (const projectName of projectNames) {
                const targetSpec = this._makeTargetSpecifier(options);
                const targetDesc = this._architect.getBuilderConfiguration({
                    project: projectName,
                    target: targetSpec.target,
                });
                if (!builderConfigurations.find(b => b.builder === targetDesc.builder)) {
                    builderConfigurations.push(targetDesc);
                }
            }
            if (builderConfigurations.length == 1) {
                const builderConf = builderConfigurations[0];
                const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
                this.description.options.push(...(await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema)));
            }
        }
    }
    async run(options) {
        return await this.runArchitectTarget(options);
    }
    async runArchitectTarget(options) {
        const runSingleTarget = async (targetSpec) => {
            // We need to build the builderSpec twice because architect does not understand
            // overrides separately (getting the configuration builds the whole project, including
            // overrides).
            const builderConf = this._architect.getBuilderConfiguration(targetSpec);
            const builderDesc = await this._architect.getBuilderDescription(builderConf).toPromise();
            const targetOptionArray = await json_schema_1.parseJsonSchemaToOptions(this._registry, builderDesc.schema);
            const overrides = parser_1.parseArguments(options['--'] || [], targetOptionArray);
            if (overrides['--']) {
                (overrides['--'] || []).forEach(additional => {
                    this.logger.warn(`Unknown option: '${additional.split(/=/)[0]}'`);
                });
                return 1;
            }
            const realBuilderConf = this._architect.getBuilderConfiguration(Object.assign({}, targetSpec, { overrides }));
            return this._architect.run(realBuilderConf, { logger: this._logger }).pipe(operators_1.map((buildEvent) => buildEvent.success ? 0 : 1)).toPromise();
        };
        try {
            const targetSpec = this._makeTargetSpecifier(options);
            if (!targetSpec.project && this.target) {
                // This runs each target sequentially.
                // Running them in parallel would jumble the log messages.
                return await rxjs_1.from(this.getProjectNamesByTarget(this.target)).pipe(operators_1.concatMap(project => rxjs_1.from(runSingleTarget(Object.assign({}, targetSpec, { project })))), operators_1.toArray(), operators_1.map(results => results.every(res => res === 0) ? 0 : 1))
                    .toPromise();
            }
            else {
                return await runSingleTarget(targetSpec);
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
        return workspaceLoader.loadWorkspace(this.workspace.root).pipe(operators_1.tap((workspace) => this._workspace = workspace), operators_1.concatMap((workspace) => {
            return new architect_1.Architect(workspace).loadArchitect();
        }), operators_1.tap((architect) => this._architect = architect));
    }
    _makeTargetSpecifier(commandOptions) {
        let project, target, configuration;
        if (commandOptions.target) {
            [project, target, configuration] = commandOptions.target.split(':');
            if (commandOptions.configuration) {
                configuration = commandOptions.configuration;
            }
        }
        else {
            project = commandOptions.project;
            target = this.target;
            configuration = commandOptions.configuration;
            if (!configuration && commandOptions.prod) {
                configuration = 'production';
            }
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
        };
    }
}
exports.ArchitectCommand = ArchitectCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL21vZGVscy9hcmNoaXRlY3QtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILHlEQUttQztBQUNuQywrQ0FBd0U7QUFDeEUsb0RBQWdGO0FBQ2hGLCtCQUE0QjtBQUM1Qiw4Q0FBOEQ7QUFDOUQsMERBQW9FO0FBQ3BFLHVDQUF3RDtBQUV4RCxxQ0FBMEM7QUFDMUMseURBQXFEO0FBU3JELE1BQXNCLGdCQUVwQixTQUFRLGlCQUFnQztJQUYxQzs7UUFHVSxVQUFLLEdBQUcsSUFBSSxxQkFBYyxFQUFFLENBQUM7UUFHM0IsWUFBTyxHQUFHLDBCQUFtQixFQUFFLENBQUM7UUFJMUMscURBQXFEO1FBQzNDLGdCQUFXLEdBQUcsS0FBSyxDQUFDO0lBa09oQyxDQUFDO0lBOU5RLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBNEM7UUFDbEUsTUFBTSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxXQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTdFLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNuQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9ELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJ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R29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBBcmNoaXRlY3QsXG4gIEJ1aWxkRXZlbnQsXG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uLFxuICBUYXJnZXRTcGVjaWZpZXIsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgZXhwZXJpbWVudGFsLCBqc29uLCBzY2hlbWEsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBOb2RlSnNTeW5jSG9zdCwgY3JlYXRlQ29uc29sZUxvZ2dlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlL25vZGUnO1xuaW1wb3J0IHsgZnJvbSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY29uY2F0TWFwLCBtYXAsIHRhcCwgdG9BcnJheSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IHBhcnNlSnNvblNjaGVtYVRvT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdGllcy9qc29uLXNjaGVtYSc7XG5pbXBvcnQgeyBCYXNlQ29tbWFuZE9wdGlvbnMsIENvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgcGFyc2VBcmd1bWVudHMgfSBmcm9tICcuL3BhcnNlcic7XG5pbXBvcnQgeyBXb3Jrc3BhY2VMb2FkZXIgfSBmcm9tICcuL3dvcmtzcGFjZS1sb2FkZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFyY2hpdGVjdENvbW1hbmRPcHRpb25zIGV4dGVuZHMgQmFzZUNvbW1hbmRPcHRpb25zIHtcbiAgcHJvamVjdD86IHN0cmluZztcbiAgY29uZmlndXJhdGlvbj86IHN0cmluZztcbiAgcHJvZD86IGJvb2xlYW47XG4gIHRhcmdldD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFyY2hpdGVjdENvbW1hbmQ8XG4gIFQgZXh0ZW5kcyBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyA9IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zLFxuPiBleHRlbmRzIENvbW1hbmQ8QXJjaGl0ZWN0Q29tbWFuZE9wdGlvbnM+IHtcbiAgcHJpdmF0ZSBfaG9zdCA9IG5ldyBOb2RlSnNTeW5jSG9zdCgpO1xuICBwcm90ZWN0ZWQgX2FyY2hpdGVjdDogQXJjaGl0ZWN0O1xuICBwcm90ZWN0ZWQgX3dvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2U7XG4gIHByb3RlY3RlZCBfbG9nZ2VyID0gY3JlYXRlQ29uc29sZUxvZ2dlcigpO1xuXG4gIHByb3RlY3RlZCBfcmVnaXN0cnk6IGpzb24uc2NoZW1hLlNjaGVtYVJlZ2lzdHJ5O1xuXG4gIC8vIElmIHRoaXMgY29tbWFuZCBzdXBwb3J0cyBydW5uaW5nIG11bHRpcGxlIHRhcmdldHMuXG4gIHByb3RlY3RlZCBtdWx0aVRhcmdldCA9IGZhbHNlO1xuXG4gIHRhcmdldDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIHB1YmxpYyBhc3luYyBpbml0aWFsaXplKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgc3VwZXIuaW5pdGlhbGl6ZShvcHRpb25zKTtcblxuICAgIHRoaXMuX3JlZ2lzdHJ5ID0gbmV3IGpzb24uc2NoZW1hLkNvcmVTY2hlbWFSZWdpc3RyeSgpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LmFkZFBvc3RUcmFuc2Zvcm0oanNvbi5zY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG5cbiAgICBhd2FpdCB0aGlzLl9sb2FkV29ya3NwYWNlQW5kQXJjaGl0ZWN0KCkudG9Qcm9taXNlKCk7XG5cbiAgICBpZiAoIW9wdGlvbnMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG4gICAgICBjb25zdCBsZWZ0b3ZlcnMgPSBvcHRpb25zWyctLSddO1xuICAgICAgaWYgKHByb2plY3ROYW1lcy5sZW5ndGggPiAxICYmIGxlZnRvdmVycyAmJiBsZWZ0b3ZlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBWZXJpZnkgdGhhdCBhbGwgYnVpbGRlcnMgYXJlIHRoZSBzYW1lLCBvdGhlcndpc2UgZXJyb3Igb3V0IChzaW5jZSB0aGUgbWVhbmluZyBvZiBhblxuICAgICAgICAvLyBvcHRpb24gY291bGQgdmFyeSBmcm9tIGJ1aWxkZXIgdG8gYnVpbGRlcikuXG5cbiAgICAgICAgY29uc3QgYnVpbGRlcnM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgcHJvamVjdE5hbWUgb2YgcHJvamVjdE5hbWVzKSB7XG4gICAgICAgICAgY29uc3QgdGFyZ2V0U3BlYzogVGFyZ2V0U3BlY2lmaWVyID0gdGhpcy5fbWFrZVRhcmdldFNwZWNpZmllcihvcHRpb25zKTtcbiAgICAgICAgICBjb25zdCB0YXJnZXREZXNjID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHtcbiAgICAgICAgICAgIHByb2plY3Q6IHByb2plY3ROYW1lLFxuICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXRTcGVjLnRhcmdldCxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChidWlsZGVycy5pbmRleE9mKHRhcmdldERlc2MuYnVpbGRlcikgPT0gLTEpIHtcbiAgICAgICAgICAgIGJ1aWxkZXJzLnB1c2godGFyZ2V0RGVzYy5idWlsZGVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYnVpbGRlcnMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICBBcmNoaXRlY3QgY29tbWFuZHMgd2l0aCBjb21tYW5kIGxpbmUgb3ZlcnJpZGVzIGNhbm5vdCB0YXJnZXQgZGlmZmVyZW50IGJ1aWxkZXJzLiBUaGVcbiAgICAgICAgICAgICcke3RoaXMudGFyZ2V0fScgdGFyZ2V0IHdvdWxkIHJ1biBvbiBwcm9qZWN0cyAke3Byb2plY3ROYW1lcy5qb2luKCl9IHdoaWNoIGhhdmUgdGhlXG4gICAgICAgICAgICBmb2xsb3dpbmcgYnVpbGRlcnM6ICR7J1xcbiAgJyArIGJ1aWxkZXJzLmpvaW4oJ1xcbiAgJyl9XG4gICAgICAgICAgYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXRTcGVjOiBUYXJnZXRTcGVjaWZpZXIgPSB0aGlzLl9tYWtlVGFyZ2V0U3BlY2lmaWVyKG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudGFyZ2V0ICYmICF0YXJnZXRTcGVjLnByb2plY3QpIHtcbiAgICAgIGNvbnN0IHByb2plY3RzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG5cbiAgICAgIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gSWYgdGhlcmUgaXMgYSBzaW5nbGUgdGFyZ2V0LCB1c2UgaXQgdG8gcGFyc2Ugb3ZlcnJpZGVzLlxuICAgICAgICB0YXJnZXRTcGVjLnByb2plY3QgPSBwcm9qZWN0c1swXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoKCF0YXJnZXRTcGVjLnByb2plY3QgfHwgIXRhcmdldFNwZWMudGFyZ2V0KSAmJiAhdGhpcy5tdWx0aVRhcmdldCkge1xuICAgICAgaWYgKG9wdGlvbnMuaGVscCkge1xuICAgICAgICAvLyBUaGlzIGlzIGEgc3BlY2lhbCBjYXNlIHdoZXJlIHdlIGp1c3QgcmV0dXJuLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGRldGVybWluZSBwcm9qZWN0IG9yIHRhcmdldCBmb3IgQXJjaGl0ZWN0IGNvbW1hbmQuJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGFyZ2V0KSB7XG4gICAgICAvLyBBZGQgb3B0aW9ucyBJRiB0aGVyZSdzIG9ubHkgb25lIGJ1aWxkZXIgb2YgdGhpcyBraW5kLlxuICAgICAgY29uc3QgcHJvamVjdE5hbWVzID0gdGhpcy5nZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0aGlzLnRhcmdldCk7XG4gICAgICBjb25zdCBidWlsZGVyQ29uZmlndXJhdGlvbnM6IEJ1aWxkZXJDb25maWd1cmF0aW9uW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdE5hbWUgb2YgcHJvamVjdE5hbWVzKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFNwZWM6IFRhcmdldFNwZWNpZmllciA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlc2MgPSB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckNvbmZpZ3VyYXRpb24oe1xuICAgICAgICAgIHByb2plY3Q6IHByb2plY3ROYW1lLFxuICAgICAgICAgIHRhcmdldDogdGFyZ2V0U3BlYy50YXJnZXQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghYnVpbGRlckNvbmZpZ3VyYXRpb25zLmZpbmQoYiA9PiBiLmJ1aWxkZXIgPT09IHRhcmdldERlc2MuYnVpbGRlcikpIHtcbiAgICAgICAgICBidWlsZGVyQ29uZmlndXJhdGlvbnMucHVzaCh0YXJnZXREZXNjKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoYnVpbGRlckNvbmZpZ3VyYXRpb25zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gYnVpbGRlckNvbmZpZ3VyYXRpb25zWzBdO1xuICAgICAgICBjb25zdCBidWlsZGVyRGVzYyA9IGF3YWl0IHRoaXMuX2FyY2hpdGVjdC5nZXRCdWlsZGVyRGVzY3JpcHRpb24oYnVpbGRlckNvbmYpLnRvUHJvbWlzZSgpO1xuXG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24ub3B0aW9ucy5wdXNoKC4uLihcbiAgICAgICAgICBhd2FpdCBwYXJzZUpzb25TY2hlbWFUb09wdGlvbnModGhpcy5fcmVnaXN0cnksIGJ1aWxkZXJEZXNjLnNjaGVtYSlcbiAgICAgICAgKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcnVuKG9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zICYgQXJndW1lbnRzKSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucnVuQXJjaGl0ZWN0VGFyZ2V0KG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJ1bkFyY2hpdGVjdFRhcmdldChcbiAgICBvcHRpb25zOiBBcmNoaXRlY3RDb21tYW5kT3B0aW9ucyAmIEFyZ3VtZW50cyxcbiAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBydW5TaW5nbGVUYXJnZXQgPSBhc3luYyAodGFyZ2V0U3BlYzogVGFyZ2V0U3BlY2lmaWVyKSA9PiB7XG4gICAgICAvLyBXZSBuZWVkIHRvIGJ1aWxkIHRoZSBidWlsZGVyU3BlYyB0d2ljZSBiZWNhdXNlIGFyY2hpdGVjdCBkb2VzIG5vdCB1bmRlcnN0YW5kXG4gICAgICAvLyBvdmVycmlkZXMgc2VwYXJhdGVseSAoZ2V0dGluZyB0aGUgY29uZmlndXJhdGlvbiBidWlsZHMgdGhlIHdob2xlIHByb2plY3QsIGluY2x1ZGluZ1xuICAgICAgLy8gb3ZlcnJpZGVzKS5cbiAgICAgIGNvbnN0IGJ1aWxkZXJDb25mID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHRhcmdldFNwZWMpO1xuICAgICAgY29uc3QgYnVpbGRlckRlc2MgPSBhd2FpdCB0aGlzLl9hcmNoaXRlY3QuZ2V0QnVpbGRlckRlc2NyaXB0aW9uKGJ1aWxkZXJDb25mKS50b1Byb21pc2UoKTtcbiAgICAgIGNvbnN0IHRhcmdldE9wdGlvbkFycmF5ID0gYXdhaXQgcGFyc2VKc29uU2NoZW1hVG9PcHRpb25zKHRoaXMuX3JlZ2lzdHJ5LCBidWlsZGVyRGVzYy5zY2hlbWEpO1xuICAgICAgY29uc3Qgb3ZlcnJpZGVzID0gcGFyc2VBcmd1bWVudHMob3B0aW9uc1snLS0nXSB8fCBbXSwgdGFyZ2V0T3B0aW9uQXJyYXkpO1xuXG4gICAgICBpZiAob3ZlcnJpZGVzWyctLSddKSB7XG4gICAgICAgIChvdmVycmlkZXNbJy0tJ10gfHwgW10pLmZvckVhY2goYWRkaXRpb25hbCA9PiB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgVW5rbm93biBvcHRpb246ICcke2FkZGl0aW9uYWwuc3BsaXQoLz0vKVswXX0nYCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVhbEJ1aWxkZXJDb25mID0gdGhpcy5fYXJjaGl0ZWN0LmdldEJ1aWxkZXJDb25maWd1cmF0aW9uKHsgLi4udGFyZ2V0U3BlYywgb3ZlcnJpZGVzIH0pO1xuXG4gICAgICByZXR1cm4gdGhpcy5fYXJjaGl0ZWN0LnJ1bihyZWFsQnVpbGRlckNvbmYsIHsgbG9nZ2VyOiB0aGlzLl9sb2dnZXIgfSkucGlwZShcbiAgICAgICAgbWFwKChidWlsZEV2ZW50OiBCdWlsZEV2ZW50KSA9PiBidWlsZEV2ZW50LnN1Y2Nlc3MgPyAwIDogMSksXG4gICAgICApLnRvUHJvbWlzZSgpO1xuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFyZ2V0U3BlYyA9IHRoaXMuX21ha2VUYXJnZXRTcGVjaWZpZXIob3B0aW9ucyk7XG4gICAgICBpZiAoIXRhcmdldFNwZWMucHJvamVjdCAmJiB0aGlzLnRhcmdldCkge1xuICAgICAgICAvLyBUaGlzIHJ1bnMgZWFjaCB0YXJnZXQgc2VxdWVudGlhbGx5LlxuICAgICAgICAvLyBSdW5uaW5nIHRoZW0gaW4gcGFyYWxsZWwgd291bGQganVtYmxlIHRoZSBsb2cgbWVzc2FnZXMuXG4gICAgICAgIHJldHVybiBhd2FpdCBmcm9tKHRoaXMuZ2V0UHJvamVjdE5hbWVzQnlUYXJnZXQodGhpcy50YXJnZXQpKS5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcChwcm9qZWN0ID0+IGZyb20ocnVuU2luZ2xlVGFyZ2V0KHsgLi4udGFyZ2V0U3BlYywgcHJvamVjdCB9KSkpLFxuICAgICAgICAgIHRvQXJyYXkoKSxcbiAgICAgICAgICBtYXAocmVzdWx0cyA9PiByZXN1bHRzLmV2ZXJ5KHJlcyA9PiByZXMgPT09IDApID8gMCA6IDEpLFxuICAgICAgICApXG4gICAgICAgIC50b1Byb21pc2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBhd2FpdCBydW5TaW5nbGVUYXJnZXQodGFyZ2V0U3BlYyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgaW5zdGFuY2VvZiBzY2hlbWEuU2NoZW1hVmFsaWRhdGlvbkV4Y2VwdGlvbikge1xuICAgICAgICBjb25zdCBuZXdFcnJvcnM6IHNjaGVtYS5TY2hlbWFWYWxpZGF0b3JFcnJvcltdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2NoZW1hRXJyb3Igb2YgZS5lcnJvcnMpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hRXJyb3Iua2V5d29yZCA9PT0gJ2FkZGl0aW9uYWxQcm9wZXJ0aWVzJykge1xuICAgICAgICAgICAgY29uc3QgdW5rbm93blByb3BlcnR5ID0gc2NoZW1hRXJyb3IucGFyYW1zLmFkZGl0aW9uYWxQcm9wZXJ0eTtcbiAgICAgICAgICAgIGlmICh1bmtub3duUHJvcGVydHkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgICBjb25zdCBkYXNoZXMgPSB1bmtub3duUHJvcGVydHkubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJztcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZmF0YWwoYFVua25vd24gb3B0aW9uOiAnJHtkYXNoZXN9JHt1bmtub3duUHJvcGVydHl9J2ApO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RXJyb3JzLnB1c2goc2NoZW1hRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5ld0Vycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IobmV3IHNjaGVtYS5TY2hlbWFWYWxpZGF0aW9uRXhjZXB0aW9uKG5ld0Vycm9ycykubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRQcm9qZWN0TmFtZXNCeVRhcmdldCh0YXJnZXROYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lID0gdGhpcy5fd29ya3NwYWNlLmxpc3RQcm9qZWN0TmFtZXMoKS5tYXAocHJvamVjdE5hbWUgPT5cbiAgICAgIHRoaXMuX2FyY2hpdGVjdC5saXN0UHJvamVjdFRhcmdldHMocHJvamVjdE5hbWUpLmluY2x1ZGVzKHRhcmdldE5hbWUpID8gcHJvamVjdE5hbWUgOiBudWxsLFxuICAgICkuZmlsdGVyKHggPT4gISF4KSBhcyBzdHJpbmdbXTtcblxuICAgIGlmICh0aGlzLm11bHRpVGFyZ2V0KSB7XG4gICAgICAvLyBGb3IgbXVsdGkgdGFyZ2V0IGNvbW1hbmRzLCB3ZSBhbHdheXMgbGlzdCBhbGwgcHJvamVjdHMgdGhhdCBoYXZlIHRoZSB0YXJnZXQuXG4gICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igc2luZ2xlIHRhcmdldCBjb21tYW5kcywgd2UgdHJ5IHRyeSB0aGUgZGVmYXVsdCBwcm9qZWN0IHByb2plY3QgZmlyc3QsXG4gICAgICAvLyB0aGVuIHRoZSBmdWxsIGxpc3QgaWYgaXQgaGFzIGEgc2luZ2xlIHByb2plY3QsIHRoZW4gZXJyb3Igb3V0LlxuICAgICAgY29uc3QgbWF5YmVEZWZhdWx0UHJvamVjdCA9IHRoaXMuX3dvcmtzcGFjZS5nZXREZWZhdWx0UHJvamVjdE5hbWUoKTtcbiAgICAgIGlmIChtYXliZURlZmF1bHRQcm9qZWN0ICYmIGFsbFByb2plY3RzRm9yVGFyZ2V0TmFtZS5pbmNsdWRlcyhtYXliZURlZmF1bHRQcm9qZWN0KSkge1xuICAgICAgICByZXR1cm4gW21heWJlRGVmYXVsdFByb2plY3RdO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gYWxsUHJvamVjdHNGb3JUYXJnZXROYW1lO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBkZXRlcm1pbmUgYSBzaW5nbGUgcHJvamVjdCBmb3IgdGhlICcke3RhcmdldE5hbWV9JyB0YXJnZXQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfbG9hZFdvcmtzcGFjZUFuZEFyY2hpdGVjdCgpIHtcbiAgICBjb25zdCB3b3Jrc3BhY2VMb2FkZXIgPSBuZXcgV29ya3NwYWNlTG9hZGVyKHRoaXMuX2hvc3QpO1xuXG4gICAgcmV0dXJuIHdvcmtzcGFjZUxvYWRlci5sb2FkV29ya3NwYWNlKHRoaXMud29ya3NwYWNlLnJvb3QpLnBpcGUoXG4gICAgICB0YXAoKHdvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2UpID0+IHRoaXMuX3dvcmtzcGFjZSA9IHdvcmtzcGFjZSksXG4gICAgICBjb25jYXRNYXAoKHdvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2UpID0+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBBcmNoaXRlY3Qod29ya3NwYWNlKS5sb2FkQXJjaGl0ZWN0KCk7XG4gICAgICB9KSxcbiAgICAgIHRhcCgoYXJjaGl0ZWN0OiBBcmNoaXRlY3QpID0+IHRoaXMuX2FyY2hpdGVjdCA9IGFyY2hpdGVjdCksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgX21ha2VUYXJnZXRTcGVjaWZpZXIoY29tbWFuZE9wdGlvbnM6IEFyY2hpdGVjdENvbW1hbmRPcHRpb25zKTogVGFyZ2V0U3BlY2lmaWVyIHtcbiAgICBsZXQgcHJvamVjdCwgdGFyZ2V0LCBjb25maWd1cmF0aW9uO1xuXG4gICAgaWYgKGNvbW1hbmRPcHRpb25zLnRhcmdldCkge1xuICAgICAgW3Byb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbl0gPSBjb21tYW5kT3B0aW9ucy50YXJnZXQuc3BsaXQoJzonKTtcblxuICAgICAgaWYgKGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbiA9IGNvbW1hbmRPcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2plY3QgPSBjb21tYW5kT3B0aW9ucy5wcm9qZWN0O1xuICAgICAgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICBjb25maWd1cmF0aW9uID0gY29tbWFuZE9wdGlvbnMuY29uZmlndXJhdGlvbjtcbiAgICAgIGlmICghY29uZmlndXJhdGlvbiAmJiBjb21tYW5kT3B0aW9ucy5wcm9kKSB7XG4gICAgICAgIGNvbmZpZ3VyYXRpb24gPSAncHJvZHVjdGlvbic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICBwcm9qZWN0ID0gJyc7XG4gICAgfVxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICB0YXJnZXQgPSAnJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIGNvbmZpZ3VyYXRpb24sXG4gICAgICB0YXJnZXQsXG4gICAgfTtcbiAgfVxufVxuIl19