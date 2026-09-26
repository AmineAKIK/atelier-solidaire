FROM node:26.10.0-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_WORKSHOP_ID=2

RUN VITE_API_URL="" VITE_WORKSHOP_ID="$VITE_WORKSHOP_ID" npm run build

FROM nginx:1.30.5-alpine3.24-slim AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
