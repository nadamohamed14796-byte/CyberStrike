import { createHash } from "node:crypto"
import { ReportKnowledge } from "../learning/report-knowledge"
import { Learning } from "../learning/learning"
import { RESEARCH_SOURCES, type ResearchSource } from "./sources"

const MAX_DOCUMENT_BYTES = 1_500_000
const MAX_LINKS_PER_PAGE = 120
const MAX_CANDIDATE_SCORE = 100
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500
const DEFAULT_PAGES = 250
const MAX_PAGES = 1000
const DEFAULT_DEPTH = 2
const MAX_DEPTH = 4
const REQUEST_TIMEOUT_MS = 20_000
const MAX_RETRIES = 2

function hostAllowed(url: URL, source: ResearchSource) {
  return source.hosts.some((host) => url.hostname === host || url.hostname.endsWith("." + host))
}

function normalizeUrl(value: string, base?: URL) {
  try {
    const url = new URL(value, base)
    url.hash = ""
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"]) {
      url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return undefined
  }
}

function cleanHtml(html: string) {
  const main =
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    html
  return main
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
}

function titleOf(html: string, fallback: string) {
  return (
    html
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || fallback
  )
}

function linksOf(html: string, base: URL, source: ResearchSource) {
  const links = new Set<string>()
  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const value = normalizeUrl(match[1], base)
    if (!value) continue
    try {
      const url = new URL(value)
      if (url.protocol !== "https:" || !hostAllowed(url, source)) continue
      if (/\.(png|jpe?g|gif|svg|webp|css|js|zip|pdf|woff2?|mp4|mp3)$/i.test(url.pathname)) continue
      links.add(value)
      if (links.size >= MAX_LINKS_PER_PAGE) break
    } catch {}
  }
  return [...links]
}

function isResearchCandidate(url: string, source: ResearchSource) {
  const path = new URL(url).pathname.toLowerCase()
  if (
    /\/reports?\b|\/hacktivity\b|\/writeups?\b|\/research\b|\/blog\b|\/articles?\b|\/labs?\b|\/disclos|\/advisories?\b|\/learn\b|\/academy\b|\/techniques?\b|\/payloads?\b|\/cheats?heets?\b|\/blob\/|\/tree\//.test(
      path,
    )
  )
    return true
  return /[?&](page|p|offset|start)=\d+/i.test(new URL(url).search)
}

function classify(text: string) {
  const lower = text.toLowerCase()
  const classes: Array<[string, RegExp]> = [
    ["idor", /\bidor\b|insecure direct object|broken object level authorization/],
    ["xss", /cross[- ]site scripting|\bxss\b/],
    ["ssrf", /server[- ]side request forgery|\bssrf\b/],
    ["csrf", /cross[- ]site request forgery|\bcsrf\b/],
    ["sqli", /sql injection|\bsqli\b/],
    ["xxe", /xml external entity|\bxxe\b/],
    ["ssti", /server[- ]side template injection|\bssti\b/],
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
    ["jwt", /\bjwt\b|json web token/],
    ["command-injection", /command injection|os command injection/],
    ["path-traversal", /path traversal|directory traversal/],
    ["subdomain-takeover", /subdomain takeover/],
    ["oauth", /oauth|open authorization/],
    ["web-cache", /web cache|cache deception/],
  ]
  return classes.find(([, pattern]) => pattern.test(lower))?.[0]
}

function severityOf(text: string) {
  const match = text.match(/\b(critical|high|medium|low|informational)\b/i)
  return match?.[1]?.toLowerCase() ?? "unknown"
}

function lessonOf(text: string, vulnerabilityClass?: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 45)
  const useful = sentences.filter((line) =>
    /because|caused by|allows|leads to|impact|bypass|authorization|validation|exploit|root cause|misconfigur/i.test(line),
  )
  const selected = useful.slice(0, 3)
  if (selected.length) return selected.join(" ").slice(0, 1600)
  return vulnerabilityClass
    ? "Research pattern for " + vulnerabilityClass + ": validate prerequisites, exploitability, and impact independently."
    : undefined
}

export function candidateScore(url: string, source: ResearchSource) {
  const parsed = new URL(url)
  const path = parsed.pathname.toLowerCase()
  let score = 0
  if (
    /\/reports?\b|\/hacktivity\b|\/writeups?\b|\/research\b|\/blog\b|\/articles?\b|\/labs?\b|\/disclos|\/advisories?\b|\/learn\b|\/academy\b|\/techniques?\b|\/payloads?\b|\/cheats?heets?\b|\/blob\/|\/tree\//.test(
      path,
    )
  )
    score += 60
  if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{4}\/\d{1,2}/.test(path)) score += 20
  if (/[?&](page|p|offset|start)=\d+/i.test(parsed.search)) score += 30
  if (source.kind === "disclosure" && /reports?|hacktivity|disclosure/.test(path)) score += 20
  if (source.kind === "academy" && /lab|academy|web-security/.test(path)) score += 20
  if (source.kind === "reference" && /payload|cheat|technique|book|skill/.test(path)) score += 20
  return Math.min(MAX_CANDIDATE_SCORE, score)
}

async function fetchText(url: string, source: ResearchSource) {
  const parsed = new URL(url)
  if (!hostAllowed(parsed, source)) throw new Error("blocked research host: " + parsed.hostname)

  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(parsed, {
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": "CyberStrike-Research/2.0 (+public-security-research)",
        },
      })
      if (response.status === 429 || response.status >= 500) {
        throw new Error("HTTP " + response.status)
      }
      if (!response.ok) throw new Error("HTTP " + response.status)
      const contentType = response.headers.get("content-type") ?? ""
      if (!/text\/html|application\/xhtml\+xml|text\/plain|application\/xml/i.test(contentType)) {
        throw new Error("unsupported content type: " + contentType)
      }
      const length = Number(response.headers.get("content-length") ?? 0)
      if (length > MAX_DOCUMENT_BYTES) throw new Error("research document too large")
      const html = await response.text()
      if (new TextEncoder().encode(html).byteLength > MAX_DOCUMENT_BYTES) throw new Error("research document too large")
      return html
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) await Bun.sleep(500 * 2 ** attempt)
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function discoverSitemap(source: ResearchSource) {
  const origin = "https://" + source.hosts[0]
  try {
    const html = await fetchText(origin + "/sitemap.xml", source)
    return [...html.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
      .map((match) => normalizeUrl(match[1]))
      .filter((value): value is string => !!value)
      .slice(0, MAX_LINKS_PER_PAGE)
  } catch {
    return []
  }
}

export type ResearchIngestResult = {
  source: string
  fetched: number
  learned: number
  skipped: number
  failed: number
  pages_crawled: number
  candidates_discovered: number
  error_samples: string[]
}

export type ResearchSyncOptions = {
  limit?: number
  pages?: number
  depth?: number
}

export async function syncResearchSource(
  source: ResearchSource,
  options: ResearchSyncOptions = {},
): Promise<ResearchIngestResult> {
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT))
  const maxPages = Math.max(1, Math.min(options.pages ?? DEFAULT_PAGES, MAX_PAGES))
  const maxDepth = Math.max(0, Math.min(options.depth ?? DEFAULT_DEPTH, MAX_DEPTH))
  const result: ResearchIngestResult = {
    source: source.id,
    fetched: 0,
    learned: 0,
    skipped: 0,
    failed: 0,
    pages_crawled: 0,
    candidates_discovered: 0,
    error_samples: [],
  }

  const queue: Array<{ url: string; depth: number; score: number }> = []
  const queued = new Set<string>()
  const visited = new Set<string>()
  const add = (url: string, depth: number) => {
    const normalized = normalizeUrl(url)
    if (!normalized || queued.has(normalized) || visited.has(normalized)) return
    try {
      const parsed = new URL(normalized)
      if (parsed.protocol !== "https:" || !hostAllowed(parsed, source)) return
      if (depth > 0 && !isResearchCandidate(normalized, source)) return
    } catch {
      return
    }
    queued.add(normalized)
    queue.push({ url: normalized, depth, score: candidateScore(normalized, source) })
  }

  for (const seed of source.seedUrls) add(seed, 0)
  for (const sitemapURL of await discoverSitemap(source)) add(sitemapURL, 1)

  while (queue.length && result.pages_crawled < maxPages && result.learned < limit) {
    queue.sort((a, b) => b.score - a.score || a.depth - b.depth)
    const current = queue.shift()!
    if (visited.has(current.url)) continue
    visited.add(current.url)
    result.pages_crawled++

    try {
      const html = await fetchText(current.url, source)
      result.fetched++

      for (const link of linksOf(html, new URL(current.url), source)) {
        result.candidates_discovered++
        add(link, current.depth + 1)
      }

      const text = cleanHtml(html)
      const title = titleOf(html, current.url)
      if (text.length < 250) {
        result.skipped++
        continue
      }

      const vulnerabilityClass = classify(title + " " + text)
      if (!vulnerabilityClass && source.kind !== "reference" && source.kind !== "academy" && current.depth > 0) {
        result.skipped++
        continue
      }

      const contentFingerprint = createHash("sha256").update(text).digest("hex").slice(0, 40)
      const lesson = lessonOf(text, vulnerabilityClass)
      const id = ReportKnowledge.ingestExternal({
        title,
        severity: severityOf(title + " " + text),
        vulnerabilityClass,
        sourceURL: current.url,
        lesson,
        sourceTrust: source.trust,
        tags: [source.id, source.kind].concat(vulnerabilityClass ? [vulnerabilityClass] : []),
        metadata: {
          research_source: source.id,
          research_source_name: source.name,
          source_trust: source.trust,
          content_fingerprint: contentFingerprint,
          candidate_score: current.score,
          crawl_depth: current.depth,
          excerpt: text.slice(0, 1600),
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
        evidence: "Public research source: " + current.url,
        metadata: {
          report_knowledge_id: id,
          source_tool: "research-sync",
          research_source: source.id,
          source_url: current.url,
        },
      })
    } catch (error) {
      result.failed++
      if (result.error_samples.length < 5) {
        result.error_samples.push(current.url + " — " + (error instanceof Error ? error.message : String(error)))
      }
    }
  }

  return result
}

export async function syncResearch(
  input: { sourceID?: string } & ResearchSyncOptions = {},
) {
  const sources = input.sourceID ? RESEARCH_SOURCES.filter((source) => source.id === input.sourceID) : RESEARCH_SOURCES
  if (sources.length === 0) throw new Error("unknown research source: " + input.sourceID)

  const results = []
  for (const source of sources) {
    results.push(
      await syncResearchSource(source, {
        limit: input.limit,
        pages: input.pages,
        depth: input.depth,
      }),
    )
  }
  return results
}
