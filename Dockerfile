FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv build-essential ca-certificates git curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --include=dev --include=optional --no-audit --no-fund

COPY . .

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PANEL_DATA_DIR=/app/data \
    PORT=3000

RUN NODE_OPTIONS="--max-old-space-size=1536" npm run build \
  && mkdir -p /app/data/servers

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000} -H 0.0.0.0"]
