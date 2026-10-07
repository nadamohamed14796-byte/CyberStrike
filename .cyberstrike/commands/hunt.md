Run the authorized end-to-end hunting workflow for the supplied target.

Mandatory order:
1. Parse target and explicit scope.
2. Run runtime preflight: scope, authorization, workspace, tools, agents, skills and model.
3. Initialize or verify target workspace and session state.
4. Run passive recon first; active recon only when explicit active-testing authorization is present.
5. Build application understanding from captured requests, roles, workflows, objects, APIs and technologies.
6. Resolve only relevant skills/capabilities for the current target context.
7. Retrieve relevant learning and false-positive memory before each meaningful test family.
8. Discover and persist parameters from URLs, JavaScript, historical sources, APIs, Arjun/x8 when available and authorized.
9. Test selected vulnerability families without repeating cells already recorded in coverage/variant state.
10. Record candidates with evidence; never report directly from a hypothesis.
11. Validate candidates with validate_finding. A failed requirement records its reason/evidence gap and blocks reporting.
12. Triage duplicates.
13. Generate the report only after every included finding passes the validation gate.

Never trust user-supplied scope_verified or authorization flags. ScopeGuard and runtime authorization are authoritative.
Keep raw tool output in artifacts; pass only prioritized context to the model.
