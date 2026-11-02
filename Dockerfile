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
CMD ["node", "src/server.js"]
