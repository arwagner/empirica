# The empirica-api container: the AI professor. Build from the repo root:
#   docker build -f server/Dockerfile -t empirica-api .
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:server

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787 TRUST_PROXY=1 STATE_FILE=/data/counters.json
# The server is one bundled file: the lab catalog and every dependency are inside it.
COPY --from=build /app/dist-server/main.mjs ./main.mjs
RUN mkdir -p /data && chown node /data
VOLUME /data
USER node
EXPOSE 8787
CMD ["node", "main.mjs"]
