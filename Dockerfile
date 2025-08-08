FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies, then dev deps, then clean up
RUN npm ci --only=production && \
    npm ci && \
    npm cache clean --force

# Copy prisma and generate
COPY prisma ./prisma
RUN npx prisma generate

# Copy source files
COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000
CMD ["sh","-c","npx prisma generate && npm run dev"]