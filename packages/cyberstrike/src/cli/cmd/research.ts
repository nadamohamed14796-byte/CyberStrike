import * as prompts from "@clack/prompts"
import { cmd } from "./cmd"
import { ReportKnowledge } from "../../learning/report-knowledge"
import { RESEARCH_SOURCES } from "../../research/sources"
import { syncResearch } from "../../research/ingest"

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
        describe: "fetch public research and learn from it",
        builder: (yargs) =>
          yargs.positional("source", { type: "string" }).option("limit", { type: "number", default: 10 }),
        async handler(args) {
          prompts.intro("CyberStrike Research Learning")
          const results = await syncResearch({ sourceID: args.source, limit: args.limit })
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
                result.failed,
            )
          }
          prompts.outro("Research sync complete")
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
              String(row.confidence) +
                "% " +
                (row.vulnerability_class ?? "unknown") +
                " — " +
                row.title +
                " — " +
                (row.source_url ?? "local"),
            )
        },
      })
      .demandCommand(),
  async handler() {},
})
