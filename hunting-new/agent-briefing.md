# Hunting Agent Briefing

Each subagent receives only task-relevant context.

## Required context

- mission and target identifiers
- scope decision and exclusions
- assigned ledger item
- relevant application function
- relevant technologies
- relevant JS assets/functions
- relevant endpoints/parameters
- relevant observed requests/responses
- account label and authorization context
- prior findings and false-positive fingerprints
- active hypotheses and previous attempts
- assigned skills and dependencies
- validation requirements
- expected structured output

## Forbidden assumptions

- JS-derived requests are not observed traffic.
- API documentation is not complete attack surface.
- a framework name is not a vulnerability.
- a WAF response is not application behavior.
- one successful finding does not complete the mission.

## Output

Return structured JSON with status, target, endpoint/function, category, hypothesis, evidence references, confidence, exploitability, impact, next action and verification requirement.
