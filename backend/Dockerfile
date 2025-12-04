# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS runtime

ARG DEBIAN_MIRROR="http://deb.debian.org/debian"
ARG DEBIAN_SECURITY_MIRROR="http://security.debian.org/debian-security"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    set -eux; \
    if [ -f /etc/apt/sources.list ]; then \
        sed -i "s|http://deb.debian.org/debian|${DEBIAN_MIRROR}|g" /etc/apt/sources.list; \
    else \
        printf 'deb %s bookworm main\n' "${DEBIAN_MIRROR}" > /etc/apt/sources.list; \
        printf 'deb %s bookworm-updates main\n' "${DEBIAN_MIRROR}" >> /etc/apt/sources.list; \
        printf 'deb %s bookworm-security main\n' "${DEBIAN_SECURITY_MIRROR}" >> /etc/apt/sources.list; \
    fi; \
    if [ -d /etc/apt/sources.list.d ]; then \
        find /etc/apt/sources.list.d -type f -name '*.list' -print0 | xargs -0 -r sed -i "s|http://deb.debian.org/debian|${DEBIAN_MIRROR}|g" || true; \
    fi; \
    if [ -f /etc/apt/sources.list ]; then \
        sed -i "s|http://security.debian.org/debian-security|${DEBIAN_SECURITY_MIRROR}|g" /etc/apt/sources.list || true; \
    fi; \
    if [ -d /etc/apt/sources.list.d ]; then \
        find /etc/apt/sources.list.d -type f -name '*.list' -print0 | xargs -0 -r sed -i "s|http://security.debian.org/debian-security|${DEBIAN_SECURITY_MIRROR}|g" || true; \
    fi; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
    bash \
    gcc \
    default-libmysqlclient-dev \
    pkg-config; \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r /tmp/requirements.txt

COPY . /app
RUN chmod +x entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]
