import * as prompts from "@clack/prompts"
import { cmd } from "./cmd"
import { ReportKnowledge } from "../../learning/report-knowledge"
import { RESEARCH_SOURCES } from "../../research/sources"
import { syncResearch } from "../../research/ingest"

function knowledgeScoreLabel(row: {
  confidence: number
  source_kind: string
  status: string
  metadata?: Record<string, unknown> | null
}) {
  if (row.source_kind === "external_report" && row.status === "observed") {
    const trust = row.metadata?.source_trust
    const value = typeof trust === "number" && Number.isFinite(trust)
      ? String(Math.max(0, Math.min(100, Math.round(trust)))) + "%"
      : "unknown"
    return "source-trust=" + value + " (unverified)"
  }
  return "confidence=" + row.confidence + "%"
}

export const ResearchCommand = cmd({
  command: "research",
  describe: "sync public security research into report knowledge",
  builder: (yargs) =>
    yargs
      .command({
        command: "sources",
        describe: "list configured public research sources",
        async handler() {
          for (const source of RESEARCH_SOURCES) console.log(source.id + " — " + source.name)
        },
      })
      .command({
        command: "sync [source]",
        describe: "crawl configured research sources and learn from public security material",
        builder: (yargs) =>
          yargs
            .positional("source", { type: "string" })
            .option("limit", {
              type: "number",
              default: 50,
              describe: "maximum new knowledge records per source",
            })
            .option("pages", {
              type: "number",
              default: 250,
              describe: "maximum pages crawled per source",
            })
            .option("depth", {
              type: "number",
              default: 2,
              describe: "maximum crawl depth from each seed URL",
            })
            .option("deep", {
              type: "boolean",
              default: false,
              describe: "deep preset: 200 new records, 750 pages, depth 3",
            })
            .option("all", {
              type: "boolean",
              default: false,
              describe: "exhaust the discovered public queue up to the page/depth budgets",
            }),
        async handler(args) {
          prompts.intro("CyberStrike Research Learning")
          const deep = Boolean(args.deep)
          const exhaustive = Boolean(args.all)
          const results = await syncResearch({
            sourceID: args.source,
            limit: deep ? 200 : args.limit,
            pages: exhaustive ? 1000 : deep ? 750 : args.pages,
            depth: exhaustive ? 4 : deep ? 3 : args.depth,
            all: exhaustive,
          })
          for (const result of results) {
            prompts.log.info(
              result.source +
                ": fetched=" +
                result.fetched +
                " learned=" +
                result.learned +
                " skipped=" +
                result.skipped +
                " failed=" +
                result.failed +
                " pages=" +
                result.pages_crawled +
                " candidates=" +
                result.candidates_discovered,
            )
            for (const error of result.error_samples) prompts.log.warn(error)
          }
          prompts.outro(exhaustive ? "Exhaustive research sync complete" : "Research sync complete")
        },
      })
      .command({
        command: "search <query>",
        describe: "search learned research knowledge",
        builder: (yargs) =>
          yargs
            .positional("query", { type: "string", demandOption: true })
            .option("limit", { type: "number", default: 20 }),
        async handler(args) {
          const rows = ReportKnowledge.search({ query: args.query, limit: args.limit })
          for (const row of rows)
            console.log(
              knowledgeScoreLabel(row) +
                " " +
                (row.vulnerability_class ?? "unknown") +
                " — " +
                row.title +
                " — " +
                (row.source_url ?? "local"),
            )
        },
      })
      .command({
        command: "recommend <query>",
        describe: "show relevant research references; public imports are unverified until independently validated",
        builder: (yargs) =>
          yargs
            .positional("query", { type: "string", demandOption: true })
            .option("class", { type: "string" })
            .option("cwe", { type: "string" })
            .option("limit", { type: "number", default: 6 }),
        async handler(args) {
          const rows = ReportKnowledge.recommendations({
            signal: args.query,
            vulnerabilityClass: args.class,
            cweID: args.cwe,
            limit: args.limit,
          })
          for (const row of rows) {
            console.log(
              knowledgeScoreLabel(row) +
                " " +
                (row.vulnerability_class ?? "unknown") +
                " — " +
                row.title +
                " — " +
                (row.lesson ?? "no lesson") +
                " — " +
                (row.source_url ?? "local"),
            )
          }
        },
      })
      .command({
        command: "stats",
        describe: "show research knowledge database statistics",
        async handler() {
          const stats = ReportKnowledge.stats()
          console.log("knowledge_total=" + stats.total)
          console.log("external_research=" + stats.external)
          console.log("useful_or_confirmed=" + stats.useful)
          console.log("rejected_disproven_or_duplicate=" + stats.rejected)
        },
      })
      .demandCommand(),
  async handler() {},
})
