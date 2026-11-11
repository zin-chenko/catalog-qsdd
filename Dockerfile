FROM node:22-alpine AS build

WORKDIR /app
ARG NPM_REGISTRY=http://repolib-main.diasoft.ru:8081/repository/npm-public-and-diasoft/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN npm install --global pnpm@11.25.0 --registry=${NPM_REGISTRY} --no-audit --no-fund
RUN pnpm install --frozen-lockfile --registry=${NPM_REGISTRY}

COPY angular.json tsconfig.json tsconfig.app.json webpack.config.js ./
COPY src ./src
COPY public ./public
RUN pnpm run prod

FROM nginx:stable-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/catalog-qsdd /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
