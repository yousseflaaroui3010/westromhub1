# Westrom Hub

Westrom Hub is a property tax and insurance analysis tool powered by AI.

## Architecture

The project runs using Docker Compose:
- **Frontend**: Vite + React
- **Backend**: Express + Node.js (proxies AI requests, rate limits, size checks)
- **AI**: Ollama running locally

## Run Locally (Docker - Recommended)

1. Ensure Docker and Docker Compose are installed.
2. Run the application:
   ```bash
   docker-compose up --build
   ```
   This will automatically:
   - Start the frontend on port 80
   - Start the backend on port 3001
   - Start Ollama and pull the required models (`qwen2-vl:7b`, `qwen2.5:7b`). *Note: Model pulling may take several minutes on the first run.*

3. Open your browser and navigate to `http://localhost`.

## Run Locally (Manual)

**Prerequisites:** Node.js, Ollama

1. Start Ollama and pull models:
   ```bash
   ollama pull qwen2-vl:7b
   ollama pull qwen2.5:7b
   ```
2. Start the API:
   ```bash
   cd api
   npm install
   npm run dev
   ```
3. Start the Frontend:
   ```bash
   npm install
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.

## Testing

Run tests with:
```bash
npm run test
```
