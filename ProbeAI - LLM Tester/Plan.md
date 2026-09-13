# ProbeAI - LLM Evaluation Platform

## Purpose
A comprehensive evaluation framework for Large Language Models. It allows QA teams and developers to define test suites of prompts, execute them against multiple LLM providers, and evaluate responses based on accuracy, safety, bias, structure, and custom metrics using an “LLM-as-judge” approach.

## Architectural Design

Frontend: A lightweight React dashboard with:

Test suite editor (YAML/JSON-based definition, or visual builder).

Runner interface to start tests, view live progress (WebSocket).

Results explorer with side-by-side diff, scoring breakdown, and history.

Backend (Python – FastAPI):

Test Manager Service: CRUD for test suites, test cases (prompt, expected criteria, metadata).

Runner Orchestrator: Accepts run requests, queues tasks, distributes to evaluators.

LLM Gateway / Provider Adapter: Unified interface to call OpenAI, Anthropic, Cohere, self-hosted models via standardized adapter pattern. Rate limiting and cost tracking built in.

Evaluation Engine: Modular evaluators (regex match, exact BLEU/ROUGE, embedding similarity, model-based judge (e.g., “rate politeness on a 1-5 scale” using GPT-4), classification models for toxicity (Perspective API), etc.). Evaluators run as async workers.

Results Store & Analytics: PostgreSQL for structured results, MongoDB for full response logs, charts.

Task Queue: Celery with Redis broker for long-running test runs (can scale workers horizontally).

Security: API keys for providers stored encrypted (AES-256), scoped access tokens.

Deployment: Docker Compose for local dev, Kubernetes for prod. Can also be packaged as a CLI tool (aitest) with an optional UI.

Key Features:

Test Case Format: YAML defining input prompt, model, temperature, evaluation criteria (e.g., “contains,” “semantic similarity > 0.9,” “no toxicity”).

Regression Testing: Compare two model versions or prompt templates over time.

Golden Dataset Management: Reference ground-truth answers for supervised metrics.

Cost & Latency Tracking per test.
