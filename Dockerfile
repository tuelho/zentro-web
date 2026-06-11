# Constroi um dos apps do workspace (storefront ou admin) e serve com nginx.
# Uso: docker build --build-arg APP=storefront -t tuelho/zentro-web-store .
#      docker build --build-arg APP=admin      -t tuelho/zentro-web-admin .

# ---- build ----
FROM node:24-alpine AS build
ARG APP=storefront
WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx ng build ${APP} --configuration production

# ---- runtime ----
FROM nginx:alpine
ARG APP=storefront
# so substitui a variavel API_URL no template (preserva $host, $uri do nginx)
ENV API_URL=http://zentro-api:8080
ENV NGINX_ENVSUBST_FILTER=API_URL
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/${APP}/browser /usr/share/nginx/html
EXPOSE 80
