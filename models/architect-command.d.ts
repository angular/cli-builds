import { TargetSpecifier } from '@angular-devkit/architect';
import { Command, Option } from './command';
export interface GenericTargetTargetSpecifier {
    target: string;
    configuration?: string;
}
export declare abstract class ArchitectCommand extends Command {
    private _host;
    private _architect;
    private _workspace;
    private _logger;
    readonly Options: Option[];
    readonly arguments: string[];
    target: string | undefined;
    initialize(options: any): Promise<any>;
    validate(options: any): boolean;
    protected mapArchitectOptions(schema: any): void;
    protected prodOption: Option;
    protected configurationOption: Option;
    protected runArchitectTarget(targetSpec: TargetSpecifier): Promise<number>;
    private getAllProjectsForTargetName(targetName);
    private _loadWorkspaceAndArchitect();
}
