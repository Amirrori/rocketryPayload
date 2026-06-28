FROM node:20-alpine

WORKDIR /home/yani/rocketry/rocketryPayload/webserver

COPY package*.json ./

RUN apk add --no-cache python3 make g++ linux-headers
  
RUN npm install --production

COPY . .

EXPOSE 3000


CMD ["node", "server.js"]
