# Secure, isolated C++ (G++) execution sandbox for CodeFix AI
FROM alpine:3.20

# Install GCC C++ compiler and standard libraries
RUN apk add --no-cache g++ libstdc++ musl-dev

# Security: Create unprivileged user & group
RUN addgroup -g 1000 sandboxgroup && \
    adduser -D -u 1000 -G sandboxgroup -h /sandbox sandboxuser

# Copy compilation/execution script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && \
    chmod 1777 /tmp

WORKDIR /sandbox

# Switch to unprivileged user (UID:GID 1000:1000)
USER 1000:1000

ENTRYPOINT ["/entrypoint.sh"]
