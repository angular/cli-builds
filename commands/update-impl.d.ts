import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { Schema as UpdateCommandSchema } from './update';
export declare class UpdateCommand extends Command<UpdateCommandSchema> {
    readonly allowMissingWorkspace = true;
    private workflow;
    private packageManager;
    initialize(): Promise<void>;
    private executeSchematic;
    private executeMigrations;
    run(options: UpdateCommandSchema & Arguments): Promise<number>;
    private checkCleanGit;
    private createCommit;
    private findCurrentGitSha;
    /**
     * Checks if the current installed CLI version is older than the latest version.
     * @returns `true` when the installed version is older.
    */
    private checkCLILatestVersion;
}
