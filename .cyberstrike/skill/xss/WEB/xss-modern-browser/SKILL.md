# Modern Browser XSS

Use for authorized testing of XSS attack surfaces introduced by modern browser APIs and security controls.

## Coverage
- ES modules and dynamic import paths.
- WebAssembly-assisted client-side execution paths.
- Service Worker registration/message flows.
- Import maps and module resolution.
- Trusted Types policy misuse.
- Sanitizer API / DOMPurify parser and configuration issues.
- SVG, Web Components, Shadow DOM, and modern DOM APIs.
- CSP design, nonce/hash handling, strict-dynamic, base URL manipulation, and policy mismatches.

## Method
1. Inventory browser-controlled sources and privileged client APIs.
2. Trace attacker-controlled data into parser, module, worker, sanitizer, or DOM operations.
3. Determine whether the security boundary is enforced before and after browser parsing.
4. Check policy configuration and application-specific Trusted Types/sanitizer hooks.
5. Test parser differentials and mutation behavior with inert markers first.
6. Confirm actual code execution and impact without stealing real credentials or data.

## CSP analysis
Check nonce/hash generation, reuse, cache behavior, allowed origins, strict-dynamic, base-uri, object-src, report-only versus enforced policy, and whether a trusted script can load attacker-controlled dependencies.

## Sanitizer analysis
Check version/configuration, namespace handling, hooks, custom elements, URL attributes, template handling, and whether sanitized output is reparsed in a different context.

## Validation gate
Do not report a bypass merely because a policy can be weakened or a payload survives sanitization. Demonstrate a complete source → transformation → sink → execution chain in scope.