# Node 22 base pinned to an immutable multi-arch index digest for reproducible
# builds. Refresh with: docker buildx imagetools inspect node:22-slim
# (this digest still resolves per-platform for linux/amd64 and linux/arm64).
FROM node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS camofox-browser

# Pinned Camoufox version for reproducible builds
# Update these when upgrading Camoufox
ARG CAMOUFOX_VERSION=135.0.1
ARG CAMOUFOX_RELEASE=beta.24
ARG ARCH=x86_64

# yt-dlp binary is fetched by the Makefile into dist/ and bind-mounted below.
# YTDLP_SHA256 is the arch-specific checksum from the pinned yt-dlp release's
# SHA2-256SUMS asset; the build fails if the bind-mounted binary does not match.
ARG YTDLP_VERSION=2026.07.04
ARG YTDLP_SHA256

# Install dependencies for Camoufox (Firefox-based)
RUN apt-get update && apt-get install -y \
    # Firefox dependencies
    libgtk-3-0 \
    libdbus-glib-1-2 \
    libxt6 \
    libasound2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    # Mesa OpenGL/EGL for WebGL support (software rendering via llvmpipe)
    # Without these, Firefox cannot create WebGL contexts -- a major bot detection signal
    libegl1-mesa \
    libgl1-mesa-dri \
    libgbm1 \
    # Xvfb virtual display -- runs Camoufox as if on a real desktop (better anti-detection)
    xvfb \
    # Fonts
    fonts-liberation \
    fonts-noto-color-emoji \
    fontconfig \
    # Utils
    ca-certificates \
    curl \
    unzip \
    # yt-dlp runtime dependency
    python3-minimal \
    && rm -rf /var/lib/apt/lists/*

# Pre-bake Camoufox browser binary into image via bind mount (downloaded by Makefile)
# Note: unzip returns exit code 1 for warnings (Unicode filenames), so we use || true and verify
RUN --mount=type=bind,source=dist,target=/dist \
    mkdir -p /root/.cache/camoufox \
    && (unzip -q /dist/camoufox-${ARCH}.zip -d /root/.cache/camoufox || true) \
    && chmod -R 755 /root/.cache/camoufox \
    && echo "{\"version\":\"${CAMOUFOX_VERSION}\",\"release\":\"${CAMOUFOX_RELEASE}\"}" > /root/.cache/camoufox/version.json \
    && test -f /root/.cache/camoufox/camoufox-bin && echo "Camoufox installed successfully"

# Install yt-dlp for YouTube transcript extraction (no browser needed).
# Verify the bind-mounted binary against the pinned upstream checksum before use.
RUN --mount=type=bind,source=dist,target=/dist \
    if [ -n "${YTDLP_SHA256}" ]; then \
      echo "${YTDLP_SHA256}  /dist/yt-dlp-${ARCH}" | sha256sum -c -; \
    fi \
    && install -m 755 /dist/yt-dlp-${ARCH} /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts/ ./scripts/
RUN npm ci --omit=dev

COPY server.js ./
COPY camofox.config.json ./
COPY lib/ ./lib/
COPY plugins/ ./plugins/
COPY scripts/ ./scripts/

# Install default plugin dependencies (apt packages + post-install hooks)
RUN sh scripts/install-plugin-deps.sh

ENV NODE_ENV=production
ENV CAMOFOX_PORT=9377

EXPOSE 9377

# OCI image metadata. Populated by the publisher via --build-arg; defaults keep
# the source label meaningful for local builds.
ARG IMAGE_SOURCE=https://github.com/jimconstable/camofox-browser
ARG IMAGE_REVISION=
ARG IMAGE_VERSION=
LABEL org.opencontainers.image.source=$IMAGE_SOURCE \
      org.opencontainers.image.revision=$IMAGE_REVISION \
      org.opencontainers.image.version=$IMAGE_VERSION

CMD ["sh", "-c", "node --max-old-space-size=${MAX_OLD_SPACE_SIZE:-128} server.js"]

# Optional: rebuild plugin deps after adding third-party plugins
# Usage: docker build --target with-plugins -t camofox-browser .
FROM camofox-browser AS with-plugins
COPY plugins/ ./plugins/
COPY camofox.config.json ./
COPY scripts/install-plugin-deps.sh /tmp/install-plugin-deps.sh
RUN /tmp/install-plugin-deps.sh && rm /tmp/install-plugin-deps.sh
