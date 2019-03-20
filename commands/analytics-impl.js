"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
                await this.printHelp(options);
                return 2;
            }
        }
        else if (options.settingOrProject == analytics_2.SettingOrProject.Project
            && options.projectSetting === undefined) {
            this.logger.error(`Argument ${JSON.stringify(options.settingOrProject)} requires a second `
                + `argument of one of the following value: on, off.`);
            return 2;
        }
        try {
            switch (options.settingOrProject) {
                case analytics_2.SettingOrProject.Off:
                    analytics_1.setAnalyticsConfig('global', false);
                    break;
                case analytics_2.SettingOrProject.On:
                    analytics_1.setAnalyticsConfig('global', true);
                    break;
                case analytics_2.SettingOrProject.Ci:
                    analytics_1.setAnalyticsConfig('global', 'ci');
                    break;
                case analytics_2.SettingOrProject.Project:
                    switch (options.projectSetting) {
                        case analytics_2.ProjectSetting.Off:
                            analytics_1.setAnalyticsConfig('local', false);
                            break;
                        case analytics_2.ProjectSetting.On:
                            analytics_1.setAnalyticsConfig('local', true);
                            break;
                        case analytics_2.ProjectSetting.Prompt:
                            await analytics_1.promptProjectAnalytics(true);
                            break;
                        default:
                            await this.printHelp(options);
                            return 3;
                    }
                    break;
                case analytics_2.SettingOrProject.Prompt:
                    await analytics_1.promptGlobalAnalytics(true);
                    break;
                default:
                    await this.printHelp(options);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl0aWNzLWltcGwuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL2FuZ3VsYXIvY2xpL2NvbW1hbmRzL2FuYWx5dGljcy1pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsbURBSTZCO0FBQzdCLCtDQUE0QztBQUU1QywyQ0FBaUc7QUFHakcsTUFBYSxnQkFBaUIsU0FBUSxpQkFBK0I7SUFDNUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUEyQztRQUMxRCx5RkFBeUY7UUFDekYsdUJBQXVCO1FBQ3ZCLDBGQUEwRjtRQUMxRixJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7WUFDMUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pCLGlFQUFpRTtnQkFDakUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDOUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsQ0FBQztnQkFFeEYsT0FBTyxDQUFDLENBQUM7YUFDVjtpQkFBTTtnQkFDTCwyQkFBMkI7Z0JBQzNCLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFFOUIsT0FBTyxDQUFDLENBQUM7YUFDVjtTQUNGO2FBQU0sSUFBSSxPQUFPLENBQUMsZ0JBQWdCLElBQUksNEJBQWdCLENBQUMsT0FBTztlQUNqRCxPQUFPLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRTtZQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQjtrQkFDekUsa0RBQWtELENBQUMsQ0FBQztZQUV0RSxPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsSUFBSTtZQUNGLFFBQVEsT0FBTyxDQUFDLGdCQUFnQixFQUFFO2dCQUNoQyxLQUFLLDRCQUFnQixDQUFDLEdBQUc7b0JBQ3ZCLDhCQUFrQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDcEMsTUFBTTtnQkFFUixLQUFLLDRCQUFnQixDQUFDLEVBQUU7b0JBQ3RCLDhCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDbkMsTUFBTTtnQkFFUixLQUFLLDRCQUFnQixDQUFDLEVBQUU7b0JBQ3RCLDhCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDbkMsTUFBTTtnQkFFUixLQUFLLDRCQUFnQixDQUFDLE9BQU87b0JBQzNCLFFBQVEsT0FBTyxDQUFDLGNBQWMsRUFBRTt3QkFDOUIsS0FBSywwQkFBYyxDQUFDLEdBQUc7NEJBQ3JCLDhCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQzs0QkFDbkMsTUFBTTt3QkFFUixLQUFLLDBCQUFjLENBQUMsRUFBRTs0QkFDcEIsOEJBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDOzRCQUNsQyxNQUFNO3dCQUVSLEtBQUssMEJBQWMsQ0FBQyxNQUFNOzRCQUN4QixNQUFNLGtDQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNuQyxNQUFNO3dCQUVSOzRCQUNFLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQzs0QkFFOUIsT0FBTyxDQUFDLENBQUM7cUJBQ1o7b0JBQ0QsTUFBTTtnQkFFUixLQUFLLDRCQUFnQixDQUFDLE1BQU07b0JBQzFCLE1BQU0saUNBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2xDLE1BQU07Z0JBRVI7b0JBQ0UsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUU5QixPQUFPLENBQUMsQ0FBQzthQUNaO1NBQ0Y7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUUvQixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0NBQ0Y7QUE5RUQsNENBOEVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgcHJvbXB0R2xvYmFsQW5hbHl0aWNzLFxuICBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzLFxuICBzZXRBbmFseXRpY3NDb25maWcsXG59IGZyb20gJy4uL21vZGVscy9hbmFseXRpY3MnO1xuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJy4uL21vZGVscy9jb21tYW5kJztcbmltcG9ydCB7IEFyZ3VtZW50cyB9IGZyb20gJy4uL21vZGVscy9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgUHJvamVjdFNldHRpbmcsIFNjaGVtYSBhcyBBbmFseXRpY3NDb21tYW5kU2NoZW1hLCBTZXR0aW5nT3JQcm9qZWN0IH0gZnJvbSAnLi9hbmFseXRpY3MnO1xuXG5cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NDb21tYW5kIGV4dGVuZHMgQ29tbWFuZDxBbmFseXRpY3NDb21tYW5kU2NoZW1hPiB7XG4gIHB1YmxpYyBhc3luYyBydW4ob3B0aW9uczogQW5hbHl0aWNzQ29tbWFuZFNjaGVtYSAmIEFyZ3VtZW50cykge1xuICAgIC8vIE91ciBwYXJzZXIgZG9lcyBub3Qgc3VwcG9ydCBwb3NpdGlvbmFsIGVudW1zICh3b24ndCByZXBvcnQgaW52YWxpZCBwYXJhbWV0ZXJzKS4gRG8gdGhlXG4gICAgLy8gdmFsaWRhdGlvbiBtYW51YWxseS5cbiAgICAvLyBUT0RPKGhhbnNsKTogZml4IHBhcnNlciB0byBiZXR0ZXIgc3VwcG9ydCBwb3NpdGlvbmFscy4gVGhpcyB3b3VsZCBiZSBhIGJyZWFraW5nIGNoYW5nZS5cbiAgICBpZiAob3B0aW9ucy5zZXR0aW5nT3JQcm9qZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChvcHRpb25zWyctLSddKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyIHBhc3NlZCBwb3NpdGlvbmFsIGFyZ3VtZW50cyBidXQgdGhleSBkaWRuJ3QgdmFsaWRhdGUuXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBBcmd1bWVudCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnNbJy0tJ11bMF0pfSBpcyBpbnZhbGlkLmApO1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihgUGxlYXNlIHByb3ZpZGUgb25lIG9mIHRoZSBmb2xsb3dpbmcgdmFsdWU6IG9uLCBvZmYsIGNpIG9yIHByb2plY3QuYCk7XG5cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBObyBhcmd1bWVudCB3ZXJlIHBhc3NlZC5cbiAgICAgICAgYXdhaXQgdGhpcy5wcmludEhlbHAob3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIDI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLnNldHRpbmdPclByb2plY3QgPT0gU2V0dGluZ09yUHJvamVjdC5Qcm9qZWN0XG4gICAgICAgICAgICAgICAmJiBvcHRpb25zLnByb2plY3RTZXR0aW5nID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBBcmd1bWVudCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnMuc2V0dGluZ09yUHJvamVjdCl9IHJlcXVpcmVzIGEgc2Vjb25kIGBcbiAgICAgICAgICAgICAgICAgICAgICArIGBhcmd1bWVudCBvZiBvbmUgb2YgdGhlIGZvbGxvd2luZyB2YWx1ZTogb24sIG9mZi5gKTtcblxuICAgICAgcmV0dXJuIDI7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHN3aXRjaCAob3B0aW9ucy5zZXR0aW5nT3JQcm9qZWN0KSB7XG4gICAgICAgIGNhc2UgU2V0dGluZ09yUHJvamVjdC5PZmY6XG4gICAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdnbG9iYWwnLCBmYWxzZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBTZXR0aW5nT3JQcm9qZWN0Lk9uOlxuICAgICAgICAgIHNldEFuYWx5dGljc0NvbmZpZygnZ2xvYmFsJywgdHJ1ZSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBTZXR0aW5nT3JQcm9qZWN0LkNpOlxuICAgICAgICAgIHNldEFuYWx5dGljc0NvbmZpZygnZ2xvYmFsJywgJ2NpJyk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBTZXR0aW5nT3JQcm9qZWN0LlByb2plY3Q6XG4gICAgICAgICAgc3dpdGNoIChvcHRpb25zLnByb2plY3RTZXR0aW5nKSB7XG4gICAgICAgICAgICBjYXNlIFByb2plY3RTZXR0aW5nLk9mZjpcbiAgICAgICAgICAgICAgc2V0QW5hbHl0aWNzQ29uZmlnKCdsb2NhbCcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgUHJvamVjdFNldHRpbmcuT246XG4gICAgICAgICAgICAgIHNldEFuYWx5dGljc0NvbmZpZygnbG9jYWwnLCB0cnVlKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgUHJvamVjdFNldHRpbmcuUHJvbXB0OlxuICAgICAgICAgICAgICBhd2FpdCBwcm9tcHRQcm9qZWN0QW5hbHl0aWNzKHRydWUpO1xuICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wcmludEhlbHAob3B0aW9ucyk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIDM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgU2V0dGluZ09yUHJvamVjdC5Qcm9tcHQ6XG4gICAgICAgICAgYXdhaXQgcHJvbXB0R2xvYmFsQW5hbHl0aWNzKHRydWUpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYXdhaXQgdGhpcy5wcmludEhlbHAob3B0aW9ucyk7XG5cbiAgICAgICAgICByZXR1cm4gNDtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmZhdGFsKGVyci5tZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cbn1cbiJdfQ==