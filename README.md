# Frontend for Datambit

## System Overview
This project consists of a React frontend and multiple backend microservices (Report Write Service and Unified Detection Service) coordinated via Kafka.

## Setup & Deployment

### Backend
1. Ensure the database is up to date with the new models in `report-write-service/src/model/model.py`.
2. Run database migrations:
   ```bash
   cd report-write-service
   flask db migrate -m "Add usage tracking"
   flask db upgrade
   ```
3. Restart the `report-write-service`.

### Frontend
1. The frontend automatically points to `https://production.datambit.com` (configurable in `UsageDashboard.tsx`).
2. Build and deploy:
   ```bash
   npm run build
   npm run deploy
   ```
