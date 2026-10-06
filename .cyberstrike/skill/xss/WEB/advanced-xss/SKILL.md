# Advanced XSS Context & Execution

Use for authorized web application testing when an input may reach an executable browser context.

## Scope
- Reflected, stored, and DOM XSS.
- HTML, attribute, JavaScript, URL, CSS, SVG, template, and mixed-context analysis.
- Mutation XSS (mXSS), parser differentials, DOM clobbering, and client-side template injection.
- Dangerous sources/sinks and framework-specific rendering paths.

## Workflow
1. Identify the source: URL, fragment, query/body parameter, cookie, storage, postMessage, API response, SSE, WebSocket, GraphQL result, or user content.
2. Trace the data to its final rendering context and sink.
3. Establish a harmless reflection marker before testing execution.
4. Select a context-appropriate proof-of-concept; prefer non-destructive browser-side markers.
5. Compare raw response, parsed DOM, serialized DOM, and runtime behavior to detect parser mutation.
6. Test alternate encodings only when the application performs decoding/normalization.
7. For frameworks, inspect template compilation and explicit dangerous rendering APIs.
8. Validate exploitability, victim prerequisites, persistence, and security impact before reporting.

## Context matrix
- HTML: element parsing, tag/attribute boundaries, parser mutation.
- Attribute: quoted/unquoted boundaries, event attributes, URL-valued attributes.
- JavaScript: string termination, template literals, JSON-to-JS transitions.
- URL: scheme validation, redirects, URL decoding, DOM navigation.
- CSS: style/selector injection and browser-dependent execution paths.
- SVG/MathML: namespace transitions and parser differentials.
- DOM: sources → transformations → sinks such as HTML insertion or dynamic code evaluation.

## Advanced checks
- mXSS and HTML parser differentials.
- DOM clobbering of globals, element lookups, and security-sensitive assumptions.
- Prototype-pollution-to-DOM chains.
- Custom elements and Shadow DOM boundaries.
- Content sniffing and MIME confusion.
- Web Components and client-side template injection.

## Validation gate
Reflection is not XSS. A WAF block is not XSS. A suspicious sink is not XSS. Require reproducible execution in the authorized target and document source, sink, context, browser, prerequisites, and impact.

## Evidence
Save the exact request, response, DOM state, relevant JavaScript/data-flow evidence, and a minimal reproduction.