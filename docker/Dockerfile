# Lightweight, secure Python execution sandbox for CodeFix AI
FROM python:3.11-alpine

# Security: Create an unprivileged user and group
RUN addgroup -g 1000 sandboxgroup && \
    adduser -D -u 1000 -G sandboxgroup -h /sandbox sandboxuser

# Set working directory
WORKDIR /sandbox

# Switch to unprivileged user
USER sandboxuser

# Default command (overridden dynamically during execution)
CMD ["python3", "-c", "print('CodeFix AI Sandbox Ready')"]
