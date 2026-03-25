# Project Cars Backend

Backend Architecture Visualization & Intelligence Platform built with Node.js, Express, and MongoDB.

## Features

- Analyze a GitHub repository URL or uploaded zip file
- Extract architecture signals for APIs, services, middleware, dependencies, and database usage
- Generate heuristic reports for security, performance, scalability, and reliability
- Map system health into a car-style component view
- Simulate load impact with bottleneck and warning output

## Project Structure

```text
src/
  config/
  controllers/
  middlewares/
  models/
  routes/
  services/
  utils/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Start MongoDB and update `MONGODB_URI` in `.env` if needed.

4. Run the server:

```bash
npm start
```

The API will start on `http://localhost:5001` by default.

## Automated Tests

Run the Supertest integration suite with:

```bash
npm test
```

The tests use an in-memory MongoDB instance and cover the core API flows plus validation failures.

## Legacy Migration

Normalize legacy `Project`, `Architecture`, and `AnalysisReport` documents with:

```bash
node scripts/migrate.js
```

Preview the migration without writing any data:

```bash
node scripts/migrate.js --dry-run
```

The migration script:

- detects legacy unstructured documents
- normalizes them into the current typed schema
- reconciles duplicate architecture/report documents down to one canonical document per project
- updates project references safely
- stores backups before any destructive write in non-dry-run mode

## Production Hardening

- Structured JSON logging with Winston
- Request logging with response time, IP, and request ID
- Helmet security headers
- Environment-driven CORS allowlist via `CLIENT_ORIGIN`
- Global API rate limiting via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`
- Compression enabled for API responses

## Endpoints

- `POST /analyze-repo`
- `GET /architecture/:id`
- `GET /analysis/:id`
- `GET /car-view/:id`
- `POST /simulate`
- `GET /health`

## Request Examples

Analyze a GitHub repository:

```bash
curl -X POST http://localhost:5001/analyze-repo \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/expressjs/express"}'
```

Analyze a zip upload:

```bash
curl -X POST http://localhost:5001/analyze-repo \
  -F "zipFile=@/absolute/path/to/project.zip"
```

Simulate load:

```bash
curl -X POST http://localhost:5001/simulate \
  -H "Content-Type: application/json" \
  -d '{"users":500}'
```

## API Test Collection

Use [api-tests.http](/Users/macbookpro/Work/project%20cars/api-tests.http) for ready-made requests covering:

- `GET /health`
- `POST /simulate`
- `POST /analyze-repo` with GitHub URL
- `POST /analyze-repo` with zip upload
- `GET /architecture/:id`
- `GET /analysis/:id`
- `GET /car-view/:id`

Update `@baseUrl`, `@projectId`, and the zip file path as needed before running the requests from your IDE REST client.
