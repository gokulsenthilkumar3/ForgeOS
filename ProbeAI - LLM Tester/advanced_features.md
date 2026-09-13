# Advanced Features & Scaling

## 1. Regression Testing Workflow
To compare two model versions:
- Create a `Run` for `Model A`.
- Create a `Run` for `Model B` using the same `TestSuite`.
- Use the `/compare` endpoint to calculate delta scores per test case.
- Visualize side-by-side responses in the dashboard with diff highlighting.

## 2. Advanced Evaluation Metrics
- **A/B Testing**: Randomly serve two different prompt templates to users and use model-as-judge to see which one gets higher "helpfulness" scores.
- **Prompt Injection Detection**: Include a set of "jailbreak" prompts in every suite. Evaluators check if the model ignores system instructions.
- **Adversarial Testing**: Use an "Attacker LLM" to generate variations of prompts to find edge cases where the target model fails.
- **Semantic Drift**: Compare new results against a "Golden Dataset" using embedding cosine similarity to ensure updates didn't degrade quality.

## 3. Kubernetes Deployment (Helm)
The Helm chart would include:
- `Deployment` for the FastAPI API.
- `Deployment` (with HPA) for Celery Workers to scale based on queue depth.
- `StatefulSet` for PostgreSQL and Redis (or use managed services like RDS/ElastiCache).
- `Ingress` for routing.
- `Secrets` for API Keys.

## 4. Cost Optimization
- **Caching**: Implement a global Redis cache for prompt-response pairs to avoid duplicate calls across test runs.
- **Batching**: Use provider-specific batch APIs (like OpenAI's Batch API) for 50% cost reduction on non-latency-sensitive runs.
