FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads/bbs && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "./bin/www"]
