FROM oven/bun:1.4.2-slim AS build

WORKDIR /app

COPY package.json bun.lock .npmrc ./
RUN bun install --frozen-lockfile

# Output: ./build
COPY . .
RUN bun run build && rm -f build/_headers


FROM nginx:1.31.6-alpine AS runtime

LABEL org.opencontainers.image.title="re-color" \
      org.opencontainers.image.description="Static build of the re-color SvelteKit app"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build --chown=nginx:nginx /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
