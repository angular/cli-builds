"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewCommand = void 0;
const schematic_command_1 = require("../models/schematic-command");
const package_manager_1 = require("../utilities/package-manager");
class NewCommand extends schematic_command_1.SchematicCommand {
    constructor() {
        super(...arguments);
        this.allowMissingWorkspace = true;
        this.schematicName = 'ng-new';
    }
    async initialize(options) {
        this.collectionName = options.collection || await this.getDefaultSchematicCollection();
        return super.initialize(options);
    }
    async run(options) {
        await package_manager_1.ensureCompatibleNpm(this.context.root);
        // Register the version of the CLI in the registry.
        const packageJson = require('../package.json');
        const version = packageJson.version;
        this._workflow.registry.addSmartDefaultProvider('ng-cli-version', () => version);
        return this.runSchematic({
            collectionName: this.collectionName,
            schematicName: this.schematicName,
            schematicOptions: options['--'] || [],
            debug: !!options.debug,
            dryRun: !!options.dryRun,
            force: !!options.force,
        });
    }
}
exports.NewCommand = NewCommand;
