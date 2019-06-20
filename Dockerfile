FROM nikolaik/python-nodejs:latest

ARG NODE_ENV

RUN echo "Mode - " $NODE_ENV

WORKDIR /transport-agent/

COPY package*.json tsconfig.json nodemon.json .env.dev ./
COPY src ./src/

EXPOSE 5000

RUN if [ $NODE_ENV == "production" ]; \
       then npm install --only=production && npm run build; \
       else npm install; \
       fi

