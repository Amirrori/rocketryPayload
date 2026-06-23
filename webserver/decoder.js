// TODO This script has to be run constantly DONE
// TODO This script has to keep updating itself with the text file DONE
// the two above are basically the fucking same
// TODO This script has to insert it's results into a JSON file DONE
// TODO Assuming that the text file has multiple strings in it, we would like to read each of them seperately and have each of them inserted into the json file live DONE

const fs = require('node:fs');

const file_name = "/home/shrewd/Desktop/rocketryPayload/webserver/lora.txt"

let string = ""; 
function initilisation(FILE) {
    
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
