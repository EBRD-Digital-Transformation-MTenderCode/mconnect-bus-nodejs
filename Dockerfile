FROM nikolaik/python-nodejs:latest

ENV NODE_ENV=production

WORKDIR /transport-agent/

COPY package*.json tsconfig.json .env src ./

EXPOSE 5000

RUN npm install --only=production && npm cache clean --force && npm run build

CMD ["node", "./build/app.js"]

