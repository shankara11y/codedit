# Lightweight, secure Node.js execution sandbox for CodeFix AI
FROM node:20-alpine

# In node:alpine, user 'node' (UID 1000, GID 1000) is pre-configured
WORKDIR /sandbox

# Switch to unprivileged user (UID:GID 1000:1000)
USER node

# Default command
CMD ["node", "-e", "console.log('CodeFix AI JavaScript Sandbox Ready')"]
