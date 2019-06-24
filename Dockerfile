FROM nikolaik/python-nodejs:latest

WORKDIR /transport-agent/

COPY package*.json tsconfig.json .env ./
COPY src ./src/

EXPOSE 5000

RUN npm install --only=production && npm run build

CMD ["node", "/build/app.js"]

