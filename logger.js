module.exports = function () {
    const fs = require('fs'); //ISC license https://opensource.org/licenses/ISC
    const logFile = "./logs/frog_cake_lite" + dString() + ".txt";
    let logToFile = fs.createWriteStream(logFile, {
        flags: 'w+'
    })

    function dString() {
        let d = new Date();
        let secs = addZero(d.getSeconds().toString())
        let minu = addZero(d.getMinutes().toString())
        let hour = addZero(d.getHours().toString())
        let days = addZero(d.getDate().toString())
        let mont = addZero((d.getMonth() + 1).toString())
        function addZero(time) {
            if (time.length === 1) return `0${time}`
            else return time;
        }
        let string = `${d.getFullYear()}-${mont}-${days}-${hour}-${minu}-${secs}`;
        return string;
    }

    let oldLog = console.log;

    console.log = function (message, new_line) {
        message = `${dString()} - ${message}`;
        if (new_line) message = `\n${message}`
        oldLog(message)
        logToFile.write(message + '\n');
    }
}