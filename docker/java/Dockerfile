# Secure, isolated Java (JDK 17) execution sandbox for CodeFix AI
FROM amazoncorretto:17-alpine

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
