// NOTE!!!!!!!!!!
// MAKE SURE THIS IS SET TO FALSE FOR THE LAUNCH
const DEV_MODE = true;

const FILE_ACCESS_INTERVAL = 1000;
const DATA_UNITS = {
    "B1": "Pa",
    "B2": "Pa",
    "B3": "Pa",
    "B4": "Pa",
    "T1": "°C",
    "T2": "°C",
    "T3": "°C",
    "H1": "%",
    "H2": "%",
    "H3": "%",
    "M": "°",
    "A": "m",
    "X": "",
    "Y": "",
    "Z": ""
};

let init_html_template_complete = false;
const setup_time = DEV_MODE == true ? 1000 : 10000;
const data_item_template = document.querySelector("#data-point-generic");
const telemetry_wrapper_template = document.querySelector("#telemetry-wrapper-generic");
let telemetry_wrapper = document.querySelector("#telemetry-wrapper");
let halt_update = false;
let node_count = 0;
// let telemetry_data_wrapper = document.querySelector("#telemetry");


// functions to update dashboard live

/*
 * @brief Initialises HTML elements to store the data that will be received.
 *        Initialises them by reading data once and generating the elements with
 *        `<template>` tags
 *
 * @note This function will take some time to run initially, so you will see
 *       "no data" on the server for a few seconds.
 */
async function html_setup()
{
    const data = await read_data_json();

    node_count = data.length;

    for (let i = 0; i < data.length; ++i)
    {
        let wrapper_clone_tmpl = telemetry_wrapper_template.content.cloneNode(true);
        let wrapper_clone = wrapper_clone_tmpl.querySelector(".data-card");
        wrapper_clone.id = "telemetry-" + i;
        wrapper_clone.querySelector("h2").innerText = "Sensor " + data[i]["ID"];

        for (let key in data[i])
        {
            if (key.toLowerCase() == "id" || key.toLowerCase() == "time")
                continue;

            let telemetry_clone_tmpl = data_item_template.content.cloneNode(true);
            let telemetry_clone = telemetry_clone_tmpl.querySelector(".data-point");
            telemetry_clone.id = key;
            telemetry_clone.querySelector("h3").innerText = key;
            telemetry_clone.querySelector(".value").innerText = data[i][key];

            if (DATA_UNITS[key] != undefined)
                telemetry_clone.querySelector(".units").innerText = DATA_UNITS[key];

            wrapper_clone.querySelector(".sensor-data").appendChild(telemetry_clone);
        }

        telemetry_wrapper.appendChild(wrapper_clone);
    }
}

/*
 * @brief Reads the 'data.json' file and sends the data back
 *
 * @return Returns the whole file as a string, can be parsed later
 *
 * @note Attempts to read from './data.json' - MAKE SURE THAT FILE EXISTS
 */
async function read_data_json()
{
    const res = await fetch("/data/data.json");
    const data = await res.json();

    //console.log("HI!")
    //console.log(data)

    return data;
}

async function update_data()
{
    const data = await read_data_json();

    if (data.length != node_count)
    {
        halt_update = true;
        return;
    }

    try
    {
        for (let i = 0; i < data.length; ++i)
        {
            let telemetry_wrapper = document.querySelector("#telemetry-" + i)

            for (let key in data[i])
            {
                if (DATA_UNITS[key] == undefined)
                    continue;

                let target = telemetry_wrapper.querySelector("#" + key);
                target.querySelector(".value").innerText = data[i][key];
            }
        }
    }
    catch (error)
    {
        halt_update = true;
        return;
    }
}

function reset_dom()
{
    let targets = document.querySelectorAll(".data-only");

    targets.forEach(target => {
        target.remove();
    })
}

setTimeout(() => {
    setInterval(() => {
        if (!halt_update)
        {
            update_data();
        }
        else
        {
            reset_dom();
            html_setup();
            halt_update = false;
        }
    }, FILE_ACCESS_INTERVAL);
}, setup_time);

html_setup();
