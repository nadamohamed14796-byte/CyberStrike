import { describe, expect, test } from "bun:test"
import { parseScopeAssetCSV, ScopeAssets } from "./scope-assets"

const csv = `"identifier","asset_type","instruction","eligible_for_bounty","eligible_for_submission","availability_requirement","confidentiality_requirement","integrity_requirement","max_severity","system_tags","created_at","updated_at"
"*.henkeleconomato.es","WILDCARD","","false","true","","","","critical","","2026-08-22 07:26:07 UTC","2026-08-22 07:26:07 UTC"
"dev-aip.henkel-adhesives.com.cn","URL","verify ownership, carefully","","true","high","high","high","critical","prod,web","2026-07-07 09:44:06 UTC","2026-07-07 09:44:06 UTC"
"*.nymhair.co.uk,.com,.uk","WILDCARD","","false","true","","","","critical","","2026-05-23 16:45:00 UTC","2026-05-23 16:45:00 UTC"
"*.wc-frisch.{de,ch}","WILDCARD","","false","true","","","","critical","","2026-05-23 16:45:00 UTC","2026-05-23 16:45:00 UTC"
"*.natturalabs.*","WILDCARD","","false","true","","","","critical","","2026-01-11 11:53:54 UTC","2026-01-11 11:53:54 UTC"
"com.example.mobile","ANDROID_APP","app package ID","","true","","","","high","mobile,android","2026-01-01 00:00:00 UTC","2026-01-02 00:00:00 UTC"
`

describe("scope asset inventory import and evaluation", () => {
  test("parses CSV columns, quoted values and preserves policy metadata", () => {
    const assets = parseScopeAssetCSV(csv)
    expect(assets).toHaveLength(6)
    expect(assets[0].asset_type).toBe("WILDCARD")
    expect(assets[0].eligible_for_bounty).toBe(false)
    expect(assets[0].eligible_for_submission).toBe(true)
    expect(assets[1].instruction).toContain("verify ownership")
    expect(assets[1].system_tags).toEqual(["prod", "web"])
    expect(assets[1].max_severity).toBe("critical")
  })

  test("matches exact URL-type assets without turning them into wildcard assets", () => {
    const assets = parseScopeAssetCSV(csv)
    expect(ScopeAssets.evaluate("https://dev-aip.henkel-adhesives.com.cn/", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://sub.dev-aip.henkel-adhesives.com.cn/", assets).matched).toBe(false)
  })

  test("supports wildcard root/subdomains and comma shorthand suffixes", () => {
    const assets = parseScopeAssetCSV(csv)
    expect(ScopeAssets.evaluate("https://henkeleconomato.es", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://x.henkeleconomato.es", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://nymhair.uk", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://shop.nymhair.co.uk", assets).matched).toBe(true)
  })

  test("supports brace expansion and wildcard TLDs", () => {
    const assets = parseScopeAssetCSV(csv)
    expect(ScopeAssets.evaluate("https://shop.wc-frisch.ch", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://wc-frisch.de", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://shop.natturalabs.es", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://shop.natturalabs.co.uk", assets).matched).toBe(true)
    expect(ScopeAssets.evaluate("https://natturalabs.attacker.test", assets).matched).toBe(false)
  })

  test("report eligibility and bounty eligibility remain independent", () => {
    const assets = parseScopeAssetCSV(csv)
    const result = ScopeAssets.evaluate("https://henkeleconomato.es", assets)
    expect(result.eligible_for_submission).toBe(true)
    expect(result.eligible_for_bounty).toBe(false)
    expect(result.active_testing_authorized).toBe(false)
  })

  test("matches non-web asset identifiers by exact identity only", () => {\n    const assets = parseScopeAssetCSV(csv)\n    expect(ScopeAssets.evaluate("com.example.mobile", assets).matched).toBe(true)\n    expect(ScopeAssets.evaluate("https://play.google.com/store/apps/details?id=com.example.mobile", assets).matched).toBe(false)\n  })\n\n  test("rejects malformed CSV with missing required columns", () => {
    expect(() => parseScopeAssetCSV('"identifier","asset_type"\n"example.com","URL"')).toThrow()
  })
})
