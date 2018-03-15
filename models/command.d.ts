import { Logger } from '@angular-devkit/core/src/logger';
export interface CommandConstructor {
    new (context: CommandContext, logger: Logger): Command;
    aliases: string[];
    scope: CommandScope.everywhere;
}
export declare enum CommandScope {
    everywhere = 0,
    inProject = 1,
    outsideProject = 2,
}
export declare abstract class Command {
    constructor(context: CommandContext, logger: Logger);
    initialize(_options: any): Promise<void>;
    validate(_options: any): boolean | Promise<boolean>;
    printHelp(_options: any): void;
    protected printHelpUsage(name: string, args: string[], options: Option[]): void;
    protected printHelpOptions(options: Option[]): void;
    abstract run(options: any): any | Promise<any>;
    readonly abstract name: string;
    readonly abstract description: string;
    readonly abstract arguments: string[];
    readonly abstract options: Option[];
    hidden: boolean;
    unknown: boolean;
    scope: CommandScope;
    protected readonly logger: Logger;
    protected readonly project: any;
    protected readonly ui: Ui;
}
export interface CommandContext {
    ui: Ui;
    project: any;
}
export interface Ui {
    writeLine: (message: string) => void;
    errorLog: (message: string) => void;
}
export declare abstract class Option {
    readonly abstract name: string;
    readonly abstract description: string;
    readonly default?: string | number | boolean;
    readonly required?: boolean;
    readonly abstract aliases?: string[];
    readonly abstract type: any;
    readonly values?: any[];
    readonly hidden?: boolean;
}
