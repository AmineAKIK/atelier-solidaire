FROM node:24.19.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_WORKSHOP_ID=2

RUN if [ -z "$VITE_API_URL" ]; then \
      echo "VITE_API_URL build argument is required and must not be empty." >&2; \
      exit 1; \
    fi

RUN VITE_API_URL="$VITE_API_URL" VITE_WORKSHOP_ID="$VITE_WORKSHOP_ID" npm run build

FROM nginx:1.30.5-alpine3.24-slim AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
