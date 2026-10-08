      path,
    )
  )
    score += 60
  if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{4}\/\d{1,2}/.test(path)) score += 20
  if (/[?&](page|p|offset|start|pageindex)=\d+/i.test(parsed.search)) score += 30
  if (source.kind === "disclosure" && /\/reports?\b|\/hacktivity\//.test(path)) score += 20
  if (source.kind === "academy" && /lab|academy|web-security/.test(path)) score += 20
  if (source.kind === "reference" && /payload|cheat|technique|book|skill/.test(path)) score += 20
  score += sourceDocumentPriority(source, parsed.toString())