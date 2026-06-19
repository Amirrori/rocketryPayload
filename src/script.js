// gauge elements
var gauges = document.querySelectorAll(".gauge");
var opts = {
    angle: -0.2, // The span of the gauge arc
    lineWidth: 0.2, // The line thickness
    radiusScale: 1, // Relative radius
    pointer: {
        length: 0.6, // // Relative to gauge radius
        strokeWidth: 0.055, // The thickness
        color: '#cdcdcd' // Fill color
    },
    limitMax: false,     // If false, max value increases automatically if value > maxValue
    limitMin: true,     // If true, the min value of the gauge will be fixed
    colorStart: '#6FADCF',   // Colors
    colorStop: '#8FC0DA',    // just experiment with them
    strokeColor: '#E0E0E0',  // to see which ones work best for you
    generateGradient: true,
    highDpiSupport: true,     // High resolution support
    staticZones: [
        {strokeStyle: "#F03E3E", min: 0, max: 330}, // Red from 100 to 130
        {strokeStyle: "#FFDD00", min: 330, max: 850}, // Yellow
        {strokeStyle: "#30B32D", min: 850, max: 2220}, // Green
        {strokeStyle: "#FFDD00", min: 2220, max: 2660}, // Yellow
        {strokeStyle: "#F03E3E", min: 2660, max: 3000}  // Red
    ],
};

gauges.forEach(gauge => {
    var new_gauge = new Gauge(gauge).setOptions(opts); // create sexy gauge!
    new_gauge.maxValue = 3000; // set max gauge value
    new_gauge.setMinValue(0);  // Prefer setter over gauge.minValue = 0
    new_gauge.animationSpeed = 16; // set animation speed (32 is default value)
    new_gauge.set(1475); // set actual value
})
