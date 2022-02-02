"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsCommand = void 0;
const analytics_1 = require("../models/analytics");
const command_1 = require("../models/command");
const analytics_2 = require("./analytics");
class AnalyticsCommand extends command_1.Command {
    async run(options) {
        // Our parser does not support positional enums (won't report invalid parameters). Do the
        // validation manually.
        // TODO(hansl): fix parser to better support positionals. This would be a breaking change.
        if (options.settingOrProject === undefined) {
            if (options['--']) {
                // The user passed positional arguments but they didn't validate.
                this.logger.error(`Argument ${JSON.stringify(options['--'][0])} is invalid.`);
                this.logger.error(`Please provide one of the following value: on, off, ci or project.`);
                return 1;
            }
            else {
                // No argument were passed.
                await this.printHelp();
                return 2;
            }
        }
        else if (options.settingOrProject == analytics_2.SettingOrProject.Project &&
            options.projectSetting === undefined) {
            this.logger.error(`Argument ${JSON.stringify(options.settingOrProject)} requires a second ` +
                `argument of one of the following value: on, off.`);
            return 2;
        }
        try {
            switch (options.settingOrProject) {
                case analytics_2.SettingOrProject.Off:
                    (0, analytics_1.setAnalyticsConfig)('global', false);
                    break;
                case analytics_2.SettingOrProject.On:
                    (0, analytics_1.setAnalyticsConfig)('global', true);
                    break;
                case analytics_2.SettingOrProject.Ci:
                    (0, analytics_1.setAnalyticsConfig)('global', 'ci');
                    break;
                case analytics_2.SettingOrProject.Project:
                    switch (options.projectSetting) {
                        case analytics_2.ProjectSetting.Off:
                            (0, analytics_1.setAnalyticsConfig)('local', false);
                            break;
                        case analytics_2.ProjectSetting.On:
                            (0, analytics_1.setAnalyticsConfig)('local', true);
                            break;
                        case analytics_2.ProjectSetting.Prompt:
                            await (0, analytics_1.promptProjectAnalytics)(true);
                            break;
                        default:
                            await this.printHelp();
                            return 3;
                    }
                    break;
                case analytics_2.SettingOrProject.Prompt:
                    await (0, analytics_1.promptGlobalAnalytics)(true);
                    break;
                default:
                    await this.printHelp();
                    return 4;
            }
        }
        catch (err) {
            this.logger.fatal(err.message);
            return 1;
        }
        return 0;
    }
}
exports.AnalyticsCommand = AnalyticsCommand;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLWltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyL2NsaS9jb21tYW5kcy9hbmFseXRpY3MtaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxtREFJNkI7QUFDN0IsK0NBQTRDO0FBRTVDLDJDQUFpRztBQUVqRyxNQUFhLGdCQUFpQixTQUFRLGlCQUErQjtJQUM1RCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQTJDO1FBQzFELHlGQUF5RjtRQUN6Rix1QkFBdUI7UUFDdkIsMEZBQTBGO1FBQzFGLElBQUksT0FBTyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtZQUMxQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDakIsaUVBQWlFO2dCQUNqRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUM5RSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvRUFBb0UsQ0FBQyxDQUFDO2dCQUV4RixPQUFPLENBQUMsQ0FBQzthQUNWO2lCQUFNO2dCQUNMLDJCQUEyQjtnQkFDM0IsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBRXZCLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjthQUFNLElBQ0wsT0FBTyxDQUFDLGdCQUFnQixJQUFJLDRCQUFnQixDQUFDLE9BQU87WUFDcEQsT0FBTyxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQ3BDO1lBQ0EsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2YsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUI7Z0JBQ3ZFLGtEQUFrRCxDQUNyRCxDQUFDO1lBRUYsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELElBQUk7WUFDRixRQUFRLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDaEMsS0FBSyw0QkFBZ0IsQ0FBQyxHQUFHO29CQUN2QixJQUFBLDhCQUFrQixFQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDcEMsTUFBTTtnQkFFUixLQUFLLDRCQUFnQixDQUFDLEVBQUU7b0JBQ3RCLElBQUEsOEJBQWtCLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUNuQyxNQUFNO2dCQUVSLEtBQUssNEJBQWdCLENBQUMsRUFBRTtvQkFDdEIsSUFBQSw4QkFBa0IsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ25DLE1BQU07Z0JBRVIsS0FBSyw0QkFBZ0IsQ0FBQyxPQUFPO29CQUMzQixRQUFRLE9BQU8sQ0FBQyxjQUFjLEVBQUU7d0JBQzlCLEtBQUssMEJBQWMsQ0FBQyxHQUFHOzRCQUNyQixJQUFBLDhCQUFrQixFQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQzs0QkFDbkMsTUFBTTt3QkFFUixLQUFLLDBCQUFjLENBQUMsRUFBRTs0QkFDcEIsSUFBQSw4QkFBa0IsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7NEJBQ2xDLE1BQU07d0JBRVIsS0FBSywwQkFBYyxDQUFDLE1BQU07NEJBQ3hCLE1BQU0sSUFBQSxrQ0FBc0IsRUFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDbkMsTUFBTTt3QkFFUjs0QkFDRSxNQUFNLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzs0QkFFdkIsT0FBTyxDQUFDLENBQUM7cUJBQ1o7b0JBQ0QsTUFBTTtnQkFFUixLQUFLLDRCQUFnQixDQUFDLE1BQU07b0JBQzFCLE1BQU0sSUFBQSxpQ0FBcUIsRUFBQyxJQUFJLENBQUMsQ0FBQztvQkFDbEMsTUFBTTtnQkFFUjtvQkFDRSxNQUFNLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFFdkIsT0FBTyxDQUFDLENBQUM7YUFDWjtTQUNGO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFL0IsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztDQUNGO0FBbEZELDRDQWtGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBwcm9tcHRHbG9iYWxBbmFseXRpY3MsXG4gIHByb21wdFByb2plY3RBbmFseXRpY3MsXG4gIHNldEFuYWx5dGljc0NvbmZpZyxcbn0gZnJvbSAnLi4vbW9kZWxzL2FuYWx5dGljcyc7XG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnLi4vbW9kZWxzL2NvbW1hbmQnO1xuaW1wb3J0IHsgQXJndW1lbnRzIH0gZnJvbSAnLi4vbW9kZWxzL2ludGVyZmFjZSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQW5hbHl0aWNzQ29tbWFuZFNjaGVtYSwgUHJvamVjdFNldHRpbmcsIFNldHRpbmdPclByb2plY3QgfSBmcm9tICcuL2FuYWx5dGljcyc7XG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxBbmFseXRpY3NDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQW5hbHl0aWNzQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIC8vIE91ciBwYXJzZXIgZG9lcyBub3Qgc3VwcG9ydCBwb3NpdGlvbmFsIGVudW1zICh3b24ndCByZXBvcnQgaW52YWxpZCBwYXJhbWV0ZXJzKS4gRG8gdGhlXG4gICAgLy8gdmFsaWRhdGlvbiBtYW51YWxseS5cbiAgICAvLyBUT0RPKGhhbnNsKTogZml4IHBhcnNlciB0byBiZXR0ZXIgc3VwcG9ydCBwb3NpdGlvbmFscy4gVGhpcyB3b3VsZCBiZSBhIGJyZWFraW5nIGNoYW5nZS5cbiAgICBpZiAob3B0aW9ucy5zZXR0aW5nT3JQcm9qZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChvcHRpb25zWyctLSddKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyIHBhc3NlZCBwb3NpdGlvbmFsIGFyZ3VtZW50cyBidXQgdGhleSBkaWRuJ3QgdmFsaWRhdGUuXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBBcmd1bWVudCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnNbJy0tJ11bMF0pfSBpcyBpbnZhbGlkLmApO1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgUGxlYXNlIHByb3ZpZGUgb25lIG9mIHRoZSBmb2xsb3dpbmcgdmFsdWU6IG9uLCBvZmYsIGNpIG9yIHByb2plY3QuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBObyBhcmd1bWVudCB3ZXJlIHBhc3NlZC5cbiAgICAgICAgYXdhaXQgdGhpcy5wcmludEhlbHAoKTtcblxuICAgICAgICByZXR1cm4gMjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgb3B0aW9ucy5zZXR0aW5nT3JQcm9qZWN0ID09IFNldHRpbmdPclByb2plY3QuUHJvamVjdCAmJlxuICAgICAgb3B0aW9ucy5wcm9qZWN0U2V0dGluZyA9PT0gdW5kZWZpbmVkXG4gICAgKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgYEFyZ3VtZW50ICR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucy5zZXR0aW5nT3JQcm9qZWN0KX0gcmVxdWlyZXMgYSBzZWNvbmQgYCArXG4gICAgICAgICAgYGFyZ3VtZW50IG9mIG9uZSBvZiB0aGUgZm9sbG93aW5nIHZhbHVlOiBvbiwgb2ZmLmAsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gMjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgc3dpdGNoIChvcHRpb25zLnNldHRpbmdPclByb2plY3QpIHtcbiAgICAgICAgY2FzZSBTZXR0aW5nT3JQcm9qZWN0Lk9mZjpcbiAgICAgICAgICBzZXRBbmFseXRpY3NDb25maWcoJ2dsb2JhbCcsIGZhbHNlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIFNldHRpbmdPclByb2plY3QuT246XG4gICAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCB0cnVlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIFNldHRpbmdPclByb2plY3QuQ2k6XG4gICAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCAnY2knKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIFNldHRpbmdPclByb2plY3QuUHJvamVjdDpcbiAgICAgICAgICBzd2l0Y2ggKG9wdGlvbnMucHJvamVjdFNldHRpbmcpIHtcbiAgICAgICAgICAgIGNhc2UgUHJvamVjdFNldHRpbmcuT2ZmOlxuICAgICAgICAgICAgICBzZXRBbmFseXRpY3NDb25maWcoJ2xvY2FsJywgZmFsc2UpO1xuICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBQcm9qZWN0U2V0dGluZy5PbjpcbiAgICAgICAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdsb2NhbCcsIHRydWUpO1xuICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBQcm9qZWN0U2V0dGluZy5Qcm9tcHQ6XG4gICAgICAgICAgICAgIGF3YWl0IHByb21wdFByb2plY3RBbmFseXRpY3ModHJ1ZSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnByaW50SGVscCgpO1xuXG4gICAgICAgICAgICAgIHJldHVybiAzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIFNldHRpbmdPclByb2plY3QuUHJvbXB0OlxuICAgICAgICAgIGF3YWl0IHByb21wdEdsb2JhbEFuYWx5dGljcyh0cnVlKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGF3YWl0IHRoaXMucHJpbnRIZWxwKCk7XG5cbiAgICAgICAgICByZXR1cm4gNDtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGVyci5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cbiJdfQ==