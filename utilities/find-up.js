"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUp = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
function findUp(names, from) {
    if (!Array.isArray(names)) {
        names = [names];
    }
    const root = path.parse(from).root;
    let currentDir = from;
    while (currentDir && currentDir !== root) {
        for (const name of names) {
            const p = path.join(currentDir, name);
            if ((0, fs_1.existsSync)(p)) {
                return p;
            }
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}
exports.findUp = findUp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC11cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9maW5kLXVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwyQkFBZ0M7QUFDaEMsMkNBQTZCO0FBRTdCLFNBQWdCLE1BQU0sQ0FBQyxLQUF3QixFQUFFLElBQVk7SUFDM0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDekIsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDakI7SUFDRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztJQUVuQyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDdEIsT0FBTyxVQUFVLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtRQUN4QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN0QyxJQUFJLElBQUEsZUFBVSxFQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNqQixPQUFPLENBQUMsQ0FBQzthQUNWO1NBQ0Y7UUFFRCxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUN2QztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQW5CRCx3QkFtQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kVXAobmFtZXM6IHN0cmluZyB8IHN0cmluZ1tdLCBmcm9tOiBzdHJpbmcpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KG5hbWVzKSkge1xuICAgIG5hbWVzID0gW25hbWVzXTtcbiAgfVxuICBjb25zdCByb290ID0gcGF0aC5wYXJzZShmcm9tKS5yb290O1xuXG4gIGxldCBjdXJyZW50RGlyID0gZnJvbTtcbiAgd2hpbGUgKGN1cnJlbnREaXIgJiYgY3VycmVudERpciAhPT0gcm9vdCkge1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgY29uc3QgcCA9IHBhdGguam9pbihjdXJyZW50RGlyLCBuYW1lKTtcbiAgICAgIGlmIChleGlzdHNTeW5jKHApKSB7XG4gICAgICAgIHJldHVybiBwO1xuICAgICAgfVxuICAgIH1cblxuICAgIGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==