import * as semver from 'semver';
import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { Schema as UpdateCommandSchema } from './update';
export declare class UpdateCommand extends Command<UpdateCommandSchema> {
    readonly allowMissingWorkspace = true;
    private workflow;
    initialize(): Promise<void>;
    executeSchematic(collection: string, schematic: string, options?: {}): Promise<{
        success: boolean;
        files: Set<string>;
    }>;
    executeMigrations(packageName: string, collectionPath: string, range: semver.Range, commit?: boolean): Promise<boolean | undefined>;
    run(options: UpdateCommandSchema & Arguments): Promise<1 | 0 | 2>;
    checkCleanGit(): boolean;
    createCommit(message: string, files: string[]): void;
    findCurrentGitSha(): string | null;
}
