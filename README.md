
# Why?
It was a way to display core and miscellaneous information reliably.


## Code base

Everything will be containerised in docker containers.

- Docker 1: Web back-end running NodeJS, Connected to some database that contains the LoRa information. Serves HTML content for website.

- Docker 2: Nginx, is a web server, reverse proxy, content cache, proxy server and many more. We will be using it's functionality for web server and reverse proxy. It will serve whatever Docker 1 will be sending through and serving said content to the user.

Justification for using docker is that it's easier to redeploy on systems later on(less commands more config files that you can just pop into system) and that it's all containerised (elevated security).

There are two reasons we are using NodeJS. One is that it can do more than plain html(useful for getting and serving content). Second is that it's considerably more robust for our stack than something like NextJS or React, as we do not require the features they provide us(Used mainly for professional web development).

This is all ran in PIos but is reproducible on any system that uses any modern version of Linux. 

### Visual diagram of how everything works:

![[Assets/diagram.png]]


## Technical analysis:

### Docker deployment

Create Docker Network:
```
docker network create mynet
```

Tree of Docker directory:

```
.
├── Dockerfile
├── nginx
│   └── default.conf
└── webserver
    ├── Dockerfile
    ├── package.json
    └── server.js
```

First Dockerfile is for nginx:

docker/Dockerfile:
```
amirrori@raspberrypi:~/docker $ cat Dockerfile 
FROM nginx
COPY webserver/ /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
```

docker/nginx/default.conf:
```
server {
	   listen 80;

	       location / {
			       proxy_pass http://node-server:3000;
				   }
			   }
```

docker/webserver/Dockerfile:
```
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000


CMD ["node", "server.js"]
```

### To build and run node server
```
# in the same directory as node-server dockerfile so: ~/docker/webserver in my case
docker build -t node-server .

docker run -d --name node-server --network mynet -p 3000:3000 node-server
```

### To build and run nginx
```
# in the same directory as nginx server dockerfile: ~/docker/ in my case
docker build --no-cache -t webserver-nginx-image .
docker run -d --name webserver-nginx --network mynet -p 8080:80 webserver-nginx-image
```

### statistics and diagnosis:

To check if containers are or are not running do:
```
docker ps
docker ps -a
docker stats
```

To fully destroy a docker container(usually when files are stuck):
```
docker rm -f <container-name> 2>/dev/null
```

## How does it get the data?

Through LoRa-WAN stuff that communication peoples are setting up. I will either get a string or an already decoded list of strings. This data will be stored into a database using a Python script.


## Web-server required files:

In the webserver folder:

- webserver/server.js
- webserver/package.json
- webserver/src/public/
- webserver/src/index.html
- webserver/src/reset.css
- webserver/src/style.css

Which should be present when running the server.

### Resources used:
https://nginx.org/

https://docs.docker.com/engine/install/debian/#installation-methods

https://hub.docker.com/_/nginx

https://www.geeksforgeeks.org/devops/running-commands-inside-docker-container/

https://nodejs.org/en

https://www.digitalocean.com/community/tutorials/how-to-secure-a-containerized-node-js-application-with-nginx-let-s-encrypt-and-docker-compose

https://docs.docker.com/engine/network/

https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/

