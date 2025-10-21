# 🧠 Intelligent API Performance Monitoring System

A real-time API monitoring platform that tracks uptime, latency, and errors for registered APIs.  
Includes a probe agent, metrics ingestion backend, rule-based alerting engine, and DevOps-ready deployment with Docker and CI/CD.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup and Running Locally](#setup-and-running-locally)
- [Docker Deployment](#docker-deployment)
- [API Endpoints](#api-endpoints)
- [Testing and CI](#testing-and-ci)
- [Future Improvements](#future-improvements)
- [Author](#author)
- [License](#license)

---

## 🧩 Overview

Modern applications depend heavily on APIs — for authentication, payments, and integrations.  
If these APIs slow down or fail, the entire system can suffer.  

This project provides a **complete monitoring platform** that:
- Continuously probes APIs and measures their health,
- Stores metrics in MongoDB,
- Detects failures or slow responses,
- Triggers alerts when performance degrades.

Think of it as a simplified educational version of **Datadog**, **Pingdom**, or **New Relic**, built with Node.js, Docker, and CI/CD.

---

## ⚙️ Features

✅ **API Registration:** Add APIs to monitor and store configurations.  
✅ **Probe Agent:** Periodically tests APIs and reports latency and status codes.  
✅ **Metrics Service:** Ingests and stores metrics efficiently.  
✅ **Rule Engine (WIP):** Detects anomalies and thresholds.  
✅ **Alert Manager:** Emits alerts when APIs are down or too slow.  
✅ **Dashboard (Planned):** Visualize metrics and alerts via frontend.  
✅ **DevOps-Ready:** Docker + GitHub Actions for deployment and testing.

---

## 🏗️ System Architecture

```mermaid
flowchart LR
  subgraph Probe
    A[Probe Agent] -->|Sends Metrics| B(Backend /v1/metrics)
  end

  subgraph Backend
    B --> C[(MongoDB)]
    B --> D[Rule Engine]
    D --> E[Alert Manager]
    E --> F[(Alerts DB)]
  end

  subgraph Frontend
    G[React Dashboard] -->|Reads Metrics| B
  end
🧰 Tech Stack
Backend

Node.js + Express

TypeScript

MongoDB + Mongoose

Joi (validation)

Pino (logging)

Probe

Node.js + Axios

Frontend

React + TailwindCSS or Material-UI (planned)

Axios for API communication

DevOps

Docker & Docker Compose

GitHub Actions (CI)

Jest + Supertest (testing)

Prometheus + Grafana (future integration)

📁 Project Structure
lua
Copy code
api-monitoring/
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   ├── package.json
│   ├── Dockerfile
│   └── jest.config.ts
│
├── probe/
│   └── probe.js
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
🧱 Prerequisites
Node.js ≥ 18

Docker & Docker Compose

Git

(Optional) MongoDB locally if not using Docker

▶️ Setup and Running Locally
1. Clone Repository
bash
Copy code
git clone https://github.com/<your-username>/Api-Monitoring.git
cd Api-Monitoring
2. Backend Setup
bash
Copy code
cd backend
npm install
npm run dev
Backend will be available at http://localhost:3000

3. Frontend Setup (optional)
bash
Copy code
cd ../frontend
npm install
npm start
Frontend will be available at http://localhost:3001

4. Probe Agent
bash
Copy code
cd ../probe
node probe.js
This will start sending metrics to the backend every few seconds.

🐳 Docker Deployment
Build & Run (recommended for production)
From the project root:

bash
Copy code
docker-compose up --build
This will:

Start MongoDB (mongo container)

Start backend (apimon-backend container)

Map backend port to localhost:3000

Stop Containers
bash
Copy code
docker-compose down
🌐 API Endpoints
Method	Endpoint	Description
POST	/v1/apis	Register a new API
GET	/v1/apis	List all APIs
POST	/v1/metrics	Send probe metric
GET	/v1/metrics?api_id=<id>	Retrieve metrics for a specific API
GET	/health	Health check endpoint

Example:

bash
Copy code
curl -X POST http://localhost:3000/v1/apis \
  -H "Content-Type: application/json" \
  -d '{"api_id":"demo-api","name":"Demo API","base_url":"https://httpbin.org/delay/0","probe_interval":30,"expected_status":[200]}'
🧪 Testing and CI
Run Tests Locally
bash
Copy code
cd backend
npm test
Run Tests with Coverage
bash
Copy code
npm test -- --coverage
This generates a coverage/ folder showing how much of your code is tested.

CI Pipeline
Every push or pull request to the main branch triggers:

Automatic installation of dependencies

Jest test run (with coverage)

Upload of coverage artifact

Workflow file: .github/workflows/ci.yml

🚀 Future Improvements
Slack / Email alert integration

Grafana dashboard visualization

Rule-based anomaly detection engine

Role-based access (JWT/OAuth2)

Prometheus metrics exporter

Kubernetes deployment manifests

Frontend monitoring dashboard

