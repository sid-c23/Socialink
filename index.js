const express = require('express');
const bodyparser = require('body-parser');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const firebase = require('firebase')
const {google} = require('googleapis');

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_SENDER_ID
};
firebase.initializeApp(config);

const yt = google.youtube({
    version: 'v3',
    auth: process.env.YT_API_KEY
})

const app = express();

app.use(bodyparser.json())

app.get('/search/:q', async (req, res) => {
    const q = req.params.q
    const searchRes = await yt.search.list({
        q: q,
        part: 'snippet',
        maxResults: 10
    })
    let results = searchRes.data.items

    let array = []

    results.forEach( async cRes => {
        let channel = {}
        console.log(cRes)
        channel.id = cRes.snippet.channelId
        channel.thumbnails = cRes.snippet.thumbnails
        channel.title = cRes.snippet.channelTitle
        array = array.concat(channel)
        //const result = getChannel(channelId)
        //console.log(result)
        //array = array.concat(result)

    } )

    //const done = await Promise.all(array)


    return res.json(array)
})

async function getChannel(id) {
    let initialRes = await yt.channels.list({
        part: 'snippet,contentDetails,statistics',
        forUsername: id
    })
    if (initialRes.data.items.length == 0) {
        initialRes = await yt.channels.list({
            part: 'snippet,contentDetails,statistics',
            id: id
        })
    }
    const bioData = initialRes.data.items[0]

    const playlistId = bioData.contentDetails.relatedPlaylists.uploads

    const videoRes = await yt.playlistItems.list({
        playlistId: playlistId,
        part: 'snippet',
        maxResults: 10
    })

    let videoLinks = []
    videoRes.data.items.forEach( item => {
        const videoId = item.snippet.resourceId.videoId
        videoLinks = videoLinks.concat(`https://www.youtube.com/embed/${videoId}`)
    } )

    let snippet = bioData.snippet
    snippet.videoLinks = videoLinks
    snippet.statistics = bioData.statistics

    const channelRef = firebase.database().ref(`/channels/${bioData.id}`);
    channelRef.on("value", (snapshot) => {
        channelRef.set(snippet)

        channelRef.off("value")
    })

    return snippet 

}

app.get('/id/:id', async (req, res) => {
    const id = req.params.id
    const snippet = await getChannel(id)
    res.json(snippet)
})

app.get('/id', (req, res) => {
    const channelRef = firebase.database().ref(`/channels/`);
    channelRef.on("value", snapshot => {
        return res.json(snapshot.val());
    })
})

const server = app.listen(8080, () => {
    console.log("Server started...");
})
