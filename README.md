
# Why?

It was a way to display core and miscellaneous information reliably.

## Code base

Everything will be containerised in docker containers.

- Docker 1: Web back-end running NodeJS, Connected to some database that contains the LoRa information. Serves HTML content for website.

- Docker 2: Nginx, is a web server, reverse proxy, content cache, proxy server and many more. We will be using it's functionality for web server and reverse proxy. It will serve whatever Docker 1 will be sending through and serving said content to the user.

Justification for using docker is that it's easier to deploy on systems (less commands more config files that you can just pop into the system) and it's all containerised (elevated security). Moreover, it makes it also easier to manage.

There are two reasons we are using NodeJS. One is that it can do more than just plain html(useful for getting and serving content). Second is that it's considerably more robust for our stack than something like NextJS or React, as we do not require the features they provide us(Used mainly for professional web development).

But also mostly because I already knew how to use nodejs to read files.

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
docker/
├── Dockerfile
├── nginx
│   └── default.conf
└── webserver
    ├── Dockerfile
    ├── package.json
    ├── server.js
    └── src
        ├── index.html
        ├── public
        │   └── uhrk_logo.webp
        ├── reset.css
        ├── style.css
        └── tmp.css
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

docker run -d --name node-server --network mynet -p 3000:3000 -v /HOST/LORA/PATH:/usr/src/app/LoRa node-server
```
Note: the `-v /HOST/LORA/PATH:/usr/src/app/LoRa` has to be tested if command doesn't work just remove that part.
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

Data is recieved in what is known as a packet. We decode the packet which is given in a certain format and display it onto the web-server. All of this is done through LoRaWAN.

NodeJS reads the JSON files and dynamically changes the html of the web-server to display the data.

## NodeJs Documentation:



### Resources used:
https://nginx.org/

https://docs.docker.com/engine/install/debian/#installation-methods

https://hub.docker.com/_/nginx

https://www.geeksforgeeks.org/devops/running-commands-inside-docker-container/

https://nodejs.org/en

https://www.digitalocean.com/community/tutorials/how-to-secure-a-containerized-node-js-application-with-nginx-let-s-encrypt-and-docker-compose

https://docs.docker.com/engine/network/

https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/

https://www.geeksforgeeks.org/node-js/how-to-read-and-write-json-file-using-node-js/

https://docs.docker.com/get-started/docker-concepts/running-containers/sharing-local-files/



# TODO: 

Two scripts:
- Script that reads JSON files and imports them into a website.
- Script that converts txt files with the bitstring packet into a JSON file and imports them into the website.
Tell yani to change his bars to graphs.
