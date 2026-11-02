FROM node:22-alpine
WORKDIR /app

# Install only the production dependencies first, so Docker can cache this layer.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3000
CMD ["node", "src/server.js"]
