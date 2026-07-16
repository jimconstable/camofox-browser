#!/bin/sh
# Install an integrity-verified yt-dlp binary when Docker has not already done so.
# Keep this aligned with the pinned values in Dockerfile*, Makefile, and CI.
set -eu

YTDLP_VERSION="${YTDLP_VERSION:-2026.07.04}"
YTDLP_SHA256_X86_64="${YTDLP_SHA256_X86_64:-6bbb3d314cde4febe36e5fa1d55462e29c974f63444e707871834f6d8cc210ae}"
YTDLP_SHA256_AARCH64="${YTDLP_SHA256_AARCH64:-b6ce97646773070d7a7ffd6bbbdcaecb47c48483909c54c915bf08a7a9b5e0b1}"

if [ -x /usr/local/bin/yt-dlp ] && [ "$(/usr/local/bin/yt-dlp --version 2>/dev/null || true)" = "$YTDLP_VERSION" ]; then
  exit 0
fi

case "$(uname -m)" in
  x86_64|amd64) suffix=""; sha256="$YTDLP_SHA256_X86_64" ;;
  aarch64|arm64) suffix="_aarch64"; sha256="$YTDLP_SHA256_AARCH64" ;;
  *) echo "Unsupported architecture for yt-dlp: $(uname -m)" >&2; exit 1 ;;
esac

curl -fL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux${suffix}" -o /usr/local/bin/yt-dlp
echo "${sha256}  /usr/local/bin/yt-dlp" | sha256sum -c -
chmod +x /usr/local/bin/yt-dlp
