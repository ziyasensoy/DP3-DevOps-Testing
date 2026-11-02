FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install only the production dependencies first, so Docker can cache this layer.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Run as the non-root "node" user that the official image provides.
USER node
EXPOSE 3000

# Let Docker check that the app is still answering on /health.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
