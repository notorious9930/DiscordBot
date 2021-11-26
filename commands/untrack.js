const fs = require('fs');

module.exports = {
    name: "untrack",
    description: "remove channel from the tracked list",
    execute({channel, args}) {
        const main = require("../helperFunctions.js");
        args.shift();

        let search = args
                        .reduce((prevValue, curValue) => prevValue + curValue + " ", "")
                        .trim();
        if (search.length > 0) {
            let channels = loadTrack();
            let originalCount = channels.length;
            channels = channels.filter(item => item["Name"] !== search);
            if (originalCount > channels.length) {
                storeTrack(channels);
                main.post(channel, "Removed " + search);
            } else main.post(channel, "Could not find: " + search);
        } else main.post(channel, "You need to pass a channel name to remove");
    }
}

const storeTrack = (trackArr) => {
    fs.writeFileSync("track.json", JSON.stringify(trackArr));
}

const loadTrack = () => {
    try {
        let data = fs.readFileSync("track.json");
        return JSON.parse(data);
    } catch (e) {
        console.log("Failed to load checked, may be first time running");
        return [];
    }
}