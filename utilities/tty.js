"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTTY = void 0;
function _isTruthy(value) {
    // Returns true if value is a string that is anything but 0 or false.
    return value !== undefined && value !== '0' && value.toUpperCase() !== 'FALSE';
}
function isTTY() {
    // If we force TTY, we always return true.
    const force = process.env['NG_FORCE_TTY'];
    if (force !== undefined) {
        return _isTruthy(force);
    }
    return !!process.stdout.isTTY && !_isTruthy(process.env['CI']);
}
exports.isTTY = isTTY;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHR5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvdXRpbGl0aWVzL3R0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxTQUFTLFNBQVMsQ0FBQyxLQUF5QjtJQUMxQyxxRUFBcUU7SUFDckUsT0FBTyxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU8sQ0FBQztBQUNqRixDQUFDO0FBRUQsU0FBZ0IsS0FBSztJQUNuQiwwQ0FBMEM7SUFDMUMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMxQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7UUFDdkIsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDekI7SUFFRCxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQztBQVJELHNCQVFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmZ1bmN0aW9uIF9pc1RydXRoeSh2YWx1ZTogdW5kZWZpbmVkIHwgc3RyaW5nKTogYm9vbGVhbiB7XG4gIC8vIFJldHVybnMgdHJ1ZSBpZiB2YWx1ZSBpcyBhIHN0cmluZyB0aGF0IGlzIGFueXRoaW5nIGJ1dCAwIG9yIGZhbHNlLlxuICByZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gJzAnICYmIHZhbHVlLnRvVXBwZXJDYXNlKCkgIT09ICdGQUxTRSc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RUWSgpOiBib29sZWFuIHtcbiAgLy8gSWYgd2UgZm9yY2UgVFRZLCB3ZSBhbHdheXMgcmV0dXJuIHRydWUuXG4gIGNvbnN0IGZvcmNlID0gcHJvY2Vzcy5lbnZbJ05HX0ZPUkNFX1RUWSddO1xuICBpZiAoZm9yY2UgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBfaXNUcnV0aHkoZm9yY2UpO1xuICB9XG5cbiAgcmV0dXJuICEhcHJvY2Vzcy5zdGRvdXQuaXNUVFkgJiYgIV9pc1RydXRoeShwcm9jZXNzLmVudlsnQ0knXSk7XG59XG4iXX0=