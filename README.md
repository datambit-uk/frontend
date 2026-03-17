# Frontend for Datambit

## System Overview
This project consists of a React frontend and multiple backend microservices (Report Write Service and Unified Detection Service) coordinated via Kafka.

## Usage Tracking Implementation
The system now tracks usage statistics per user and per group. The metrics tracked include:
- Total files processed
- Total data processed (in MB)
- Total processing time (in seconds)
- Total errors encountered

### 1. Database Schema Updates
The `usage_table_db` has been implemented in the `report-write-service` to provide efficient querying of usage metrics.

- **usage_table_db**: Stores individual usage events (file size, processing time, status).
- **groups**: Stores group information.
- **user_groups**: Stores user-to-group mapping.

### 2. Backend Changes (Report Write Service)
- **Tracking Logic**: `ReportRepository.update_result_score` now automatically records a usage entry in `usage_table_db` whenever a file processing result (score) is received from Kafka.
- **New API Endpoints**:
  - `GET /api/v1/usage/my-groups`: Returns a list of groups the current user belongs to.
  - `GET /api/v1/usage/stats?group_id=...&timeframe=...`: Returns aggregated statistics for the user or a specific group.
    - `timeframe=0`: Current month.
    - `timeframe=30/60/90`: Last X days.

### 3. Frontend Changes
The **Usage Dashboard** (`/usage`) has been updated to include:
- Real-time fetching of usage statistics from the backend.
- A **Group selector** to switch between personal and group-level metrics.
- A **Timeframe selector** (Current Month, Last 30, 60, 90 days) as requested.

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

---
Stay on main branch.
Edit code.
npm run deploy.
