FROM node:12.4.0-slim

ENV NODE_ENV=production

WORKDIR /transport-agent/

COPY package.json tsconfig.json yarn.lock ./
COPY src ./src

EXPOSE 5000

RUN yarn --production && yarn cache clean --force && yarn build

CMD ["node", "./build/app.js"]

