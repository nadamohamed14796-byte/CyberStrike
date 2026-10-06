Run reconnaissance only for an explicitly authorized target.

Order: scope -> preflight -> passive discovery -> authorized active discovery -> DNS/HTTP/technology discovery -> URL/endpoint discovery -> JavaScript discovery -> parameter discovery -> persistent TargetMemory.

Enforce ScopeGuard before every active target. Respect rate limits/timeouts and deduplicate tool runs. Persist provenance (tool, session, request/call id, timestamp, confidence). Do not turn public information or scanner output into a vulnerability without validation.
