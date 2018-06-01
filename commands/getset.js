"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-global-tslint-disable file-header
const command_1 = require("../models/command");
class GetSetCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'getset';
        this.description = 'Deprecated in favor of config command.';
        this.arguments = [];
        this.options = [];
        this.hidden = true;
    }
    run(_options) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.warn('get/set have been deprecated in favor of the config command.');
        });
    }
}
exports.default = GetSetCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0c2V0LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9nZXRzZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHNEQUFzRDtBQUN0RCwrQ0FBb0Q7QUFPcEQsbUJBQW1DLFNBQVEsaUJBQU87SUFBbEQ7O1FBQ2tCLFNBQUksR0FBRyxRQUFRLENBQUM7UUFDaEIsZ0JBQVcsR0FBRyx3Q0FBd0MsQ0FBQztRQUN2RCxjQUFTLEdBQWEsRUFBRSxDQUFDO1FBQ3pCLFlBQU8sR0FBYSxFQUFFLENBQUM7UUFDdkIsV0FBTSxHQUFHLElBQUksQ0FBQztJQUtoQyxDQUFDO0lBSGMsR0FBRyxDQUFDLFFBQWlCOztZQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBQ25GLENBQUM7S0FBQTtDQUNGO0FBVkQsZ0NBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgZmlsZS1oZWFkZXJcbmltcG9ydCB7IENvbW1hbmQsIE9wdGlvbiB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAga2V5d29yZDogc3RyaW5nO1xuICBzZWFyY2g/OiBib29sZWFuO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHZXRTZXRDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ2dldHNldCc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdEZXByZWNhdGVkIGluIGZhdm9yIG9mIGNvbmZpZyBjb21tYW5kLic7XG4gIHB1YmxpYyByZWFkb25seSBhcmd1bWVudHM6IHN0cmluZ1tdID0gW107XG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zOiBPcHRpb25bXSA9IFtdO1xuICBwdWJsaWMgcmVhZG9ubHkgaGlkZGVuID0gdHJ1ZTtcblxuICBwdWJsaWMgYXN5bmMgcnVuKF9vcHRpb25zOiBPcHRpb25zKSB7XG4gICAgdGhpcy5sb2dnZXIud2FybignZ2V0L3NldCBoYXZlIGJlZW4gZGVwcmVjYXRlZCBpbiBmYXZvciBvZiB0aGUgY29uZmlnIGNvbW1hbmQuJyk7XG4gIH1cbn1cbiJdfQ==