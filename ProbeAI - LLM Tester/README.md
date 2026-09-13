# ProbeAI 🧪

ProbeAI is a comprehensive evaluation and red-teaming suite for Large Language Models (LLMs). It allows developers and QA teams to benchmark, stress-test, and monitor model performance using a unified interface and automated scoring.

## ✨ Features

- **Multi-Provider Support**: Unified adapter for OpenAI, Anthropic, Hugging Face, and more.
- **Declarative Testing**: Define test suites in simple YAML format.
- **Advanced Evaluators**:
  - Exact String Match & Regex
  - Embedding Cosine Similarity
  - **LLM-as-Judge**: Nuanced evaluation using GPT-4/Claude to score responses on accuracy, safety, and tone.
- **Regression Testing**: Compare performance across model versions or prompt iterations.
- **Async Execution**: Scalable batch processing via Celery and Redis.
- **Live Dashboard**: Real-time progress tracking and side-by-side response comparison.

## 🏗️ Architecture

- **Backend**: FastAPI (Python)
- **Task Queue**: Celery + Redis
- **Database**: PostgreSQL (Metrics & Metadata)
- **Frontend**: Next.js / React (Dashboard)

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- LLM Provider API Keys (OpenAI, etc.)

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/gokulsenthilkumar3/ProbeAI.git
   cd ProbeAI
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. Access the dashboard:
   - Dashboard: `http://localhost:3000`
   - API Docs: `http://localhost:8000/docs`

## 📄 YAML Schema Example

```yaml
name: "Customer Support Test"
test_cases:
  - id: "support_01"
    prompt: "How do I reset my router?"
    expected: "Hold the reset button for 10 seconds."
    evaluators:
      - type: "embedding_similarity"
        threshold: 0.9
      - type: "model_as_judge"
        criteria: "Ensure the duration is mentioned."
```

## 🛠️ Development

- `adapters.py`: Normalizes different LLM provider interfaces.
- `evaluators.py`: Contains the logic for scoring responses.
- `models.py`: SQLAlchemy database models.
- `api.py`: Main entry point for the REST API.

## 📜 License
MIT License
