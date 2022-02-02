"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = void 0;
const ora_1 = __importDefault(require("ora"));
const color_1 = require("./color");
class Spinner {
    constructor(text) {
        /** When false, only fail messages will be displayed. */
        this.enabled = true;
        this.spinner = (0, ora_1.default)({
            text,
            // The below 2 options are needed because otherwise CTRL+C will be delayed
            // when the underlying process is sync.
            hideCursor: false,
            discardStdin: false,
        });
    }
    set text(text) {
        this.spinner.text = text;
    }
    succeed(text) {
        if (this.enabled) {
            this.spinner.succeed(text);
        }
    }
    info(text) {
        this.spinner.info(text);
    }
    fail(text) {
        this.spinner.fail(text && color_1.colors.redBright(text));
    }
    warn(text) {
        this.spinner.warn(text && color_1.colors.yellowBright(text));
    }
    stop() {
        this.spinner.stop();
    }
    start(text) {
        if (this.enabled) {
            this.spinner.start(text);
        }
    }
}
exports.Spinner = Spinner;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Bpbm5lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2FuZ3VsYXIvY2xpL3V0aWxpdGllcy9zcGlubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7OztBQUVILDhDQUFzQjtBQUN0QixtQ0FBaUM7QUFFakMsTUFBYSxPQUFPO0lBTWxCLFlBQVksSUFBYTtRQUh6Qix3REFBd0Q7UUFDeEQsWUFBTyxHQUFHLElBQUksQ0FBQztRQUdiLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBQSxhQUFHLEVBQUM7WUFDakIsSUFBSTtZQUNKLDBFQUEwRTtZQUMxRSx1Q0FBdUM7WUFDdkMsVUFBVSxFQUFFLEtBQUs7WUFDakIsWUFBWSxFQUFFLEtBQUs7U0FDcEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELElBQUksSUFBSSxDQUFDLElBQVk7UUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzNCLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBYTtRQUNuQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDNUI7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQWE7UUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFhO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxjQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFhO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxjQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELElBQUk7UUFDRixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBYTtRQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDMUI7SUFDSCxDQUFDO0NBQ0Y7QUEvQ0QsMEJBK0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCBvcmEgZnJvbSAnb3JhJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJy4vY29sb3InO1xuXG5leHBvcnQgY2xhc3MgU3Bpbm5lciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3Bpbm5lcjogb3JhLk9yYTtcblxuICAvKiogV2hlbiBmYWxzZSwgb25seSBmYWlsIG1lc3NhZ2VzIHdpbGwgYmUgZGlzcGxheWVkLiAqL1xuICBlbmFibGVkID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcih0ZXh0Pzogc3RyaW5nKSB7XG4gICAgdGhpcy5zcGlubmVyID0gb3JhKHtcbiAgICAgIHRleHQsXG4gICAgICAvLyBUaGUgYmVsb3cgMiBvcHRpb25zIGFyZSBuZWVkZWQgYmVjYXVzZSBvdGhlcndpc2UgQ1RSTCtDIHdpbGwgYmUgZGVsYXllZFxuICAgICAgLy8gd2hlbiB0aGUgdW5kZXJseWluZyBwcm9jZXNzIGlzIHN5bmMuXG4gICAgICBoaWRlQ3Vyc29yOiBmYWxzZSxcbiAgICAgIGRpc2NhcmRTdGRpbjogZmFsc2UsXG4gICAgfSk7XG4gIH1cblxuICBzZXQgdGV4dCh0ZXh0OiBzdHJpbmcpIHtcbiAgICB0aGlzLnNwaW5uZXIudGV4dCA9IHRleHQ7XG4gIH1cblxuICBzdWNjZWVkKHRleHQ/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5lbmFibGVkKSB7XG4gICAgICB0aGlzLnNwaW5uZXIuc3VjY2VlZCh0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBpbmZvKHRleHQ/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnNwaW5uZXIuaW5mbyh0ZXh0KTtcbiAgfVxuXG4gIGZhaWwodGV4dD86IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuc3Bpbm5lci5mYWlsKHRleHQgJiYgY29sb3JzLnJlZEJyaWdodCh0ZXh0KSk7XG4gIH1cblxuICB3YXJuKHRleHQ/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnNwaW5uZXIud2Fybih0ZXh0ICYmIGNvbG9ycy55ZWxsb3dCcmlnaHQodGV4dCkpO1xuICB9XG5cbiAgc3RvcCgpOiB2b2lkIHtcbiAgICB0aGlzLnNwaW5uZXIuc3RvcCgpO1xuICB9XG5cbiAgc3RhcnQodGV4dD86IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmVuYWJsZWQpIHtcbiAgICAgIHRoaXMuc3Bpbm5lci5zdGFydCh0ZXh0KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==