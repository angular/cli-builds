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
const chalk_1 = require("chalk");
const stringUtils = require('ember-cli-string-utils');
const config_1 = require("../models/config");
const schematics_1 = require("../utilities/schematics");
const dynamic_path_parser_1 = require("../utilities/dynamic-path-parser");
const app_utils_1 = require("../utilities/app-utils");
const path = require("path");
const common_tags_1 = require("common-tags");
const { cyan } = chalk_1.default;
const separatorRegEx = /[\/\\]/g;
class GenerateCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'generate';
        this.description = 'Generates and/or modifies files based on a schematic.';
        this.scope = command_1.CommandScope.inProject;
        this.arguments = ['schematic'];
        this.options = [
            {
                name: 'dry-run',
                type: Boolean,
                default: false,
                aliases: ['d'],
                description: 'Run through without making any changes.'
            },
            {
                name: 'force',
                type: Boolean,
                default: false,
                aliases: ['f'],
                description: 'Forces overwriting of files.'
            },
            {
                name: 'app',
                type: String,
                description: 'Specifies app name to use.'
            }
        ];
        this.initialized = false;
    }
    initialize(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                return Promise.resolve();
            }
            this.initialized = true;
            const [collectionName, schematicName] = this.parseSchematicInfo(options);
            if (!!schematicName) {
                const SchematicGetOptionsTask = require('../tasks/schematic-get-options').default;
                const getOptionsTask = new SchematicGetOptionsTask({
                    ui: this.ui,
                    project: this.project
                });
                const availableOptions = yield getOptionsTask.run({
                    schematicName,
                    collectionName,
                });
                let anonymousOptions = [];
                if (availableOptions) {
                    const nameOption = availableOptions.filter(opt => opt.name === 'name')[0];
                    if (nameOption) {
                        anonymousOptions = [...anonymousOptions, 'name'];
                    }
                }
                else {
                    anonymousOptions = [...anonymousOptions, 'name'];
                }
                if (collectionName === '@schematics/angular' && schematicName === 'interface') {
                    anonymousOptions = [...anonymousOptions, 'type'];
                }
                this.arguments = this.arguments.concat(anonymousOptions);
                this.options = this.options.concat(availableOptions || []);
            }
        });
    }
    validate(options) {
        if (!options.schematic) {
            this.logger.error(common_tags_1.oneLine `
        The "ng generate" command requires a
        schematic name to be specified.
        For more details, use "ng help".`);
            return false;
        }
        if (options.name && /^\d/.test(options.name)) {
            this.logger.error(common_tags_1.oneLine `The \`ng generate ${options.schematic} ${options.name}\`
        file name cannot begin with a digit.`);
            return false;
        }
        return true;
    }
    run(options) {
        let entityName = options.name;
        if (entityName) {
            options.name = stringUtils.dasherize(entityName.split(separatorRegEx).pop());
        }
        else {
            entityName = '';
        }
        const appConfig = app_utils_1.getAppFromConfig(options.app);
        const dynamicPathOptions = {
            project: this.project,
            entityName: entityName,
            appConfig: appConfig,
            dryRun: options.dryRun
        };
        const parsedPath = dynamic_path_parser_1.dynamicPathParser(dynamicPathOptions);
        options.sourceDir = parsedPath.sourceDir.replace(separatorRegEx, '/');
        const root = parsedPath.sourceDir + path.sep;
        options.appRoot = parsedPath.appRoot === parsedPath.sourceDir ? '' :
            parsedPath.appRoot.startsWith(root)
                ? parsedPath.appRoot.substr(root.length)
                : parsedPath.appRoot;
        options.path = parsedPath.dir.replace(separatorRegEx, '/');
        options.path = parsedPath.dir === parsedPath.sourceDir ? '' :
            parsedPath.dir.startsWith(root)
                ? options.path.substr(root.length)
                : options.path;
        const cwd = this.project.root;
        const [collectionName, schematicName] = this.parseSchematicInfo(options);
        if (['component', 'c', 'directive', 'd'].indexOf(schematicName) !== -1) {
            if (options.prefix === undefined) {
                options.prefix = appConfig.prefix;
            }
            if (schematicName === 'component' || schematicName === 'c') {
                if (options.styleext === undefined) {
                    options.styleext = config_1.CliConfig.getValue('defaults.styleExt');
                }
            }
        }
        const SchematicRunTask = require('../tasks/schematic-run').default;
        const schematicRunTask = new SchematicRunTask({
            ui: this.ui,
            project: this.project
        });
        if (collectionName === '@schematics/angular' && schematicName === 'interface' && options.type) {
            options.type = options.type;
        }
        const schematicOptions = this.stripLocalOptions(options);
        return schematicRunTask.run({
            taskOptions: schematicOptions,
            dryRun: options.dryRun,
            force: options.force,
            workingDir: cwd,
            collectionName,
            schematicName
        });
    }
    parseSchematicInfo(options) {
        let collectionName = config_1.CliConfig.getValue('defaults.schematics.collection');
        let schematicName = options.schematic;
        if (schematicName) {
            if (schematicName.match(/:/)) {
                [collectionName, schematicName] = schematicName.split(':', 2);
            }
        }
        return [collectionName, schematicName];
    }
    printHelp(options) {
        if (options.schematic) {
            super.printHelp(options);
        }
        else {
            this.printHelpUsage(this.name, this.arguments, this.options);
            const engineHost = schematics_1.getEngineHost();
            const [collectionName] = this.parseSchematicInfo(options);
            const collection = schematics_1.getCollection(collectionName);
            const schematicNames = engineHost.listSchematics(collection);
            this.logger.info('Available schematics:');
            schematicNames.forEach(schematicName => {
                this.logger.info(`    ${schematicName}`);
            });
            this.logger.warn(`\nTo see help for a schematic run:`);
            this.logger.info(cyan(`  ng generate <schematic> --help`));
        }
    }
    stripLocalOptions(options) {
        const opts = Object.assign({}, options);
        delete opts.dryRun;
        delete opts.force;
        delete opts.app;
        return opts;
    }
}
GenerateCommand.aliases = ['g'];
exports.default = GenerateCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/generate.js.map