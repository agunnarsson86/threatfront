FROM node:22-slim AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY server/ ./server/
RUN npm ci --prefix server

COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

EXPOSE 3001
VOLUME /app/server/data

ENV SERVE_STATIC=true
ENV PORT=3001

CMD ["npm", "start", "--prefix", "server"]
