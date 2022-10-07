"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const architect_1 = require("@angular-devkit/architect");
// Export the job using a createJob. We use our own spec file here to do the job.
exports.default = architect_1.jobs.createJobHandler((input) => {
    return input.reduce((a, c) => a + c, 0);
}, {
    input: { items: { type: 'number' } },
    output: { type: 'number' },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGVzdHMvYW5ndWxhcl9kZXZraXQvYXJjaGl0ZWN0L25vZGUvam9icy9hZGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCx5REFBaUQ7QUFFakQsaUZBQWlGO0FBQ2pGLGtCQUFlLGdCQUFJLENBQUMsZ0JBQWdCLENBQ2xDLENBQUMsS0FBSyxFQUFFLEVBQUU7SUFDUixPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFDLENBQUMsRUFDRDtJQUNFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRTtJQUNwQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO0NBQzNCLENBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2JzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5cbi8vIEV4cG9ydCB0aGUgam9iIHVzaW5nIGEgY3JlYXRlSm9iLiBXZSB1c2Ugb3VyIG93biBzcGVjIGZpbGUgaGVyZSB0byBkbyB0aGUgam9iLlxuZXhwb3J0IGRlZmF1bHQgam9icy5jcmVhdGVKb2JIYW5kbGVyPG51bWJlcltdLCBudWxsLCBudW1iZXI+KFxuICAoaW5wdXQpID0+IHtcbiAgICByZXR1cm4gaW5wdXQucmVkdWNlKChhLCBjKSA9PiBhICsgYywgMCk7XG4gIH0sXG4gIHtcbiAgICBpbnB1dDogeyBpdGVtczogeyB0eXBlOiAnbnVtYmVyJyB9IH0sXG4gICAgb3V0cHV0OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gIH0sXG4pO1xuIl19