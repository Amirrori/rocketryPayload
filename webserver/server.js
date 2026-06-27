const express = require("express")
const app = express()
const i2c = require("i2c-bus");

const fs = require('node:fs');

const file_name = "/home/shrewd/Desktop/rocketryPayload/webserver/lora.txt"
const bus = i2c.openSync(1);
const DEVICE_ADDR = 0x00;
const DEVICE_REG = 0x00;
const DEVICE_DATA = 0x00;

app.use(express.static("src"))

app.post("/i2c/off", (req, res) => {
    bus.writeByteSync(DEVICE_ADDR, DEVICE_REG, DEVICE_DATA);
    res.send("disabled I2C");
})

app.listen(3000, () => {
    console.log("Server is Running")
})


let string = ""; 
function initilisation(FILE, iteration) {
    
    try {
        const data = fs.readFileSync(FILE, "utf8");
        string = data;
    } catch (err) {
        console.error(err);

    }
    const stringWOC = string.trim().split(/[\r\n]+/);


    let parsedData = [];

    for(let i = 0; i < stringWOC.length; i++ ) {
        const stringWOS = stringWOC[i].trim().split(",");
        console.log("String No:", i);
        console.log(stringWOS);
        parsedData.push(parseData(stringWOS));
    }
    console.log(parsedData);
    
    fs.writeFileSync('data.json',JSON.stringify(parsedData, null, 2), 'utf8');
    fs.writeFileSync('data.json',JSON.stringify(parsedData, null, 2), 'utf8');
}

function parseData(string) {
    const dict = {};

    // debugging perposes
    // console.log(stringWOC)
    
    // insert first two elements into the dict
    dict["ID"] = string[0];
    dict["Time"] = string[1];
    
    // seperate the keys and values into their own arrys
    const keys = string.slice(2, 17);
    const values = string.slice(17, 32);
    // map each key onto it's value so they can be key pair values
    const data = Object.fromEntries(
        keys.map((key, i) => [key, values[i]])
    );
    // assign the object just created into the into the dictionary
    Object.assign(dict, data);

    return dict;
}

initilisation(file_name)
fs.watchFile(file_name, { interval: 500 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
        console.log('File was modified');
        initilisation(file_name);
    }
});

