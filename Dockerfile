FROM node:12.4.0-slim

ENV NODE_ENV=production

WORKDIR /transport-agent/

COPY package*.json tsconfig.json ./
COPY src ./src

EXPOSE 5000

RUN npm install --only=production && npm cache clean --force && npm run build

CMD ["node", "./build/app.js"]

