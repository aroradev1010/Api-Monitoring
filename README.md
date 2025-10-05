🧠 Intelligent API Performance Monitoring System

A real-time API monitoring platform that tracks uptime, latency, and errors for registered APIs — complete with a probe agent, rule-based alert engine, and DevOps-friendly deployment pipeline.

📘 Table of Contents

Overview

Features

System Architecture

Tech Stack

Project Structure

Setup Instructions

Running Locally

Docker Deployment

API Endpoints

Future Improvements

Author

🧩 Overview

Modern applications rely heavily on APIs for payments, authentication, analytics, and third-party integrations.
Downtime or latency in these APIs can cause major reliability issues.

This project provides a modular monitoring system that automatically checks APIs, stores performance metrics, and triggers alerts when thresholds are violated — similar in spirit to tools like Datadog or Pingdom, but custom-built for educational and DevOps learning purposes.

⚙️ Features

API Registration: Register any API you want to monitor.

Probe Agent: Continuously tests APIs and reports metrics (latency, status code, errors).

Metric Ingestion Service: Stores and evaluates incoming data.

Rule Engine: Detects performance anomalies or downtime.

Alert Manager: Generates alerts for violations (configurable for Slack/email integration).

Dashboard (Frontend): View APIs, latency charts, and alert history.

DevOps-Ready: Docker support, CI/CD pipeline, and monitoring stack integration.

🏗️ System Architecture
flowchart LR
    subgraph Probe
        A[Probe Agent] -->|Collects metrics| B(Backend /v1/metrics)
    end

    subgraph Backend
        B --> C[MongoDB]
        B --> D[Rule Engine]
        D --> E[Alert Manager]
        E --> F[(Alerts DB)]
    end

    subgraph Frontend
        G[React Dashboard] -->|Reads metrics| B
    end

    B -->|API Registration| H[/Registered APIs/]

💻 Tech Stack

Backend:

Node.js + Express

MongoDB (Mongoose ODM)

Joi (validation)

Axios (HTTP client)

Frontend:

React + Vite (or Create React App)

TailwindCSS / Material-UI

Axios for API calls

Probe:

Node.js standalone agent

Axios for monitoring requests

DevOps & Tools:

Docker (multi-stage build)

Docker Compose (for backend + MongoDB)

GitHub Actions (CI/CD pipeline)

Postman / curl for API testing

Prometheus + Grafana (optional future integration)

📁 Project Structure
api-monitoring/
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── .gitignore
│
├── probe/
│   └── probe.js
│
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── .gitignore
│   └── public/
│
├── docker-compose.yml (planned)
├── .gitignore (root)
└── README.md

🧰 Setup Instructions
Prerequisites

Node.js ≥ 18

MongoDB (local or Docker)

npm / yarn

Git

Clone Repository
git clone https://github.com/<your-username>/api-monitoring-system.git
cd api-monitoring-system

Install Dependencies
Backend:
cd backend
npm install

Frontend:
cd ../frontend
npm install

Probe:

No install required (uses axios only).

▶️ Running Locally

Start MongoDB

mongod


or if Dockerized:

docker start apimon-mongo


Start Backend

cd backend
npm run dev


Access: http://localhost:3000

Start Frontend

cd ../frontend
npm start


Access: http://localhost:3001

Run Probe

cd ../probe
node probe.js


✅ You should see:

Probe output with latency and status codes

Metrics visible in MongoDB Compass

Alerts logged in the backend console

🐳 Docker Deployment
Build image
cd backend
docker build -t apimon-backend .

Run container
docker run -p 3000:3000 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/apimon \
  apimon-backend


Access API at: http://localhost:3000/v1/apis

📡 API Endpoints
Method	Endpoint	Description
POST	/v1/apis	Register a new API
GET	/v1/apis	List registered APIs
POST	/v1/metrics	Send metrics (from probe)
GET	/v1/metrics?api_id=<id>	Fetch metrics for given API
GET	/v1/alerts	Retrieve triggered alerts

Example registration:

curl -X POST http://localhost:3000/v1/apis \
  -H "Content-Type: application/json" \
  -d '{"api_id":"demo-api","name":"Demo API","base_url":"https://httpbin.org/delay/0","probe_interval":30,"expected_status":[200]}'

🚀 Future Improvements

 TypeScript migration (strong typing for backend)

 Centralized logger (Winston/Pino)

 Authentication & role-based access (JWT/OAuth2)

 Slack / Email alert integration

 Prometheus metric export

 Historical metric charts (Grafana integration)

 CI/CD GitHub Action pipeline

 Kubernetes deployment templates

👨‍💻 Author

Dev Arora
Software Engineering Student | DevOps & Full Stack Enthusiast

GitHub: github.com/<your-username>

LinkedIn: linkedin.com/in/<your-handle>
