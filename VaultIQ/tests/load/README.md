# VaultIQ Load Tests

Load tests are written using [K6](https://k6.io/). Run them against a live or local backend instance.

## Prerequisites

```bash
# Install K6 (macOS)
brew install k6

# Install K6 (Linux)
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Running Tests

```bash
# Smoke test (local)
k6 run tests/load/assets-load-test.js

# Load test against staging
k6 run -e BASE_URL=https://vaultiq-backend-5a87.onrender.com \
        -e AUTH_TOKEN=<your_jwt> \
        tests/load/assets-load-test.js

# Output results to JSON
k6 run --out json=results.json tests/load/assets-load-test.js
```

## Thresholds

| Metric | Threshold |
|---|---|
| `http_req_duration` p95 | < 500ms |
| `error_rate` | < 1% |
| `asset_list_duration` p95 | < 400ms |
