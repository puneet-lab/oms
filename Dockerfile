FROM node:20
WORKDIR /app

COPY package*.json ./
RUN npm ci

# copy prisma so generate works in image builds too
COPY prisma ./prisma
RUN npx prisma generate

# copy src + tsconfig
COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000
CMD ["sh","-c","npx prisma generate && npm run dev"]
