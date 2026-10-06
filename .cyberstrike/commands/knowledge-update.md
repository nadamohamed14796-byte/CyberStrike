Run the learning ingestion pipeline: fetch -> normalize -> deduplicate -> classify -> extract -> score -> store -> index -> retrieve -> feedback.

Keep RAW, PROCESSED, STRUCTURED and LEARNING DB layers separate from immutable reference skills. Never rewrite a reference skill as a side effect of learning. Record successful findings and false positives as feedback and use retrieval to influence future skill/tool selection.
