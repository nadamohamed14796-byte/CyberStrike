# Scope for <target>
program: <program name>
platform: <hackerone / bugcrowd / private / lab>
# Entry forms:
#   example.com                  exact host only
#   *.example.com                any subdomain (not the apex)
#   example.com (subdomains: yes) apex plus subdomains
#   *.corp                       TLD-style internal names
#   10.0.0.0/24                  CIDR range
#   https://app.example.com/api/*  host plus path prefix
#   Acme Corp                    a company name: not testable until you add its domains
in_scope:
  - example.com
  - "*.example.com"
out_of_scope:
  - status.example.com
rules:
  - no DoS or rate-limit testing
  - test only with accounts you created
priorities:
  - identity (auth, account takeover)
  - money (payments, balances)
  - trust boundaries (cross-tenant, SSRF)
