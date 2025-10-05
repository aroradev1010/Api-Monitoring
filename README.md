# 🧠 Intelligent API Performance Monitoring System  

> **A real-time API monitoring platform** that tracks uptime, latency, and errors for registered APIs — complete with a probe agent, rule-based alert engine, and DevOps-ready deployment pipeline.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Running Locally](#running-locally)
- [Docker Deployment](#docker-deployment)
- [API Endpoints](#api-endpoints)
- [Future Improvements](#future-improvements)
- [Author](#author)
- [License](#license)

---

## 🧩 Overview

Modern applications depend on APIs for payments, authentication, data exchange, and third-party integrations.  
Downtime or latency in these APIs can cause major system disruptions.  

This project provides a **modular monitoring system** that automatically checks APIs, stores performance metrics, and triggers alerts when thresholds are violated — similar to tools like **Datadog** or **Pingdom**, but designed for educational and DevOps learning purposes.

---

## ⚙️ Features

- **API Registration:** Add and manage APIs to monitor.
- **Probe Agent:** Continuously tests APIs and reports metrics.
- **Metrics Service:** Collects, stores, and evaluates incoming data.
- **Rule Engine:** Detects performance anomalies.
- **Alert Manager:** Generates alerts when thresholds are breached.
- **Dashboard UI:** Visualizes APIs, latency graphs, and alert history.
- **DevOps Ready:** Docker, CI/CD, and monitoring stack integration.

---

## 🏗️ System Architecture

```mermaid
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

MongoDB + Mongoose

Joi (validation)

Axios (HTTP client)

Frontend:

React

TailwindCSS or Material-UI

Axios for API calls

Probe:

Node.js standalone monitoring agent

DevOps & Tools:

Docker & Docker Compose

GitHub Actions (CI/CD)

Postman / curl for testing

Prometheus + Grafana (optional future integration)

📁 Project Structure
pgsql
Copy code
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
│   └── .gitignore
│
├── docker-compose.yml *(planned)*
├── .gitignore
└── README.md
🧰 Setup Instructions
Prerequisites
Node.js ≥ 18

MongoDB (local or Docker)

npm or yarn

Git

Clone Repository
bash
Copy code
git clone https://github.com/<your-username>/api-monitoring-system.git
cd api-monitoring-system
Install Dependencies
Backend:
bash
Copy code
cd backend
npm install
Frontend:
bash
Copy code
cd ../frontend
npm install
Probe:
No install required (uses axios only).

▶️ Running Locally
Start MongoDB

bash
Copy code
mongod
or

bash
Copy code
docker start apimon-mongo
Start Backend

bash
Copy code
cd backend
npm run dev
→ http://localhost:3000

Start Frontend

bash
Copy code
cd ../frontend
npm start
→ http://localhost:3001

Run Probe

bash
Copy code
cd ../probe
node probe.js
✅ Expected:

Probe logs success/failure metrics

Metrics stored in MongoDB

Alerts triggered for latency thresholds

🐳 Docker Deployment
Build Image
bash
Copy code
cd backend
docker build -t apimon-backend .
Run Container
bash
Copy code
docker run -p 3000:3000 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/apimon \
  apimon-backend
Backend will be available at http://localhost:3000

📡 API Endpoints
Method	Endpoint	Description
POST	/v1/apis	Register new API
GET	/v1/apis	List all APIs
POST	/v1/metrics	Send probe metrics
GET	/v1/metrics?api_id=<id>	Retrieve metrics for an API
GET	/v1/alerts	Fetch all alerts

Example:

bash
Copy code
curl -X POST http://localhost:3000/v1/apis \
  -H "Content-Type: application/json" \
  -d '{"api_id":"demo-api","name":"Demo API","base_url":"https://httpbin.org/delay/0","probe_interval":30,"expected_status":[200]}'
🚀 Future Improvements
 TypeScript migration

 Logger integration (Winston/Pino)

 Role-based access (JWT/OAuth2)

 Slack / Email alert integration

 Prometheus metrics export

 Historical charts (Grafana)

 CI/CD pipeline (GitHub Actions)

 Kubernetes deployment

👨‍💻 Author
Dev Arora
Software Engineering Student | DevOps & Full Stack Enthusiast

GitHub: github.com/<your-username>

LinkedIn: linkedin.com/in/<your-handle>

📜 License
MIT License — free to use and modify for learning and research.

yaml
Copy code

---

### ✅ Usage
1. Copy the text above into a file named **`README.md`** in your project root.
2. Replace:
   - `<your-username>` → your GitHub username  
   - `<your-handle>` → your LinkedIn handle  
3. Commit and push:
   ```bash
   git add README.md
   git commit -m "Added professional README with architecture and setup instructions"
   git push
