// Maps an observed signal to the skills that should be loaded for it. The
// same mapping is listed in the Skill Trigger Map of cyberstrike.txt; a test
// keeps the two in step. A signal with no entry routes to nothing.

export const SIGNALS: Record<string, string[]> = {
  object_identifier_detected: ["attack-idor-automation"],
  url_fetch_parameter_detected: ["attack-ssrf"],
  jwt_detected: ["attack-jwt"],
  xml_body_detected: ["attack-xxe"],
  template_evaluation_detected: ["attack-ssti"],
  graphql_detected: ["attack-graphql"],
  websocket_upgrade_detected: ["attack-websocket"],
  cors_reflection_detected: ["attack-cors"],
  redirect_parameter_detected: ["attack-open-redirect"],
  host_dependent_links_detected: ["attack-host-header"],
  cache_headers_detected: ["attack-cache-poison"],
  parallel_single_use_action_detected: ["attack-race-condition"],
  request_boundary_mismatch_detected: ["attack-request-smuggling"],
  rate_limited_auth_detected: ["attack-rate-limit-bypass"],
  dangling_cname_detected: ["attack-subdomain-takeover"],
  js_object_merge_detected: ["attack-prototype-pollution"],
  unfamiliar_stack_detected: ["recon-methodology"],
}

export function route(signals: string[]) {
  return [...new Set(signals.flatMap((signal) => SIGNALS[signal] ?? []))]
}
