# Scope for <target>
program: <program name>
platform: <hackerone / bugcrowd / private / lab>
in_scope:
  - *.example.com
out_of_scope:
  - status.example.com
rules:
  - no DoS or rate-limit testing
  - test only with accounts you created
priorities:
  - identity (auth, account takeover)
  - money (payments, balances)
  - trust boundaries (cross-tenant, SSRF)
