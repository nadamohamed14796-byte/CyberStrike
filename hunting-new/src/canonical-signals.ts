export const SIGNAL_ALIASES: Record<string,string> = {
  "object_identifier": "object_identifier_detected",
  "object-identifier": "object_identifier_detected",
  "object-identifier-detected": "object_identifier_detected",
  "object_identifier_detected": "object_identifier_detected",
  "authenticated-endpoint": "authenticated_endpoint",
  "javascript-asset": "javascript_asset",
  "javascript-function-request-correlation": "javascript_function_request_correlation",
  "graphql": "graphql_detected",
  "websocket": "websocket_detected",
  "jwt": "jwt_detected",
  "file-upload": "file_upload_detected",
  "redirect-parameter": "redirect_parameter_detected",
  "source-map": "source_map_detected",
  "tenant-identifier": "tenant_identifier_detected",
  "api-method-mismatch": "api_method_mismatch",
  "endpoint-discovery": "endpoint_discovery",
  "access-control-blocked": "access_control_blocked",
  "waf-signal-detected": "waf_signal_detected",
  "parameter-discovered": "parameter_discovered",
  "parameter-discovery": "parameter_discovered",
  "multiple-account": "multiple_accounts",
  "multiple-accounts": "multiple_accounts",
}

export function canonicalSignal(signal: string): string {
  const normalized = signal.trim().toLowerCase().replace(/[\s-]+/g, "_")
  return SIGNAL_ALIASES[normalized] ?? normalized
}

export function canonicalSignals(signals: string[]): string[] {
  return [...new Set(signals.map(canonicalSignal))]
}
