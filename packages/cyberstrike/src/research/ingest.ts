import { createHash } from "node:crypto"
import { ReportKnowledge } from "../learning/report-knowledge"
import { Learning } from "../learning/learning"
import { RESEARCH_SOURCES, type ResearchSource } from "./sources"

const MAX_DOCUMENT_BYTES = 1_500_000
const MAX_LINKS_PER_PAGE = 80
const MAX_CANDIDATE_SCORE = 100

function hostAllowed(url: URL, source: ResearchSource) {
  return source.hosts.some((host) => url.hostname === host || url.hostname.endsWith("." + host))
}

function cleanHtml(html: string) {
  return html
    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
    .replace(/<svg[\\s\\S]*?<\\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\\s+/g, " ")
    .trim()
}

function titleOf(html: string, fallback: string) {
  return html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim() || fallback
}

function linksOf(html: string, base: URL, source: ResearchSource) {
  const links: string[] = []
  for (const match of html.matchAll(/href\\s*=\\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], base)
      url.hash = ""
      if (url.protocol !== "https:" || !hostAllowed(url, source)) continue
      if (/\\.(png|jpe?g|gif|svg|webp|css|js|zip|pdf|woff2?)$/i.test(url.pathname)) continue
      const value = url.toString()
      if (!links.includes(value)) links.push(value)
      if (links.length >= MAX_LINKS_PER_PAGE) break
    } catch {}
  }
  return links
}

function classify(text: string) {
  const lower = text.toLowerCase()
  const classes: Array<[string, RegExp]> = [
    ["idor", /\\bidor\\b|insecure direct object|broken object level authorization/],
    ["xss", /cross[- ]site scripting|\\bxss\\b/],
    ["ssrf", /server[- ]side request forgery|\\bssrf\\b/],
    ["csrf", /cross[- ]site request forgery|\\bcsrf\\b/],
    ["sqli", /sql injection|\\bsqli\\b/],
    ["xxe", /xml external entity|\\bxxe\\b/],
    ["ssti", /server[- ]side template injection|\\bssti\\b/],
    ["race-condition", /race condition|time[- ]of[- ]check/],
    ["open-redirect", /open redirect/],
    ["auth-bypass", /authentication bypass|auth bypass/],
    ["access-control", /access control|authorization bypass/],
    ["business-logic", /business logic/],
    ["prototype-pollution", /prototype pollution/],
    ["deserialization", /insecure deserialization|deserialization/],
    ["request-smuggling", /request smuggling/],
    ["cache-poisoning", /cache poisoning/],
    ["file-upload", /file upload/],
    ["graphql", /graphql/],
    ["jwt", /\\bjwt\\b|json web token/],
  ]
  return classes.find(([, pattern]) => pattern.test(lower))?.[0]
}

function severityOf(text: string) {
  const match = text.match(/\\b(critical|high|medium|low|informational)\\b/i)
  return match?.[1]?.toLowerCase() ?? "unknown"
}

function lessonOf(text: string, vulnerabilityClass?: string) {
  const lines = text.split(/(?<=[.!?])\\s+/).filter((line) => line.length >= 40)
  const useful = lines.find((line) => /because|caused by|allows|leads to|impact|bypass|authorization|validation/i.test(line))
  return useful?.slice(0, 700) ?? (vulnerabilityClass ? "Research pattern for " + vulnerabilityClass + ": validate prerequisites and impact independently." : undefined)
}

export function candidateScore(url: string, source: ResearchSource) {
  const path = new URL(url).pathname.toLowerCase()
  let score = 0
  if (/\/reports?\b|\/hacktivity\/|\/writeups?\b|\/research\b|\/blog\/|\/articles?\b|\/labs?\b/.test(path)) score += 60
  if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{4}\/\d{1,2}/.test(path)) score += 20
  if (source.kind === "disclosure" && /reports?|hacktivity|disclosure/.test(path)) score += 20
  if (source.kind === "academy" && /lab|academy|web-security/.test(path)) score += 20
  if (source.kind === "reference" && /payload|cheatsheet|technique|book/.test(path)) score += 20
  return Math.min(MAX_CANDIDATE_SCORE, score)
}

async function fetchText(url: string, source: ResearchSource) {
  const parsed = new URL(url)
  if (!hostAllowed(parsed, source)) throw new Error("blocked research host: " + parsed.hostname)
  const response = await fetch(parsed, { headers: { "user-agent": "CyberStrike-Research/1.0" } })
  if (!response.ok) throw new Error("HTTP " + response.status)
  const length = Number(response.headers.get("content-length") ?? 0)
  if (length > MAX_DOCUMENT_BYTES) throw new Error("research document too large")
  const html = await response.text()
  if (new TextEncoder().encode(html).byteLength > MAX_DOCUMENT_BYTES) throw new Error("research document too large")
  return html
}

export type ResearchIngestResult = {
  source: string
  fetched: number
  learned: number
  skipped: number
  failed: number
}

export async function syncResearchSource(source: ResearchSource, limit = 10): Promise<ResearchIngestResult> {
  const result = { source: source.id, fetched: 0, learned: 0, skipped: 0, failed: 0 }
  const candidates = new Set(source.seedUrls)

  for (const seed of source.seedUrls) {
    try {
      const html = await fetchText(seed, source)
      result.fetched++
      for (const link of linksOf(html, new URL(seed), source)) candidates.add(link)
    } catch {
      result.failed++
    }
  }

  const orderedCandidates = Array.from(candidates).sort((a, b) => candidateScore(b, source) - candidateScore(a, source))
  let processed = 0
  for (const url of orderedCandidates) {
    if (processed >= limit) break
    processed++
    try {
      const html = await fetchText(url, source)
      result.fetched++
      const text = cleanHtml(html)
      const title = titleOf(html, url)
      if (text.length < 250) {
        result.skipped++
        continue
      }

      const vulnerabilityClass = classify(title + " " + text)
      if (!vulnerabilityClass && source.kind !== "reference" && source.kind !== "academy") {
        result.skipped++
        continue
      }

      const contentFingerprint = createHash("sha256").update(text).digest("hex").slice(0, 40)
      const lesson = lessonOf(text, vulnerabilityClass)
      const id = ReportKnowledge.ingestExternal({
        title,
        severity: severityOf(title + " " + text),
        vulnerabilityClass,
        sourceURL: url,
        lesson,
        sourceTrust: source.trust,
        tags: [source.id, source.kind].concat(vulnerabilityClass ? [vulnerabilityClass] : []),
        metadata: {
          research_source: source.id,
          research_source_name: source.name,
          source_trust: source.trust,
          content_fingerprint: contentFingerprint,
          candidate_score: candidateScore(url, source),
          excerpt: text.slice(0, 1200),
        },
      })

      if (!id) {
        result.skipped++
        continue
      }

      result.learned++
      await Learning.emit({
        hook: "after_finding",
        signal: vulnerabilityClass ? "research:" + vulnerabilityClass : "research:" + source.id,
        outcome: "observed",
        evidence: "Public research source: " + url,
        metadata: {
          report_knowledge_id: id,
          source_tool: "research-sync",
          research_source: source.id,
          source_url: url,
        },
      })
    } catch {
      result.failed++
    }
  }

  return result
}

export async function syncResearch(input: { sourceID?: string; limit?: number } = {}) {
  const sources = input.sourceID ? RESEARCH_SOURCES.filter((source) => source.id === input.sourceID) : RESEARCH_SOURCES
  if (sources.length === 0) throw new Error("unknown research source: " + input.sourceID)
  const results = []
  for (const source of sources) results.push(await syncResearchSource(source, Math.min(input.limit ?? 10, 25)))
  return results
}
