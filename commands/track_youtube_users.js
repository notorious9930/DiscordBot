const fs = require('fs');
const request = require("request");

let checked = [];

module.exports = {
    name: "track",
    description: "get latest videos from a youtuber",
    execute(channel, args) {
        const main = require("../helperFunctions.js");

        //if user passed args to search, join them together for the url
        args.shift();
        let search = args
                        .reduce((prevValue, curValue) => prevValue + curValue + "+", "")
                        .trim();
        search = search.substring(0, search.length - 1);
        console.log("search: '" + search + "'");
        
        if (search.length < 1) {
            main.post(channel, "Need to provide a search");
            return;
        }

        const options = {
            url: "https://www.youtube.com/results?search_query=" + search,
            method: "GET",
            headers: {
                "Accept": "text/html",
                "User-Agent": "Mozilla/5.0 (X11; Linux i586; rv:31.0) Gecko/20100101 Firefox/71.0"
            }
        };

        request(options, (error, response, body) => {
            if (error) {
                console.log(error);
                return;
            }

            const channelRegex = RegExp('\/channel\/([^"]+)');
            const match = body.match(channelRegex);

            let id = match[1];

            const xmlOptions = {
                url: "https://www.youtube.com/feeds/videos.xml?channel_id=" + id,
                method: "GET",
                headers: {
                    "Accept": "text/html",
                    "User-Agent": "Mozilla/5.0 (X11; Linux i586; rv:31.0) Gecko/20100101 Firefox/71.0"
                }
            };

            request(xmlOptions, (error, response, body) => {
                const entryRegex = RegExp("<entry>(.+?)<\/entry>", "si");
                const nameRegex = RegExp("<name>(.+?)<\/name>", "si");
                const mediaRegex = RegExp("media:thumbnail url=[\"'](.+jpg)[\"']", "i");
                let entries = body.match(entryRegex);
                let name = body.match(nameRegex)[1];
                let thumb = entries[1].match(mediaRegex)[1];

                const { RichEmbed } = require("discord.js");
                const embed = new RichEmbed().setColor("#e9f931")

                embed.setThumbnail(thumb).setTitle("Track results (adding to db)").setDescription("Youtube users found from searching " + search);
                embed.addField("Youtuber Name", name).addField("Channel url", "https://www.youtube.com/channel/" + id);
                embed.addField("Feed url", "https://www.youtube.com/feeds/videos.xml?channel_id=" + id);
                main.post(channel, embed);

                addToDb({
                    Name: name,
                    Thumbnail: thumb,
                    Channel: "https://www.youtube.com/channel/" + id,
                    Feed: "https://www.youtube.com/feeds/videos.xml?channel_id=" + id
                });
            });
        });
    },
    getUpdates: (channel) => {
        const main = require("../helperFunctions.js");
        fs.readFile("track.json", (err, data) => {
            if(err) {
                console.log(err);
                return;
            }
            let records = JSON.parse(data);
            records.forEach(record => {
                const options = {
                    url: record.Feed,
                    method: "GET",
                    headers: {
                        "Accept": "text/html",
                        "User-Agent": "Mozilla/5.0 (X11; Linux i586; rv:31.0) Gecko/20100101 Firefox/71.0"
                    }
                };
                request(options, (error, response, body) => {
                    const entryRegex = RegExp("<entry>(.+?)<\/entry>", "sig");
                    const videoRegex = RegExp("yt:video:([^<]+)", "i");
                    const titleRegex = RegExp("title>([^<]+)", "i");
                    const thumbRegex = RegExp("media:thumbnail url=['\"](.+?)['\"]", "i");
    
                    let videos = [];
                    let entries = Array.from(body.matchAll(entryRegex), i => i[1]);
                    entries.forEach(entry => {
                        videos.push({
                            "id": entry.match(videoRegex)[1],
                            "title": entry.match(titleRegex)[1],
                            "thumb": entry.match(thumbRegex)[1],
                        })
                    });

                    if (!checked.includes(videos[0].id)) {
                        main.post(channel, "https://www.youtube.com/watch?v=" + videos[0].id)
                        checked.push(videos[0].id);
                    }
                });
            });
        })
    }
}

const addToDb = (record) => {
    // write the record to db to keep track of posts

    // loadDB and add record then write back to file
    fs.readFile("track.json", (err, data) => {
        if (err) {
            // assume file has not been created yet
            fs.writeFileSync("track.json", JSON.stringify([record]));
            console.log("Created the database");
            return;
        }
        let records = JSON.parse(data);
        if (!records.filter(i => i.Name == record.Name))
            records.push(record);
        fs.writeFileSync("track.json", JSON.stringify(records));
        console.log("Updated the database");
    })
}