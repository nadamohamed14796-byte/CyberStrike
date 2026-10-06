import z from "zod"
import { Tool } from "./tool"

type Risk = "passive" | "active-read" | "active-test" | "high-impact"
type ToolSpec = { id: string; phase: string; risk: Risk; when: string[]; command: string }

const TOOLS: ToolSpec[] = [
  { id: "subfinder", phase: "asset-discovery", risk: "passive", when: ["new root", "subdomain", "asset"], command: "subfinder -d <target> -silent" },
  { id: "assetfinder", phase: "asset-discovery", risk: "passive", when: ["new root", "subdomain", "asset"], command: "assetfinder --subs-only <target>" },
  { id: "amass-passive", phase: "asset-discovery", risk: "passive", when: ["subdomain", "asset"], command: "amass enum -passive -d <target>" },
  { id: "crtsh", phase: "asset-discovery", risk: "passive", when: ["certificate", "subdomain", "SAN", "CN"], command: "curl -s 'https://crt.sh/?q=%25.<target>&output=json'" },
  { id: "tlsx", phase: "asset-discovery", risk: "passive", when: ["TLS", "SAN", "CN"], command: "tlsx -san -cn -silent -l <input>" },
  { id: "puredns", phase: "dns-validation", risk: "active-read", when: ["DNS", "subdomain validation"], command: "puredns resolve <input>" },
  { id: "dnsx", phase: "dns-validation", risk: "active-read", when: ["DNS", "A record", "CNAME"], command: "dnsx -silent -a -cname -resp" },
  { id: "httpx", phase: "http-validation", risk: "active-read", when: ["live HTTP", "HTTP", "technology"], command: "httpx -silent -json -status-code -title -tech-detect -ip -cdn" },
  { id: "naabu", phase: "port-discovery", risk: "active-read", when: ["open port", "service", "port"], command: "naabu -silent -host <target>" },
  { id: "nmap", phase: "service-validation", risk: "active-read", when: ["open port", "service fingerprint"], command: "nmap -sV <target>" },
  { id: "katana", phase: "url-discovery", risk: "active-read", when: ["live HTTP", "crawl", "endpoint"], command: "katana -silent -u <target>" },
  { id: "gau", phase: "historical-url", risk: "passive", when: ["historical URL", "archive"], command: "gau <target>" },
  { id: "waybackurls", phase: "historical-url", risk: "passive", when: ["historical URL", "archive"], command: "waybackurls <target>" },
  { id: "gospider", phase: "url-discovery", risk: "active-read", when: ["crawl", "endpoint"], command: "gospider -s <target> -c 5 -d 2" },
  { id: "hakrawler", phase: "url-discovery", risk: "active-read", when: ["crawl", "endpoint"], command: "hakrawler -url <target>" },
  { id: "waymore", phase: "historical-url", risk: "passive", when: ["historical URL", "archive"], command: "waymore -i <target>" },
  { id: "subjs", phase: "javascript-discovery", risk: "active-read", when: ["JavaScript", "JS bundle"], command: "subjs <input>" },
  { id: "trufflehog", phase: "secret-discovery", risk: "passive", when: ["repository", "secret", "credential"], command: "trufflehog filesystem <path>" },
  { id: "secretfinder", phase: "secret-discovery", risk: "passive", when: ["JavaScript", "secret", "credential"], command: "python3 SecretFinder.py -i <js> -o cli" },
  { id: "arjun", phase: "parameter-discovery", risk: "active-read", when: ["parameter", "hidden parameter"], command: "arjun -u <target>" },
  { id: "paramspider", phase: "parameter-discovery", risk: "passive", when: ["parameter", "historical parameter"], command: "paramspider -d <target>" },
  { id: "x8", phase: "parameter-discovery", risk: "active-read", when: ["parameter", "hidden parameter"], command: "x8 -u <target>" },
  { id: "ffuf", phase: "content-discovery", risk: "active-read", when: ["directory", "vhost", "parameter", "API route"], command: "ffuf -u <target>/FUZZ -w <wordlist>" },
  { id: "dirsearch", phase: "content-discovery", risk: "active-read", when: ["directory", "file"], command: "dirsearch -u <target>" },
  { id: "kiterunner", phase: "api-discovery", risk: "active-read", when: ["API", "API route"], command: "kr scan <target> -w <routes>" },
  { id: "graphw00f", phase: "graphql-discovery", risk: "active-read", when: ["GraphQL", "graphql"], command: "graphw00f -d <target>" },
  { id: "dalfox", phase: "xss-validation", risk: "active-test", when: ["reflected parameter", "XSS candidate"], command: "dalfox url <target>" },
  { id: "kxss", phase: "xss-validation", risk: "active-read", when: ["reflection", "XSS candidate"], command: "kxss" },
  { id: "nuclei", phase: "focused-scanning", risk: "active-test", when: ["known exposure", "CVE", "technology signal"], command: "nuclei -u <target> -severity low,medium,high,critical" },
  { id: "sqlmap", phase: "sqli-validation", risk: "high-impact", when: ["SQL-like behavior", "SQLi candidate"], command: "sqlmap -u <target> --batch" },
  { id: "interactsh-client", phase: "oob-validation", risk: "high-impact", when: ["server-side callback", "OOB", "SSRF candidate"], command: "interactsh-client" },
  { id: "ssrfmap", phase: "ssrf-validation", risk: "high-impact", when: ["SSRF candidate"], command: "ssrfmap -r <request>" },
  { id: "smuggler", phase: "protocol-validation", risk: "high-impact", when: ["request smuggling signal"], command: "smuggler.py -u <target>" },
  { id: "jwt-tool", phase: "auth-validation", risk: "active-test", when: ["JWT", "token"], command: "jwt_tool <token>" },
  { id: "corsy", phase: "cors-validation", risk: "active-read", when: ["CORS", "cross-origin"], command: "python3 corsy.py -u <target>" },
  { id: "cloud-enum", phase: "cloud-discovery", risk: "passive", when: ["cloud asset", "bucket", "storage"], command: "cloud_enum -k <keyword>" },
  { id: "s3scanner", phase: "cloud-discovery", risk: "active-read", when: ["S3", "bucket"], command: "s3scanner scan --buckets-file <input>" },
]

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/_/g, "-")
}

export const ReconToolchainTool = Tool.define("recon_toolchain", {
  description:
    "Choose the next reconnaissance/security tool from a signal. Returns a safe, ordered execution plan; it does not execute commands. Always perform scope_check before active testing. High-impact tools require explicit authorization.",
  parameters: z.object({
    signal: z.string().min(1).describe("Observed signal, such as 'live HTTP', 'GraphQL', 'JWT', or 'SQL-like behavior'"),
    target: z.string().min(1).describe("In-scope target or input artifact"),
    phase: z.string().optional().describe("Current phase, if known"),
    max_tools: z.number().int().min(1).max(8).default(3),
    authorized_active_testing: z.boolean().default(false).describe("Explicit authorization for active/high-impact testing"),
  }),
  async execute(params) {
    const signal = normalize(params.signal)
    const matches = TOOLS
      .filter((tool) => tool.when.some((x) => normalize(x).includes(signal) || signal.includes(normalize(x))))
      .filter((tool) => params.authorized_active_testing || (tool.risk !== "active-test" && tool.risk !== "high-impact"))
      .slice(0, params.max_tools)

    const ordered = matches.length ? matches : TOOLS.filter((tool) => tool.risk === "passive").slice(0, params.max_tools)
    const lines = [
      "target: " + params.target,
      "signal: " + params.signal,
      "phase: " + (params.phase ?? "auto"),
      "scope_required: true",
      "active_authorization: " + (params.authorized_active_testing ? "granted" : "not-granted"),
      "",
      "NEXT TOOLS",
      ...ordered.map((tool, i) => (i + 1) + ". " + tool.id + " | phase=" + tool.phase + " | risk=" + tool.risk + " | " + tool.command),
      "",
      "RULES",
      "- Run scope_check before touching a new target.",
      "- Prefer passive/read-only discovery before active testing.",
      "- Treat scanner output as a lead, never as a finding.",
      "- Preserve command/input/output provenance.",
      "- Do not auto-run high-impact tools without explicit authorization.",
    ]
    return { title: "Recon plan: " + params.signal, output: lines.join("\\n"), metadata: { tools: ordered.map((x) => x.id), target: params.target } }
  },
})
