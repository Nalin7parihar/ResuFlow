# ── Frontend Dockerfile ──────────────────────────────────────
# Multi-stage build for the ResuFlow React frontend.
#
# Build:  docker build -t resuflow-frontend ./frontend
# Run:    docker run -p 3000:80 resuflow-frontend
# ─────────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

# SPA routing — redirect all paths to index.html
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
