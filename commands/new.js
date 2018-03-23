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
const config_1 = require("../models/config");
const schematic_command_1 = require("../models/schematic-command");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.name = 'new';
        this.description = 'Creates a new directory and a new Angular app.';
        this.scope = command_1.CommandScope.outsideProject;
        this.options = [
            ...this.coreOptions,
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
        return this.getOptions({
            schematicName,
            collectionName
        })
            .then((availableOptions) => {
            // if (availableOptions) {
            //   availableOptions = availableOptions.filter(opt => opt.name !== 'name');
            // }
            this.options = this.options.concat(availableOptions || []);
        });
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.dryRun) {
                options.skipGit = true;
            }
            let collectionName;
            if (options.collection) {
                collectionName = options.collection;
            }
            else {
                collectionName = this.parseCollectionName(options);
            }
            const pathOptions = this.setPathOptions(options, '/');
            options = Object.assign({}, options, pathOptions);
            const packageJson = require('../package.json');
            options.version = packageJson.version;
            // Ensure skipGit has a boolean value.
            options.skipGit = options.skipGit === undefined ? false : options.skipGit;
            options = this.removeLocalOptions(options);
            return this.runSchematic({
                collectionName: collectionName,
                schematicName: 'ng-new',
                schematicOptions: options,
                debug: options.debug,
                dryRun: options.dryRun,
                force: options.force
            });
        });
    }
    parseCollectionName(options) {
        let collectionName = options.collection ||
            options.c ||
            config_1.CliConfig.getValue('defaults.schematics.collection');
        return collectionName;
    }
    removeLocalOptions(options) {
        const opts = Object.assign({}, options);
        delete opts.verbose;
        delete opts.collection;
        return opts;
    }
}
NewCommand.aliases = ['n'];
exports.default = NewCommand;
//# sourceMappingURL=/home/travis/build/angular/angular-cli/commands/new.js.map