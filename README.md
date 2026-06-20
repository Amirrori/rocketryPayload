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

![stackDiagram|144](https://github.com/Amirrori/rocketryPayload/blob/main/assets/diagram.png)


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

Slightly unrelated to webserver and website:
After talking to james, there will be 2 forms of data stored. Very compact NEMA strings that are stored in a text file and a struct based packet that is directly copied from Will's dashboard webserver.

#### string format
The strings will be in the format of:
"ID, TIME, SENSOR_IDS, SENSOR_DATAS"

E.G: 
"2, 17:38:42, B1, B2, B3, B4, T1, T2, T3, H1, H2, H3, M, A, X, Y, Z, Nb1, Nb2, Nb3, ..., Nx,y,z"
	 | N is the data for each corresponding sensor. for instance Nb1 is data for sensor b1.
## NodeJS

The sever runs on a *localhost* instance of NodeJS. It's set to run at port *3000*. This means that NodeJS is a dependency - on (Arch) Linux it can be installed as follows:
```bash
sudo pacman -S nodejs
```

To access it, you first need to start the server:
```bash
node <path-to-server-folder>/server.js
```

And to access it, it can be found at `http://localhost:3000/`

### The contents of the file are as follows:
Set up NodeJS to be used with Express (makes setting up endpoints easier):
```js
const express = require("express")
const app = express()
```

Pull & serve files from the `src` folder:
```js
app.use(express.static("src"))
```

Turn I2C peripherals off via an endpoint call **(unused AND unfinished)**:
```js
const i2c = require("i2c-bus");
const bus = i2c.openSync(1);
const DEVICE_ADDR = 0x00;
const DEVICE_REG = 0x00;
const DEVICE_DATA = 0x00;

app.post("/i2c/off", (req, res) => {
    bus.writeByteSync(DEVICE_ADDR, DEVICE_REG, DEVICE_DATA);
})
```

## HTML Architecture

Each 'box' that contains data (e.g. *Camera Feed 1*, *Telemetry 1*, etc.) is a HTML `<section>` element with a unique ID tag to identify it. Every `<section>` also shares a `data-card` class for consistent styling.

The `<section>` elements are encapsulated within a `<div>` with an id `telemetry-wrapper`, in case further parts are added to the payload in the future - that way the CSS can avoid clashing.

## CSS Files

There are currently 2 CSS files:
- `reset.css`
- `style.css`

`reset.css` is CSS to remove the inconsistent styling between web browsers - the website I got the code from is linked at the top of the file.

`style.css` is the CSS for the styling of the whole page. This is where updates should be made.

## JS Files

There are currently 3 JS files:
- `gauge.js`
- `script.js`
- `server.js`

`gauge.js` includes code for the gauges which display data. It may or may not be used in the future, I have chosen to not remove it despite it currently not being used. It should **NOT** be modified

`server.js` is explained in the NodeJS section.

`script.js` includes the JS code for everything else (e.g. updating data).

## Updating Data

Data can be updated by calling the following JavaScript function:
```js
function update_data(target, new_data);
```

Information on how the function works and what it expects is inside `script.js`.


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
