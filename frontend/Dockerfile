# ==============================================================================
# Dockerfile for Varuna Netra Frontend (React SPA)
# Multi-stage build with Nginx for production serving
# ==============================================================================

# Stage 1: Build React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . ./

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

RUN yarn build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# SPA Routing: redirect all requests to /index.html
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
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
