"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsCommandModule = void 0;
const path_1 = require("path");
const analytics_1 = require("../../analytics/analytics");
const command_module_1 = require("../../command-builder/command-module");
class AnalyticsCommandModule extends command_module_1.CommandModule {
    constructor() {
        super(...arguments);
        this.command = 'analytics <setting-or-project>';
        this.describe = 'Configures the gathering of Angular CLI usage metrics.';
        this.longDescriptionPath = (0, path_1.join)(__dirname, 'long-description.md');
    }
    builder(localYargs) {
        return localYargs
            .positional('setting-or-project', {
            description: 'Directly enables or disables all usage analytics for the user, or prompts the user to set the status interactively, ' +
                'or sets the default status for the project.',
            choices: ['on', 'off', 'ci', 'prompt'],
            type: 'string',
            demandOption: true,
        })
            .positional('project-setting', {
            description: 'Sets the default analytics enablement status for the project.',
            choices: ['on', 'off', 'prompt'],
            type: 'string',
        })
            .strict();
    }
    async run({ settingOrProject, projectSetting, }) {
        if (settingOrProject === 'project' && projectSetting === undefined) {
            throw new Error('Argument "project" requires a second argument of one of the following value: on, off.');
        }
        switch (settingOrProject) {
            case 'off':
                (0, analytics_1.setAnalyticsConfig)('global', false);
                break;
            case 'on':
                (0, analytics_1.setAnalyticsConfig)('global', true);
                break;
            case 'ci':
                (0, analytics_1.setAnalyticsConfig)('global', 'ci');
                break;
            case 'project':
                switch (projectSetting) {
                    case 'off':
                        (0, analytics_1.setAnalyticsConfig)('local', false);
                        break;
                    case 'on':
                        (0, analytics_1.setAnalyticsConfig)('local', true);
                        break;
                    case 'prompt':
                        await (0, analytics_1.promptProjectAnalytics)(true);
                        break;
                }
                break;
            case 'prompt':
                await (0, analytics_1.promptGlobalAnalytics)(true);
                break;
        }
    }
}
exports.AnalyticsCommandModule = AnalyticsCommandModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhci9jbGkvc3JjL2NvbW1hbmRzL2FuYWx5dGljcy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsK0JBQTRCO0FBRTVCLHlEQUltQztBQUNuQyx5RUFBOEU7QUFPOUUsTUFBYSxzQkFBdUIsU0FBUSw4QkFBbUM7SUFBL0U7O1FBQ0UsWUFBTyxHQUFHLGdDQUFnQyxDQUFDO1FBQzNDLGFBQVEsR0FBRyx3REFBd0QsQ0FBQztRQUNwRSx3QkFBbUIsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQTBEL0QsQ0FBQztJQXhEQyxPQUFPLENBQUMsVUFBZ0I7UUFDdEIsT0FBTyxVQUFVO2FBQ2QsVUFBVSxDQUFDLG9CQUFvQixFQUFFO1lBQ2hDLFdBQVcsRUFDVCxzSEFBc0g7Z0JBQ3RILDZDQUE2QztZQUMvQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUM7WUFDdEMsSUFBSSxFQUFFLFFBQVE7WUFDZCxZQUFZLEVBQUUsSUFBSTtTQUNuQixDQUFDO2FBQ0QsVUFBVSxDQUFDLGlCQUFpQixFQUFFO1lBQzdCLFdBQVcsRUFBRSwrREFBK0Q7WUFDNUUsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUM7WUFDaEMsSUFBSSxFQUFFLFFBQVE7U0FDZixDQUFDO2FBQ0QsTUFBTSxFQUFFLENBQUM7SUFDZCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUNSLGdCQUFnQixFQUNoQixjQUFjLEdBQ2dCO1FBQzlCLElBQUksZ0JBQWdCLEtBQUssU0FBUyxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7WUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FDYix1RkFBdUYsQ0FDeEYsQ0FBQztTQUNIO1FBRUQsUUFBUSxnQkFBZ0IsRUFBRTtZQUN4QixLQUFLLEtBQUs7Z0JBQ1IsSUFBQSw4QkFBa0IsRUFBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ1AsSUFBQSw4QkFBa0IsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLE1BQU07WUFDUixLQUFLLElBQUk7Z0JBQ1AsSUFBQSw4QkFBa0IsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLE1BQU07WUFDUixLQUFLLFNBQVM7Z0JBQ1osUUFBUSxjQUFjLEVBQUU7b0JBQ3RCLEtBQUssS0FBSzt3QkFDUixJQUFBLDhCQUFrQixFQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQzt3QkFDbkMsTUFBTTtvQkFDUixLQUFLLElBQUk7d0JBQ1AsSUFBQSw4QkFBa0IsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2xDLE1BQU07b0JBQ1IsS0FBSyxRQUFRO3dCQUNYLE1BQU0sSUFBQSxrQ0FBc0IsRUFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDbkMsTUFBTTtpQkFDVDtnQkFDRCxNQUFNO1lBQ1IsS0FBSyxRQUFRO2dCQUNYLE1BQU0sSUFBQSxpQ0FBcUIsRUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEMsTUFBTTtTQUNUO0lBQ0gsQ0FBQztDQUNGO0FBN0RELHdEQTZEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHtcbiAgcHJvbXB0R2xvYmFsQW5hbHl0aWNzLFxuICBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzLFxuICBzZXRBbmFseXRpY3NDb25maWcsXG59IGZyb20gJy4uLy4uL2FuYWx5dGljcy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSwgT3B0aW9ucyB9IGZyb20gJy4uLy4uL2NvbW1hbmQtYnVpbGRlci9jb21tYW5kLW1vZHVsZSc7XG5cbmludGVyZmFjZSBBbmFseXRpY3NDb21tYW5kQXJncyB7XG4gICdzZXR0aW5nLW9yLXByb2plY3QnOiAnb24nIHwgJ29mZicgfCAnY2knIHwgJ3Byb2plY3QnIHwgJ3Byb21wdCcgfCBzdHJpbmc7XG4gICdwcm9qZWN0LXNldHRpbmcnPzogJ29uJyB8ICdvZmYnIHwgJ3Byb21wdCcgfCBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NDb21tYW5kTW9kdWxlIGV4dGVuZHMgQ29tbWFuZE1vZHVsZTxBbmFseXRpY3NDb21tYW5kQXJncz4ge1xuICBjb21tYW5kID0gJ2FuYWx5dGljcyA8c2V0dGluZy1vci1wcm9qZWN0Pic7XG4gIGRlc2NyaWJlID0gJ0NvbmZpZ3VyZXMgdGhlIGdhdGhlcmluZyBvZiBBbmd1bGFyIENMSSB1c2FnZSBtZXRyaWNzLic7XG4gIGxvbmdEZXNjcmlwdGlvblBhdGggPSBqb2luKF9fZGlybmFtZSwgJ2xvbmctZGVzY3JpcHRpb24ubWQnKTtcblxuICBidWlsZGVyKGxvY2FsWWFyZ3M6IEFyZ3YpOiBBcmd2PEFuYWx5dGljc0NvbW1hbmRBcmdzPiB7XG4gICAgcmV0dXJuIGxvY2FsWWFyZ3NcbiAgICAgIC5wb3NpdGlvbmFsKCdzZXR0aW5nLW9yLXByb2plY3QnLCB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICdEaXJlY3RseSBlbmFibGVzIG9yIGRpc2FibGVzIGFsbCB1c2FnZSBhbmFseXRpY3MgZm9yIHRoZSB1c2VyLCBvciBwcm9tcHRzIHRoZSB1c2VyIHRvIHNldCB0aGUgc3RhdHVzIGludGVyYWN0aXZlbHksICcgK1xuICAgICAgICAgICdvciBzZXRzIHRoZSBkZWZhdWx0IHN0YXR1cyBmb3IgdGhlIHByb2plY3QuJyxcbiAgICAgICAgY2hvaWNlczogWydvbicsICdvZmYnLCAnY2knLCAncHJvbXB0J10sXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICBkZW1hbmRPcHRpb246IHRydWUsXG4gICAgICB9KVxuICAgICAgLnBvc2l0aW9uYWwoJ3Byb2plY3Qtc2V0dGluZycsIHtcbiAgICAgICAgZGVzY3JpcHRpb246ICdTZXRzIHRoZSBkZWZhdWx0IGFuYWx5dGljcyBlbmFibGVtZW50IHN0YXR1cyBmb3IgdGhlIHByb2plY3QuJyxcbiAgICAgICAgY2hvaWNlczogWydvbicsICdvZmYnLCAncHJvbXB0J10sXG4gICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgfSlcbiAgICAgIC5zdHJpY3QoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bih7XG4gICAgc2V0dGluZ09yUHJvamVjdCxcbiAgICBwcm9qZWN0U2V0dGluZyxcbiAgfTogT3B0aW9uczxBbmFseXRpY3NDb21tYW5kQXJncz4pOiBQcm9taXNlPG51bWJlciB8IHZvaWQ+IHtcbiAgICBpZiAoc2V0dGluZ09yUHJvamVjdCA9PT0gJ3Byb2plY3QnICYmIHByb2plY3RTZXR0aW5nID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0FyZ3VtZW50IFwicHJvamVjdFwiIHJlcXVpcmVzIGEgc2Vjb25kIGFyZ3VtZW50IG9mIG9uZSBvZiB0aGUgZm9sbG93aW5nIHZhbHVlOiBvbiwgb2ZmLicsXG4gICAgICApO1xuICAgIH1cblxuICAgIHN3aXRjaCAoc2V0dGluZ09yUHJvamVjdCkge1xuICAgICAgY2FzZSAnb2ZmJzpcbiAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCBmYWxzZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnb24nOlxuICAgICAgICBzZXRBbmFseXRpY3NDb25maWcoJ2dsb2JhbCcsIHRydWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NpJzpcbiAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCAnY2knKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwcm9qZWN0JzpcbiAgICAgICAgc3dpdGNoIChwcm9qZWN0U2V0dGluZykge1xuICAgICAgICAgIGNhc2UgJ29mZic6XG4gICAgICAgICAgICBzZXRBbmFseXRpY3NDb25maWcoJ2xvY2FsJywgZmFsc2UpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnb24nOlxuICAgICAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdsb2NhbCcsIHRydWUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAncHJvbXB0JzpcbiAgICAgICAgICAgIGF3YWl0IHByb21wdFByb2plY3RBbmFseXRpY3ModHJ1ZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3Byb21wdCc6XG4gICAgICAgIGF3YWl0IHByb21wdEdsb2JhbEFuYWx5dGljcyh0cnVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG4iXX0=