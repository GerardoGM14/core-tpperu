# ============================================================
# wa-daemon (Go + whatsmeow) - build multi-stage
# ============================================================
FROM golang:1.25-bookworm AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# CGO off → binario estático; whatsmeow usa sqlstore sobre Postgres (no SQLite/CGO aquí)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /wa-daemon .

# ------------------------------------------------------------
FROM debian:bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wa-daemon /app/wa-daemon

EXPOSE 8080
CMD ["/app/wa-daemon"]
