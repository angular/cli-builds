import { TargetSpecifier } from '@angular-devkit/architect';
import { Command, Option } from './command';
export interface GenericTargetTargetSpecifier {
    target: string;
    configuration?: string;
}
export declare abstract class ArchitectCommand<T = any> extends Command<T> {
    private _host;
    private _architect;
    private _workspace;
    private _logger;
    readonly Options: Option[];
    readonly arguments: string[];
    target: string | undefined;
    initialize(options: any): Promise<void>;
    validate(options: any): boolean;
    protected mapArchitectOptions(schema: any): void;
    protected prodOption: Option;
    protected configurationOption: Option;
    protected runArchitectTarget(targetSpec: TargetSpecifier, commandOptions: T): Promise<number>;
    private getAllProjectsForTargetName(targetName);
    private _loadWorkspaceAndArchitect();
}
