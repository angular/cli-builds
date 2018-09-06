"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
const core_1 = require("@angular-devkit/core");
const interface_1 = require("./interface");
function _coerceType(str, type, v) {
    switch (type) {
        case 'any':
            if (Array.isArray(v)) {
                return v.concat(str || '');
            }
            return _coerceType(str, interface_1.OptionType.Boolean, v) !== undefined
                ? _coerceType(str, interface_1.OptionType.Boolean, v)
                : _coerceType(str, interface_1.OptionType.Number, v) !== undefined
                    ? _coerceType(str, interface_1.OptionType.Number, v)
                    : _coerceType(str, interface_1.OptionType.String, v);
        case 'string':
            return str || '';
        case 'boolean':
            switch (str) {
                case 'false':
                    return false;
                case undefined:
                case '':
                case 'true':
                    return true;
                default:
                    return undefined;
            }
        case 'number':
            if (str === undefined) {
                return 0;
            }
            else if (Number.isFinite(+str)) {
                return +str;
            }
            else {
                return undefined;
            }
        case 'array':
            return Array.isArray(v) ? v.concat(str || '') : [str || ''];
        default:
            return undefined;
    }
}
function _coerce(str, o, v) {
    if (!o) {
        return _coerceType(str, interface_1.OptionType.Any, v);
    }
    else if (o.type == 'suboption') {
        return _coerceType(str, interface_1.OptionType.String, v);
    }
    else {
        return _coerceType(str, o.type, v);
    }
}
function _getOptionFromName(name, options) {
    const cName = core_1.strings.camelize(name);
    for (const option of options) {
        if (option.name == name || option.name == cName) {
            return option;
        }
        if (option.aliases.some(x => x == name || x == cName)) {
            return option;
        }
    }
    return undefined;
}
function _assignOption(arg, args, options, parsedOptions, _positionals, leftovers) {
    let key = arg.substr(2);
    let option = null;
    let value = '';
    const i = arg.indexOf('=');
    // If flag is --no-abc AND there's no equal sign.
    if (i == -1) {
        if (key.startsWith('no-')) {
            // Only use this key if the option matching the rest is a boolean.
            const maybeOption = _getOptionFromName(key.substr(3), options);
            if (maybeOption && maybeOption.type == 'boolean') {
                value = 'false';
                option = maybeOption;
            }
        }
        else if (key.startsWith('no')) {
            // Only use this key if the option matching the rest is a boolean.
            const maybeOption = _getOptionFromName(key.substr(2), options);
            if (maybeOption && maybeOption.type == 'boolean') {
                value = 'false';
                option = maybeOption;
            }
        }
        if (option === null) {
            // Set it to true if it's a boolean and the next argument doesn't match true/false.
            const maybeOption = _getOptionFromName(key, options);
            if (maybeOption) {
                // Not of type boolean, consume the next value.
                value = args[0];
                // Only absorb it if it leads to a value.
                if (_coerce(value, maybeOption) !== undefined) {
                    args.shift();
                }
                else {
                    value = '';
                }
                option = maybeOption;
            }
        }
    }
    else {
        key = arg.substring(0, i);
        option = _getOptionFromName(key, options) || null;
        if (option) {
            value = arg.substring(i + 1);
            if (option.type === 'boolean' && _coerce(value, option) === undefined) {
                value = 'true';
            }
        }
    }
    if (option === null) {
        if (args[0] && !args[0].startsWith('--')) {
            leftovers.push(arg, args[0]);
            args.shift();
        }
        else {
            leftovers.push(arg);
        }
    }
    else {
        const v = _coerce(value, option, parsedOptions[option.name]);
        if (v !== undefined) {
            parsedOptions[option.name] = v;
        }
    }
}
/**
 * Parse the arguments in a consistent way, but without having any option definition. This tries
 * to assess what the user wants in a free form. For example, using `--name=false` will set the
 * name properties to a boolean type.
 * This should only be used when there's no schema available or if a schema is "true" (anything is
 * valid).
 *
 * @param args Argument list to parse.
 * @returns An object that contains a property per flags from the args.
 */
function parseFreeFormArguments(args) {
    const parsedOptions = {};
    const leftovers = [];
    for (let arg = args.shift(); arg !== undefined; arg = args.shift()) {
        if (arg == '--') {
            leftovers.push(...args);
            break;
        }
        if (arg.startsWith('--')) {
            const eqSign = arg.indexOf('=');
            let name;
            let value;
            if (eqSign !== -1) {
                name = arg.substring(2, eqSign);
                value = arg.substring(eqSign + 1);
            }
            else {
                name = arg.substr(2);
                value = args.shift();
            }
            const v = _coerce(value, null, parsedOptions[name]);
            if (v !== undefined) {
                parsedOptions[name] = v;
            }
        }
        else if (arg.startsWith('-')) {
            arg.split('').forEach(x => parsedOptions[x] = true);
        }
        else {
            leftovers.push(arg);
        }
    }
    parsedOptions['--'] = leftovers;
    return parsedOptions;
}
exports.parseFreeFormArguments = parseFreeFormArguments;
/**
 * Parse the arguments in a consistent way, from a list of standardized options.
 * The result object will have a key per option name, with the `_` key reserved for positional
 * arguments, and `--` will contain everything that did not match. Any key that don't have an
 * option will be pushed back in `--` and removed from the object. If you need to validate that
 * there's no additionalProperties, you need to check the `--` key.
 *
 * @param args The argument array to parse.
 * @param options List of supported options. {@see Option}.
 * @returns An object that contains a property per option.
 */
function parseArguments(args, options) {
    if (options === null) {
        options = [];
    }
    const leftovers = [];
    const positionals = [];
    const parsedOptions = {};
    for (let arg = args.shift(); arg !== undefined; arg = args.shift()) {
        if (!arg) {
            break;
        }
        if (arg == '--') {
            // If we find a --, we're done.
            leftovers.push(...args);
            break;
        }
        if (arg.startsWith('--')) {
            _assignOption(arg, args, options, parsedOptions, positionals, leftovers);
        }
        else if (arg.startsWith('-')) {
            // Argument is of form -abcdef.  Starts at 1 because we skip the `-`.
            for (let i = 1; i < arg.length; i++) {
                const flag = arg[i];
                // Treat the last flag as `--a` (as if full flag but just one letter). We do this in
                // the loop because it saves us a check to see if the arg is just `-`.
                if (i == arg.length - 1) {
                    _assignOption('--' + flag, args, options, parsedOptions, positionals, leftovers);
                }
                else {
                    const maybeOption = _getOptionFromName(flag, options);
                    if (maybeOption) {
                        const v = _coerce(undefined, maybeOption, parsedOptions[maybeOption.name]);
                        if (v !== undefined) {
                            parsedOptions[maybeOption.name] = v;
                        }
                    }
                }
            }
        }
        else {
            positionals.push(arg);
        }
    }
    // Deal with positionals.
    if (positionals.length > 0) {
        let pos = 0;
        for (let i = 0; i < positionals.length;) {
            let found = false;
            let incrementPos = false;
            let incrementI = true;
            // We do this with a found flag because more than 1 option could have the same positional.
            for (const option of options) {
                // If any option has this positional and no value, we need to remove it.
                if (option.positional === pos) {
                    if (parsedOptions[option.name] === undefined) {
                        parsedOptions[option.name] = positionals[i];
                        found = true;
                    }
                    else {
                        incrementI = false;
                    }
                    incrementPos = true;
                }
            }
            if (found) {
                positionals.splice(i--, 1);
            }
            if (incrementPos) {
                pos++;
            }
            if (incrementI) {
                i++;
            }
        }
    }
    if (positionals.length > 0 || leftovers.length > 0) {
        parsedOptions['--'] = [...positionals, ...leftovers];
    }
    return parsedOptions;
}
exports.parseArguments = parseArguments;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyL2NsaS9tb2RlbHMvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7R0FPRztBQUNILCtDQUErQztBQUMvQywyQ0FBbUU7QUFHbkUsU0FBUyxXQUFXLENBQUMsR0FBdUIsRUFBRSxJQUFnQixFQUFFLENBQVM7SUFDdkUsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLEtBQUs7WUFDUixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUM7YUFDNUI7WUFFRCxPQUFPLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUztnQkFDdkQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTO29CQUN0RCxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7b0JBQ3hDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLHNCQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhELEtBQUssUUFBUTtZQUNYLE9BQU8sR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUVuQixLQUFLLFNBQVM7WUFDWixRQUFRLEdBQUcsRUFBRTtnQkFDWCxLQUFLLE9BQU87b0JBQ1YsT0FBTyxLQUFLLENBQUM7Z0JBRWYsS0FBSyxTQUFTLENBQUM7Z0JBQ2YsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsS0FBSyxNQUFNO29CQUNU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RSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzVCO1lBQ0QsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLEdBQUcsRUFBRSxDQUFDO2FBQ1A7WUFDRCxJQUFJLFVBQVUsRUFBRTtnQkFDZCxDQUFDLEVBQUUsQ0FBQzthQUNMO1NBQ0Y7S0FDRjtJQUVELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDbEQsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztLQUN0RDtJQUVELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUM7QUFwRkQsd0NBb0ZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqXG4gKi9cbmltcG9ydCB7IHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBBcmd1bWVudHMsIE9wdGlvbiwgT3B0aW9uVHlwZSwgVmFsdWUgfSBmcm9tICcuL2ludGVyZmFjZSc7XG5cblxuZnVuY3Rpb24gX2NvZXJjZVR5cGUoc3RyOiBzdHJpbmcgfCB1bmRlZmluZWQsIHR5cGU6IE9wdGlvblR5cGUsIHY/OiBWYWx1ZSk6IFZhbHVlIHwgdW5kZWZpbmVkIHtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAnYW55JzpcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgIHJldHVybiB2LmNvbmNhdChzdHIgfHwgJycpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLkJvb2xlYW4sIHYpICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgPyBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuQm9vbGVhbiwgdilcbiAgICAgICAgICAgOiBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuTnVtYmVyLCB2KSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgID8gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLk51bWJlciwgdilcbiAgICAgICAgICAgOiBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuU3RyaW5nLCB2KTtcblxuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gc3RyIHx8ICcnO1xuXG4gICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICBzd2l0Y2ggKHN0cikge1xuICAgICAgICBjYXNlICdmYWxzZSc6XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICBjYXNlICcnOlxuICAgICAgICBjYXNlICd0cnVlJzpcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICBjYXNlICdudW1iZXInOlxuICAgICAgaWYgKHN0ciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSBlbHNlIGlmIChOdW1iZXIuaXNGaW5pdGUoK3N0cikpIHtcbiAgICAgICAgcmV0dXJuICtzdHI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgY2FzZSAnYXJyYXknOlxuICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodikgPyB2LmNvbmNhdChzdHIgfHwgJycpIDogW3N0ciB8fCAnJ107XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY29lcmNlKHN0cjogc3RyaW5nIHwgdW5kZWZpbmVkLCBvOiBPcHRpb24gfCBudWxsLCB2PzogVmFsdWUpOiBWYWx1ZSB8IHVuZGVmaW5lZCB7XG4gIGlmICghbykge1xuICAgIHJldHVybiBfY29lcmNlVHlwZShzdHIsIE9wdGlvblR5cGUuQW55LCB2KTtcbiAgfSBlbHNlIGlmIChvLnR5cGUgPT0gJ3N1Ym9wdGlvbicpIHtcbiAgICByZXR1cm4gX2NvZXJjZVR5cGUoc3RyLCBPcHRpb25UeXBlLlN0cmluZywgdik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIF9jb2VyY2VUeXBlKHN0ciwgby50eXBlLCB2KTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIF9nZXRPcHRpb25Gcm9tTmFtZShuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IE9wdGlvbltdKTogT3B0aW9uIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgY05hbWUgPSBzdHJpbmdzLmNhbWVsaXplKG5hbWUpO1xuXG4gIGZvciAoY29uc3Qgb3B0aW9uIG9mIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9uLm5hbWUgPT0gbmFtZSB8fCBvcHRpb24ubmFtZSA9PSBjTmFtZSkge1xuICAgICAgcmV0dXJuIG9wdGlvbjtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9uLmFsaWFzZXMuc29tZSh4ID0+IHggPT0gbmFtZSB8fCB4ID09IGNOYW1lKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5cbmZ1bmN0aW9uIF9hc3NpZ25PcHRpb24oXG4gIGFyZzogc3RyaW5nLFxuICBhcmdzOiBzdHJpbmdbXSxcbiAgb3B0aW9uczogT3B0aW9uW10sXG4gIHBhcnNlZE9wdGlvbnM6IEFyZ3VtZW50cyxcbiAgX3Bvc2l0aW9uYWxzOiBzdHJpbmdbXSxcbiAgbGVmdG92ZXJzOiBzdHJpbmdbXSxcbikge1xuICBsZXQga2V5ID0gYXJnLnN1YnN0cigyKTtcbiAgbGV0IG9wdGlvbjogT3B0aW9uIHwgbnVsbCA9IG51bGw7XG4gIGxldCB2YWx1ZSA9ICcnO1xuICBjb25zdCBpID0gYXJnLmluZGV4T2YoJz0nKTtcblxuICAvLyBJZiBmbGFnIGlzIC0tbm8tYWJjIEFORCB0aGVyZSdzIG5vIGVxdWFsIHNpZ24uXG4gIGlmIChpID09IC0xKSB7XG4gICAgaWYgKGtleS5zdGFydHNXaXRoKCduby0nKSkge1xuICAgICAgLy8gT25seSB1c2UgdGhpcyBrZXkgaWYgdGhlIG9wdGlvbiBtYXRjaGluZyB0aGUgcmVzdCBpcyBhIGJvb2xlYW4uXG4gICAgICBjb25zdCBtYXliZU9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShrZXkuc3Vic3RyKDMpLCBvcHRpb25zKTtcbiAgICAgIGlmIChtYXliZU9wdGlvbiAmJiBtYXliZU9wdGlvbi50eXBlID09ICdib29sZWFuJykge1xuICAgICAgICB2YWx1ZSA9ICdmYWxzZSc7XG4gICAgICAgIG9wdGlvbiA9IG1heWJlT3B0aW9uO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoa2V5LnN0YXJ0c1dpdGgoJ25vJykpIHtcbiAgICAgIC8vIE9ubHkgdXNlIHRoaXMga2V5IGlmIHRoZSBvcHRpb24gbWF0Y2hpbmcgdGhlIHJlc3QgaXMgYSBib29sZWFuLlxuICAgICAgY29uc3QgbWF5YmVPcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoa2V5LnN1YnN0cigyKSwgb3B0aW9ucyk7XG4gICAgICBpZiAobWF5YmVPcHRpb24gJiYgbWF5YmVPcHRpb24udHlwZSA9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdmFsdWUgPSAnZmFsc2UnO1xuICAgICAgICBvcHRpb24gPSBtYXliZU9wdGlvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9uID09PSBudWxsKSB7XG4gICAgICAvLyBTZXQgaXQgdG8gdHJ1ZSBpZiBpdCdzIGEgYm9vbGVhbiBhbmQgdGhlIG5leHQgYXJndW1lbnQgZG9lc24ndCBtYXRjaCB0cnVlL2ZhbHNlLlxuICAgICAgY29uc3QgbWF5YmVPcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoa2V5LCBvcHRpb25zKTtcbiAgICAgIGlmIChtYXliZU9wdGlvbikge1xuICAgICAgICAvLyBOb3Qgb2YgdHlwZSBib29sZWFuLCBjb25zdW1lIHRoZSBuZXh0IHZhbHVlLlxuICAgICAgICB2YWx1ZSA9IGFyZ3NbMF07XG4gICAgICAgIC8vIE9ubHkgYWJzb3JiIGl0IGlmIGl0IGxlYWRzIHRvIGEgdmFsdWUuXG4gICAgICAgIGlmIChfY29lcmNlKHZhbHVlLCBtYXliZU9wdGlvbikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbiA9IG1heWJlT3B0aW9uO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBrZXkgPSBhcmcuc3Vic3RyaW5nKDAsIGkpO1xuICAgIG9wdGlvbiA9IF9nZXRPcHRpb25Gcm9tTmFtZShrZXksIG9wdGlvbnMpIHx8IG51bGw7XG4gICAgaWYgKG9wdGlvbikge1xuICAgICAgdmFsdWUgPSBhcmcuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICAgIGlmIChvcHRpb24udHlwZSA9PT0gJ2Jvb2xlYW4nICYmIF9jb2VyY2UodmFsdWUsIG9wdGlvbikgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YWx1ZSA9ICd0cnVlJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKG9wdGlvbiA9PT0gbnVsbCkge1xuICAgIGlmIChhcmdzWzBdICYmICFhcmdzWzBdLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKGFyZywgYXJnc1swXSk7XG4gICAgICBhcmdzLnNoaWZ0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKGFyZyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IHYgPSBfY29lcmNlKHZhbHVlLCBvcHRpb24sIHBhcnNlZE9wdGlvbnNbb3B0aW9uLm5hbWVdKTtcbiAgICBpZiAodiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSA9IHY7XG4gICAgfVxuICB9XG59XG5cblxuLyoqXG4gKiBQYXJzZSB0aGUgYXJndW1lbnRzIGluIGEgY29uc2lzdGVudCB3YXksIGJ1dCB3aXRob3V0IGhhdmluZyBhbnkgb3B0aW9uIGRlZmluaXRpb24uIFRoaXMgdHJpZXNcbiAqIHRvIGFzc2VzcyB3aGF0IHRoZSB1c2VyIHdhbnRzIGluIGEgZnJlZSBmb3JtLiBGb3IgZXhhbXBsZSwgdXNpbmcgYC0tbmFtZT1mYWxzZWAgd2lsbCBzZXQgdGhlXG4gKiBuYW1lIHByb3BlcnRpZXMgdG8gYSBib29sZWFuIHR5cGUuXG4gKiBUaGlzIHNob3VsZCBvbmx5IGJlIHVzZWQgd2hlbiB0aGVyZSdzIG5vIHNjaGVtYSBhdmFpbGFibGUgb3IgaWYgYSBzY2hlbWEgaXMgXCJ0cnVlXCIgKGFueXRoaW5nIGlzXG4gKiB2YWxpZCkuXG4gKlxuICogQHBhcmFtIGFyZ3MgQXJndW1lbnQgbGlzdCB0byBwYXJzZS5cbiAqIEByZXR1cm5zIEFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgcHJvcGVydHkgcGVyIGZsYWdzIGZyb20gdGhlIGFyZ3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUZyZWVGb3JtQXJndW1lbnRzKGFyZ3M6IHN0cmluZ1tdKTogQXJndW1lbnRzIHtcbiAgY29uc3QgcGFyc2VkT3B0aW9uczogQXJndW1lbnRzID0ge307XG4gIGNvbnN0IGxlZnRvdmVycyA9IFtdO1xuXG4gIGZvciAobGV0IGFyZyA9IGFyZ3Muc2hpZnQoKTsgYXJnICE9PSB1bmRlZmluZWQ7IGFyZyA9IGFyZ3Muc2hpZnQoKSkge1xuICAgIGlmIChhcmcgPT0gJy0tJykge1xuICAgICAgbGVmdG92ZXJzLnB1c2goLi4uYXJncyk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYXJnLnN0YXJ0c1dpdGgoJy0tJykpIHtcbiAgICAgIGNvbnN0IGVxU2lnbiA9IGFyZy5pbmRleE9mKCc9Jyk7XG4gICAgICBsZXQgbmFtZTogc3RyaW5nO1xuICAgICAgbGV0IHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoZXFTaWduICE9PSAtMSkge1xuICAgICAgICBuYW1lID0gYXJnLnN1YnN0cmluZygyLCBlcVNpZ24pO1xuICAgICAgICB2YWx1ZSA9IGFyZy5zdWJzdHJpbmcoZXFTaWduICsgMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lID0gYXJnLnN1YnN0cigyKTtcbiAgICAgICAgdmFsdWUgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHYgPSBfY29lcmNlKHZhbHVlLCBudWxsLCBwYXJzZWRPcHRpb25zW25hbWVdKTtcbiAgICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFyc2VkT3B0aW9uc1tuYW1lXSA9IHY7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmcuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBhcmcuc3BsaXQoJycpLmZvckVhY2goeCA9PiBwYXJzZWRPcHRpb25zW3hdID0gdHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnRvdmVycy5wdXNoKGFyZyk7XG4gICAgfVxuICB9XG5cbiAgcGFyc2VkT3B0aW9uc1snLS0nXSA9IGxlZnRvdmVycztcblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cblxuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgaW4gYSBjb25zaXN0ZW50IHdheSwgZnJvbSBhIGxpc3Qgb2Ygc3RhbmRhcmRpemVkIG9wdGlvbnMuXG4gKiBUaGUgcmVzdWx0IG9iamVjdCB3aWxsIGhhdmUgYSBrZXkgcGVyIG9wdGlvbiBuYW1lLCB3aXRoIHRoZSBgX2Aga2V5IHJlc2VydmVkIGZvciBwb3NpdGlvbmFsXG4gKiBhcmd1bWVudHMsIGFuZCBgLS1gIHdpbGwgY29udGFpbiBldmVyeXRoaW5nIHRoYXQgZGlkIG5vdCBtYXRjaC4gQW55IGtleSB0aGF0IGRvbid0IGhhdmUgYW5cbiAqIG9wdGlvbiB3aWxsIGJlIHB1c2hlZCBiYWNrIGluIGAtLWAgYW5kIHJlbW92ZWQgZnJvbSB0aGUgb2JqZWN0LiBJZiB5b3UgbmVlZCB0byB2YWxpZGF0ZSB0aGF0XG4gKiB0aGVyZSdzIG5vIGFkZGl0aW9uYWxQcm9wZXJ0aWVzLCB5b3UgbmVlZCB0byBjaGVjayB0aGUgYC0tYCBrZXkuXG4gKlxuICogQHBhcmFtIGFyZ3MgVGhlIGFyZ3VtZW50IGFycmF5IHRvIHBhcnNlLlxuICogQHBhcmFtIG9wdGlvbnMgTGlzdCBvZiBzdXBwb3J0ZWQgb3B0aW9ucy4ge0BzZWUgT3B0aW9ufS5cbiAqIEByZXR1cm5zIEFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgcHJvcGVydHkgcGVyIG9wdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQXJndW1lbnRzKGFyZ3M6IHN0cmluZ1tdLCBvcHRpb25zOiBPcHRpb25bXSB8IG51bGwpOiBBcmd1bWVudHMge1xuICBpZiAob3B0aW9ucyA9PT0gbnVsbCkge1xuICAgIG9wdGlvbnMgPSBbXTtcbiAgfVxuXG4gIGNvbnN0IGxlZnRvdmVyczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcG9zaXRpb25hbHM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHBhcnNlZE9wdGlvbnM6IEFyZ3VtZW50cyA9IHt9O1xuXG4gIGZvciAobGV0IGFyZyA9IGFyZ3Muc2hpZnQoKTsgYXJnICE9PSB1bmRlZmluZWQ7IGFyZyA9IGFyZ3Muc2hpZnQoKSkge1xuICAgIGlmICghYXJnKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYXJnID09ICctLScpIHtcbiAgICAgIC8vIElmIHdlIGZpbmQgYSAtLSwgd2UncmUgZG9uZS5cbiAgICAgIGxlZnRvdmVycy5wdXNoKC4uLmFyZ3MpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5zdGFydHNXaXRoKCctLScpKSB7XG4gICAgICBfYXNzaWduT3B0aW9uKGFyZywgYXJncywgb3B0aW9ucywgcGFyc2VkT3B0aW9ucywgcG9zaXRpb25hbHMsIGxlZnRvdmVycyk7XG4gICAgfSBlbHNlIGlmIChhcmcuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAvLyBBcmd1bWVudCBpcyBvZiBmb3JtIC1hYmNkZWYuICBTdGFydHMgYXQgMSBiZWNhdXNlIHdlIHNraXAgdGhlIGAtYC5cbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgYXJnLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGZsYWcgPSBhcmdbaV07XG4gICAgICAgIC8vIFRyZWF0IHRoZSBsYXN0IGZsYWcgYXMgYC0tYWAgKGFzIGlmIGZ1bGwgZmxhZyBidXQganVzdCBvbmUgbGV0dGVyKS4gV2UgZG8gdGhpcyBpblxuICAgICAgICAvLyB0aGUgbG9vcCBiZWNhdXNlIGl0IHNhdmVzIHVzIGEgY2hlY2sgdG8gc2VlIGlmIHRoZSBhcmcgaXMganVzdCBgLWAuXG4gICAgICAgIGlmIChpID09IGFyZy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgX2Fzc2lnbk9wdGlvbignLS0nICsgZmxhZywgYXJncywgb3B0aW9ucywgcGFyc2VkT3B0aW9ucywgcG9zaXRpb25hbHMsIGxlZnRvdmVycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgbWF5YmVPcHRpb24gPSBfZ2V0T3B0aW9uRnJvbU5hbWUoZmxhZywgb3B0aW9ucyk7XG4gICAgICAgICAgaWYgKG1heWJlT3B0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gX2NvZXJjZSh1bmRlZmluZWQsIG1heWJlT3B0aW9uLCBwYXJzZWRPcHRpb25zW21heWJlT3B0aW9uLm5hbWVdKTtcbiAgICAgICAgICAgIGlmICh2ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgcGFyc2VkT3B0aW9uc1ttYXliZU9wdGlvbi5uYW1lXSA9IHY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc2l0aW9uYWxzLnB1c2goYXJnKTtcbiAgICB9XG4gIH1cblxuICAvLyBEZWFsIHdpdGggcG9zaXRpb25hbHMuXG4gIGlmIChwb3NpdGlvbmFscy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IHBvcyA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3NpdGlvbmFscy5sZW5ndGg7KSB7XG4gICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgIGxldCBpbmNyZW1lbnRQb3MgPSBmYWxzZTtcbiAgICAgIGxldCBpbmNyZW1lbnRJID0gdHJ1ZTtcblxuICAgICAgLy8gV2UgZG8gdGhpcyB3aXRoIGEgZm91bmQgZmxhZyBiZWNhdXNlIG1vcmUgdGhhbiAxIG9wdGlvbiBjb3VsZCBoYXZlIHRoZSBzYW1lIHBvc2l0aW9uYWwuXG4gICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICAgIC8vIElmIGFueSBvcHRpb24gaGFzIHRoaXMgcG9zaXRpb25hbCBhbmQgbm8gdmFsdWUsIHdlIG5lZWQgdG8gcmVtb3ZlIGl0LlxuICAgICAgICBpZiAob3B0aW9uLnBvc2l0aW9uYWwgPT09IHBvcykge1xuICAgICAgICAgIGlmIChwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXJzZWRPcHRpb25zW29wdGlvbi5uYW1lXSA9IHBvc2l0aW9uYWxzW2ldO1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmNyZW1lbnRJID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGluY3JlbWVudFBvcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgIHBvc2l0aW9uYWxzLnNwbGljZShpLS0sIDEpO1xuICAgICAgfVxuICAgICAgaWYgKGluY3JlbWVudFBvcykge1xuICAgICAgICBwb3MrKztcbiAgICAgIH1cbiAgICAgIGlmIChpbmNyZW1lbnRJKSB7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAocG9zaXRpb25hbHMubGVuZ3RoID4gMCB8fCBsZWZ0b3ZlcnMubGVuZ3RoID4gMCkge1xuICAgIHBhcnNlZE9wdGlvbnNbJy0tJ10gPSBbLi4ucG9zaXRpb25hbHMsIC4uLmxlZnRvdmVyc107XG4gIH1cblxuICByZXR1cm4gcGFyc2VkT3B0aW9ucztcbn1cbiJdfQ==