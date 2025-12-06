"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCleanGit = checkCleanGit;
exports.hasChangesToCommit = hasChangesToCommit;
exports.createCommit = createCommit;
exports.findCurrentGitSha = findCurrentGitSha;
exports.getShortHash = getShortHash;
const node_child_process_1 = require("node:child_process");
const path = __importStar(require("node:path"));
/**
 * Checks if the git repository is clean.
 * @param root The root directory of the project.
 * @returns True if the repository is clean, false otherwise.
 */
function checkCleanGit(root) {
    try {
        const topLevel = (0, node_child_process_1.execSync)('git rev-parse --show-toplevel', {
            encoding: 'utf8',
            stdio: 'pipe',
        });
        const result = (0, node_child_process_1.execSync)('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
        if (result.trim().length === 0) {
            return true;
        }
        // Only files inside the workspace root are relevant
        for (const entry of result.split('\n')) {
            const relativeEntry = path.relative(path.resolve(root), path.resolve(topLevel.trim(), entry.slice(3).trim()));
            if (!relativeEntry.startsWith('..') && !path.isAbsolute(relativeEntry)) {
                return false;
            }
        }
    }
    catch { } // eslint-disable-line no-empty
    return true;
}
/**
 * Checks if the working directory has pending changes to commit.
 * @returns Whether or not the working directory has Git changes to commit.
 */
function hasChangesToCommit() {
    // List all modified files not covered by .gitignore.
    // If any files are returned, then there must be something to commit.
    return (0, node_child_process_1.execSync)('git ls-files -m -d -o --exclude-standard').toString() !== '';
}
/**
 * Stages all changes in the Git working tree and creates a new commit.
 * @param message The commit message to use.
 */
function createCommit(message) {
    // Stage entire working tree for commit.
    (0, node_child_process_1.execSync)('git add -A', { encoding: 'utf8', stdio: 'pipe' });
    // Commit with the message passed via stdin to avoid bash escaping issues.
    (0, node_child_process_1.execSync)('git commit --no-verify -F -', { encoding: 'utf8', stdio: 'pipe', input: message });
}
/**
 * Finds the Git SHA hash of the HEAD commit.
 * @returns The Git SHA hash of the HEAD commit. Returns null if unable to retrieve the hash.
 */
function findCurrentGitSha() {
    try {
        return (0, node_child_process_1.execSync)('git rev-parse HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim();
    }
    catch {
        return null;
    }
}
/**
 * Gets the short hash of a commit.
 * @param commitHash The full commit hash.
 * @returns The short hash (first 9 characters).
 */
function getShortHash(commitHash) {
    return commitHash.slice(0, 9);
}
//# sourceMappingURL=git.js.map