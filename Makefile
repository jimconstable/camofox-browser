VERSION  ?= 135.0.1
RELEASE  ?= beta.24

# yt-dlp is pinned to a named upstream release (never "latest") so the image
# build is deterministic. Refresh procedure: pick a tag from
# https://github.com/yt-dlp/yt-dlp/releases, then copy the matching lines from
# that release's SHA2-256SUMS asset into YTDLP_SHA256_* below.
#   yt-dlp_linux          -> YTDLP_SHA256_X86_64
#   yt-dlp_linux_aarch64  -> YTDLP_SHA256_AARCH64
YTDLP_VERSION        ?= 2026.07.04
YTDLP_SHA256_X86_64  := 6bbb3d314cde4febe36e5fa1d55462e29c974f63444e707871834f6d8cc210ae
YTDLP_SHA256_AARCH64 := b6ce97646773070d7a7ffd6bbbdcaecb47c48483909c54c915bf08a7a9b5e0b1

# Auto-detect host architecture; map arm64 (macOS) → aarch64
UNAME_ARCH := $(shell uname -m)
ifeq ($(UNAME_ARCH),arm64)
  ARCH ?= aarch64
else
  ARCH ?= $(UNAME_ARCH)
endif

# Map ARCH to the platform suffixes used by upstream release filenames
ifeq ($(ARCH),aarch64)
  CAMOUFOX_ARCH := arm64
  YTDLP_ARCH    := _aarch64
  YTDLP_SHA256  := $(YTDLP_SHA256_AARCH64)
else
  CAMOUFOX_ARCH := x86_64
  YTDLP_ARCH    :=
  YTDLP_SHA256  := $(YTDLP_SHA256_X86_64)
endif

IMAGE        := camofox-browser:$(VERSION)-$(ARCH)
CAMOUFOX_ZIP := dist/camoufox-$(ARCH).zip
YTDLP_BIN    := dist/yt-dlp-$(ARCH)

CAMOUFOX_URL := https://github.com/daijro/camoufox/releases/download/v$(VERSION)-$(RELEASE)/camoufox-$(VERSION)-$(RELEASE)-lin.$(CAMOUFOX_ARCH).zip
YTDLP_URL    := https://github.com/yt-dlp/yt-dlp/releases/download/$(YTDLP_VERSION)/yt-dlp_linux$(YTDLP_ARCH)

.PHONY: build build-arm64 build-x86 fetch fetch-arm64 fetch-x86 up down reset clean

## Build the Docker image for the current ARCH (default: x86_64)
build: fetch
	docker build --no-cache \
	  --build-arg ARCH=$(CAMOUFOX_ARCH) \
	  --build-arg CAMOUFOX_VERSION=$(VERSION) \
	  --build-arg CAMOUFOX_RELEASE=$(RELEASE) \
	  --build-arg YTDLP_VERSION=$(YTDLP_VERSION) \
	  --build-arg YTDLP_SHA256=$(YTDLP_SHA256) \
	  --build-arg YTDLP_DIST_ARCH=$(ARCH) \
	  -t $(IMAGE) .

## Convenience targets
build-arm64:
	$(MAKE) build ARCH=aarch64

build-x86:
	$(MAKE) build ARCH=x86_64

## Download both binaries into dist/ for the current ARCH
fetch: $(CAMOUFOX_ZIP) $(YTDLP_BIN)

fetch-arm64:
	$(MAKE) fetch ARCH=aarch64

fetch-x86:
	$(MAKE) fetch ARCH=x86_64

$(CAMOUFOX_ZIP):
	mkdir -p dist
	curl -fSL "$(CAMOUFOX_URL)" -o $@

$(YTDLP_BIN):
	mkdir -p dist
	curl -fSL "$(YTDLP_URL)" -o $@
	echo "$(YTDLP_SHA256)  $@" | sha256sum -c -

up:
	@if ! docker image inspect $(IMAGE) > /dev/null 2>&1; then \
	  $(MAKE) build; \
	fi
	docker run -d --restart unless-stopped --name camofox-browser --shm-size=2g -p 9377:9377 $(IMAGE)

down:
	docker stop camofox-browser && docker rm camofox-browser

reset:
	-docker stop camofox-browser 2>/dev/null
	-docker rm camofox-browser 2>/dev/null
	-docker rmi $(IMAGE) 2>/dev/null
	$(MAKE) build

clean:
	rm -rf dist
