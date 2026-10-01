# Must track the CAMOUFOX_VERSION / CAMOUFOX_RELEASE defaults in Dockerfile and
# Dockerfile.ci: these are passed as --build-arg and therefore override them, so
# a stale value here silently bakes a browser that camoufox-js was not pinned to.
VERSION  ?= 152.0.4
RELEASE  ?= beta.28

# yt-dlp is no longer pre-fetched into dist/. It is installed inside the build by
# plugins/youtube/post-install.sh, pinned to a named release and verified against
# YT_DLP_SHA256; the pin lives in Dockerfile / Dockerfile.ci (see README
# "Refreshing deterministic build inputs").

# Auto-detect host architecture; map arm64 (macOS) → aarch64
UNAME_ARCH := $(shell uname -m)
ifeq ($(UNAME_ARCH),arm64)
  ARCH ?= aarch64
else
  ARCH ?= $(UNAME_ARCH)
endif

# Map ARCH to the platform suffix used by upstream Camoufox release filenames
ifeq ($(ARCH),aarch64)
  CAMOUFOX_ARCH := arm64
else
  CAMOUFOX_ARCH := x86_64
endif

IMAGE        := camofox-browser:$(VERSION)-$(ARCH)
CAMOUFOX_ZIP := dist/camoufox-$(ARCH).zip

CAMOUFOX_URL := https://github.com/daijro/camoufox/releases/download/v$(VERSION)-$(RELEASE)/camoufox-$(VERSION)-$(RELEASE)-lin.$(CAMOUFOX_ARCH).zip

.PHONY: build build-arm64 build-x86 fetch fetch-arm64 fetch-x86 up down reset clean

## Build the Docker image for the current ARCH (default: x86_64).
## No `fetch` prerequisite: the build downloads Camoufox and yt-dlp itself, so
## `docker build .` also works standalone now that nothing is bind-mounted.
build:
	docker build --no-cache \
	  --build-arg ARCH=$(CAMOUFOX_ARCH) \
	  --build-arg CAMOUFOX_VERSION=$(VERSION) \
	  --build-arg CAMOUFOX_RELEASE=$(RELEASE) \
	  -t $(IMAGE) .

## Convenience targets
build-arm64:
	$(MAKE) build ARCH=aarch64

build-x86:
	$(MAKE) build ARCH=x86_64

## Pre-stage the Camoufox archive in dist/ for the current ARCH. The Docker build
## downloads Camoufox itself, so this is a local convenience only.
fetch: $(CAMOUFOX_ZIP)

fetch-arm64:
	$(MAKE) fetch ARCH=aarch64

fetch-x86:
	$(MAKE) fetch ARCH=x86_64

$(CAMOUFOX_ZIP):
	mkdir -p dist
	curl -fSL "$(CAMOUFOX_URL)" -o $@

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
