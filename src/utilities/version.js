"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
// Same structure as used in framework packages
class Version {
    full;
    major;
    minor;
    patch;
    constructor(full) {
        this.full = full;
        const [major, minor, patch] = full.split('-', 1)[0].split('.', 3);
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
}
// TODO(bazel): Convert this to use build-time version stamping after flipping the build script to use bazel
// export const VERSION = new Version('17.0.0-next.5+sha-2b7c8c4');
exports.VERSION = new Version(JSON.parse((0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, '../../package.json'), 'utf-8')).version);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3NyYy91dGlsaXRpZXMvdmVyc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwyQkFBa0M7QUFDbEMsK0JBQStCO0FBRS9CLCtDQUErQztBQUMvQyxNQUFNLE9BQU87SUFLaUI7SUFKWixLQUFLLENBQVM7SUFDZCxLQUFLLENBQVM7SUFDZCxLQUFLLENBQVM7SUFFOUIsWUFBNEIsSUFBWTtRQUFaLFNBQUksR0FBSixJQUFJLENBQVE7UUFDdEMsTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUFFRCw0R0FBNEc7QUFDNUcsMkRBQTJEO0FBQzlDLFFBQUEsT0FBTyxHQUFHLElBQUksT0FBTyxDQUU5QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUEsaUJBQVksRUFBQyxJQUFBLGNBQU8sRUFBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FHM0UsQ0FBQyxPQUFPLENBQ1YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5cbi8vIFNhbWUgc3RydWN0dXJlIGFzIHVzZWQgaW4gZnJhbWV3b3JrIHBhY2thZ2VzXG5jbGFzcyBWZXJzaW9uIHtcbiAgcHVibGljIHJlYWRvbmx5IG1ham9yOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBtaW5vcjogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgcGF0Y2g6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgZnVsbDogc3RyaW5nKSB7XG4gICAgY29uc3QgW21ham9yLCBtaW5vciwgcGF0Y2hdID0gZnVsbC5zcGxpdCgnLScsIDEpWzBdLnNwbGl0KCcuJywgMyk7XG4gICAgdGhpcy5tYWpvciA9IG1ham9yO1xuICAgIHRoaXMubWlub3IgPSBtaW5vcjtcbiAgICB0aGlzLnBhdGNoID0gcGF0Y2g7XG4gIH1cbn1cblxuLy8gVE9ETyhiYXplbCk6IENvbnZlcnQgdGhpcyB0byB1c2UgYnVpbGQtdGltZSB2ZXJzaW9uIHN0YW1waW5nIGFmdGVyIGZsaXBwaW5nIHRoZSBidWlsZCBzY3JpcHQgdG8gdXNlIGJhemVsXG4vLyBleHBvcnQgY29uc3QgVkVSU0lPTiA9IG5ldyBWZXJzaW9uKCcwLjAuMC1QTEFDRUhPTERFUicpO1xuZXhwb3J0IGNvbnN0IFZFUlNJT04gPSBuZXcgVmVyc2lvbihcbiAgKFxuICAgIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZS5qc29uJyksICd1dGYtOCcpKSBhcyB7XG4gICAgICB2ZXJzaW9uOiBzdHJpbmc7XG4gICAgfVxuICApLnZlcnNpb24sXG4pO1xuIl19