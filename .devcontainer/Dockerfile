ARG VARIANT=trixie

FROM oven/bun:1.4.2 AS bun

FROM mcr.microsoft.com/devcontainers/base:${VARIANT}

COPY --from=bun /usr/local/bin/bun	/usr/local/bin/bun
COPY --from=bun /usr/local/bin/bunx	/usr/local/bin/bunx

RUN apt-get update \
	&& apt-get install -y --no-install-recommends fd-find ripgrep \
	&& ln -sf /usr/bin/fdfind /usr/local/bin/fd \
	&& rm -rf /var/lib/apt/lists/*

RUN bun --version && fd --version && rg --version
