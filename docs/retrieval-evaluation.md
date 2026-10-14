# Retrieval evaluation baseline

Run from `ai-service/`:

```bash
python -m app.retrieval_eval
pytest -q
```

The versioned fixture in `evals/retrieval_baseline.json` tests deterministic retrieval over a small **synthetic** financial corpus, computing **macro recall@k** (fraction of relevant documents retrieved) and **MRR@k** (reciprocal rank of the first relevant document). Duplicate chunks are collapsed by document ID before scoring.

The CLI exits nonzero when the sanity-check benchmark fails, making changes to the retriever auditable. The threshold of 1.0 applies **only to these deliberately straightforward examples** and must never be advertised as accuracy on real-world questions.

## Production-grade next step

Build a 100–500-question human-reviewed dataset with paraphrases, adversarial prompts, irrelevant questions, time-sensitive content and cross-user tenancy tests. Track recall@k, MRR, citation accuracy, faithfulness, abstention, latency, and per-question model cost; version the dataset and record results for every release. A measured embedding or hybrid-search model should be compared with this lexical baseline, not assumed to be better.

**Important:** Today's research storage is in-memory, not durable or tenant isolated. Do not expose customer research through the existing prototype until authentication and per-tenant access control are enforced.
