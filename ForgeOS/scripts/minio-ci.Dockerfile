# Disposable CI storage only. Never attach this image to an existing deployment volume.
FROM golang:1.24.8-alpine AS build
ENV CGO_ENABLED=0
# RELEASE.2025-10-15T17-29-55Z, including the session-policy security fix.
RUN go install github.com/minio/minio@9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a

FROM alpine:3.22
RUN apk add --no-cache ca-certificates
COPY --from=build /go/bin/minio /usr/local/bin/minio
ENTRYPOINT ["minio"]
