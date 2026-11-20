FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_TENANT_URI=rekipe-preprod
ARG VITE_KEYCLOAK_BASE_URL=https://keycloak.amazone.lan
ARG VITE_KEYCLOAK_REALM=rekipe
ARG VITE_KEYCLOAK_CLIENT_ID=gwel
ARG VITE_RECIPE_API_BASE_URL=/api/recipe
ARG VITE_RECIPE_AGENT_API_BASE_URL=/api/recipe-agent
ARG VITE_INGREDIENT_ENRICHMENT_AGENT_API_BASE_URL=/api/ingredient-enrichment-agent
ARG VITE_MEDIA_API_BASE_URL=/api/media

ENV VITE_TENANT_URI=$VITE_TENANT_URI \
    VITE_KEYCLOAK_BASE_URL=$VITE_KEYCLOAK_BASE_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID \
    VITE_RECIPE_API_BASE_URL=$VITE_RECIPE_API_BASE_URL \
    VITE_RECIPE_AGENT_API_BASE_URL=$VITE_RECIPE_AGENT_API_BASE_URL \
    VITE_INGREDIENT_ENRICHMENT_AGENT_API_BASE_URL=$VITE_INGREDIENT_ENRICHMENT_AGENT_API_BASE_URL \
    VITE_MEDIA_API_BASE_URL=$VITE_MEDIA_API_BASE_URL

RUN VITE_AUTH_DISABLED=false npm run build


FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
