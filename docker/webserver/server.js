const express = require("express")
const app = express()
const i2c = require("i2c-bus");
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
