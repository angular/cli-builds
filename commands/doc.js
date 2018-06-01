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
const opn = require('opn');
class DocCommand extends command_1.Command {
    constructor() {
        super(...arguments);
        this.name = 'doc';
        this.description = 'Opens the official Angular API documentation for a given keyword.';
        this.arguments = ['keyword'];
        this.options = [
            {
                name: 'search',
                aliases: ['s'],
                type: Boolean,
                default: false,
                description: 'Search whole angular.io instead of just api.',
            },
        ];
    }
    validate(options) {
        if (!options.keyword) {
            this.logger.error(`keyword argument is required.`);
            return false;
        }
        return true;
    }
    run(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchUrl = `https://angular.io/api?query=${options.keyword}`;
            if (options.search) {
                searchUrl = `https://www.google.com/search?q=site%3Aangular.io+${options.keyword}`;
            }
            return opn(searchUrl);
        });
    }
}
DocCommand.aliases = ['d'];
exports.default = DocCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9kb2MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHNEQUFzRDtBQUN0RCwrQ0FBNEM7QUFDNUMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBTzNCLGdCQUFnQyxTQUFRLGlCQUFPO0lBQS9DOztRQUNrQixTQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2IsZ0JBQVcsR0FBRyxtRUFBbUUsQ0FBQztRQUVsRixjQUFTLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QixZQUFPLEdBQUc7WUFDeEI7Z0JBQ0UsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNkLElBQUksRUFBRSxPQUFPO2dCQUNiLE9BQU8sRUFBRSxLQUFLO2dCQUNkLFdBQVcsRUFBRSw4Q0FBOEM7YUFDNUQ7U0FDRixDQUFDO0lBb0JKLENBQUM7SUFsQlEsUUFBUSxDQUFDLE9BQWdCO1FBQzlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUVuRCxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRVksR0FBRyxDQUFDLE9BQWdCOztZQUMvQixJQUFJLFNBQVMsR0FBRyxnQ0FBZ0MsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixTQUFTLEdBQUcscURBQXFELE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyRixDQUFDO1lBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QixDQUFDO0tBQUE7O0FBN0JhLGtCQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUhoQyw2QkFpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTpuby1nbG9iYWwtdHNsaW50LWRpc2FibGUgZmlsZS1oZWFkZXJcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuLi9tb2RlbHMvY29tbWFuZCc7XG5jb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKTtcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAga2V5d29yZDogc3RyaW5nO1xuICBzZWFyY2g/OiBib29sZWFuO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEb2NDb21tYW5kIGV4dGVuZHMgQ29tbWFuZCB7XG4gIHB1YmxpYyByZWFkb25seSBuYW1lID0gJ2RvYyc7XG4gIHB1YmxpYyByZWFkb25seSBkZXNjcmlwdGlvbiA9ICdPcGVucyB0aGUgb2ZmaWNpYWwgQW5ndWxhciBBUEkgZG9jdW1lbnRhdGlvbiBmb3IgYSBnaXZlbiBrZXl3b3JkLic7XG4gIHB1YmxpYyBzdGF0aWMgYWxpYXNlcyA9IFsnZCddO1xuICBwdWJsaWMgcmVhZG9ubHkgYXJndW1lbnRzID0gWydrZXl3b3JkJ107XG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zID0gW1xuICAgIHtcbiAgICAgIG5hbWU6ICdzZWFyY2gnLFxuICAgICAgYWxpYXNlczogWydzJ10sXG4gICAgICB0eXBlOiBCb29sZWFuLFxuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlYXJjaCB3aG9sZSBhbmd1bGFyLmlvIGluc3RlYWQgb2YganVzdCBhcGkuJyxcbiAgICB9LFxuICBdO1xuXG4gIHB1YmxpYyB2YWxpZGF0ZShvcHRpb25zOiBPcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLmtleXdvcmQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBrZXl3b3JkIGFyZ3VtZW50IGlzIHJlcXVpcmVkLmApO1xuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcnVuKG9wdGlvbnM6IE9wdGlvbnMpIHtcbiAgICBsZXQgc2VhcmNoVXJsID0gYGh0dHBzOi8vYW5ndWxhci5pby9hcGk/cXVlcnk9JHtvcHRpb25zLmtleXdvcmR9YDtcbiAgICBpZiAob3B0aW9ucy5zZWFyY2gpIHtcbiAgICAgIHNlYXJjaFVybCA9IGBodHRwczovL3d3dy5nb29nbGUuY29tL3NlYXJjaD9xPXNpdGUlM0Fhbmd1bGFyLmlvKyR7b3B0aW9ucy5rZXl3b3JkfWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wbihzZWFyY2hVcmwpO1xuICB9XG59XG4iXX0=