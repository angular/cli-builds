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
const fs = require("fs");
const path = require("path");
const chalk_1 = require("chalk");
const command_1 = require("../models/command");
const config_1 = require("../models/config");
const validate_project_name_1 = require("../utilities/validate-project-name");
const common_tags_1 = require("common-tags");
const SilentError = require('silent-error');
class NewCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'new';
        this.description = 'Creates a new directory and a new Angular app eg. "ng new [name]".';
        this.scope = command_1.CommandScope.outsideProject;
        this.arguments = ['name'];
        this.options = [
            {
                name: 'dry-run',
                type: Boolean,
                default: false,
                aliases: ['d'],
                description: common_tags_1.oneLine `
        Run through without making any changes.
        Will list all files that would have been created when running "ng new".
      `
            },
            {
                name: 'verbose',
                type: Boolean,
                default: false,
                aliases: ['v'],
                description: 'Adds more details to output logging.'
            },
            {
                name: 'collection',
                type: String,
                aliases: ['c'],
                description: 'Schematics collection to use.'
            }
        ];
        this.initialized = false;
    }
    initialize(options) {
        if (this.initialized) {
            return Promise.resolve();
        }
        this.initialized = true;
        const collectionName = this.parseCollectionName(options);
        const schematicName = config_1.CliConfig.fromGlobal().get('defaults.schematics.newApp');
        const SchematicGetOptionsTask = require('../tasks/schematic-get-options').default;
        const getOptionsTask = new SchematicGetOptionsTask({
            ui: this.ui,
            project: this.project
        });
        return getOptionsTask.run({
            schematicName,
            collectionName
        })
            .then((availableOptions) => {
            if (availableOptions) {
                availableOptions = availableOptions.filter(opt => opt.name !== 'name');
            }
            this.options = this.options.concat(availableOptions || []);
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options.name) {
                return Promise.reject(new SilentError(`The "ng ${options.name}" command requires a name argument to be specified eg. ` +
                    chalk_1.default.yellow('ng new [name] ') +
                    `For more details, use "ng help".`));
            }
            validate_project_name_1.validateProjectName(options.name);
            options.name = options.name;
            if (options.dryRun) {
                options.skipGit = true;
            }
            options.directory = options.directory || options.name;
            const directoryName = path.join(process.cwd(), options.directory);
            if (fs.existsSync(directoryName) && this.isProject(directoryName)) {
                throw new SilentError(common_tags_1.oneLine `
        Directory ${directoryName} exists and is already an Angular CLI project.
      `);
            }
            if (options.collection) {
                options.collectionName = options.collection;
            }
            else {
                options.collectionName = this.parseCollectionName(options);
            }
            const InitTask = require('../tasks/init').default;
            const initTask = new InitTask({
                project: this.project,
                ui: this.ui,
            });
            // Ensure skipGit has a boolean value.
            options.skipGit = options.skipGit === undefined ? false : options.skipGit;
            return yield initTask.run(options);
        });
    }
    isProject(projectPath) {
        return config_1.CliConfig.fromProject(projectPath) !== null;
    }
    parseCollectionName(options) {
        let collectionName = options.collection ||
            options.c ||
            config_1.CliConfig.getValue('defaults.schematics.collection');
        return collectionName;
    }
}
NewCommand.aliases = ['n'];
exports.default = NewCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/new.js.map