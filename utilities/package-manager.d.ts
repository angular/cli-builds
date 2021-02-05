import { PackageManager } from '../lib/config/schema';
export declare function supportsYarn(): boolean;
export declare function supportsNpm(): boolean;
export declare function getPackageManager(root: string): Promise<PackageManager>;
/**
 * Checks if the npm version is version 6.x.  If not, display a message and exit.
 */
export declare function ensureCompatibleNpm(root: string): Promise<void>;
