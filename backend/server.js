const express = require('express');
const multer = require('multer');
const fs = require('fs');
const querystring = require('querystring');
var request = require('request');
const Papa = require('papaparse');
//const Excel = require('excel.js');
const { type } = require('os');

const app = express();
app.use(express.json())
const port = 3000
//changed this to 3000 rather than 5000
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
})


app.post('/api/endpoint1', (req, res) => {
    const data = 0.632;
    res.json({result: data});
});


// Landing page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/landing.html'));
});

// Main page route
app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/about.html'));
})

app.get('/about1', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/about.html'));
}) 

app.get('/about2', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/about2.html'));
}) 

app.get('/alt', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/alt.html'));
})

app.get('/loginpage', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});


app.get('/choice', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/choice.html'))
})

// Exit page route
app.get('/exit', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/exit.html'))
});

app.use(express.static(path.join(__dirname, '../frontend')));



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
});

//file io
const upload = multer({ storage: storage});
app.post('/upload', upload.single('fileInput'), (req, res) => {

    if (!req.file) {
        return res.json({success: false, message: 'No file uploaded. '});
    }

    csvFilePath = req.file.path;

    // Convert CSV to JSON using papaparse
    const csvFile = fs.readFileSync(csvFilePath, 'utf8');

    Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const formattedData = results.data.map(row => ({
                name: row.song,
                artist: row.artist,
                energy: row.energy,
                valence: row.valence
            }));

             // Remember to delete the file after processing to save storage space
             fs.unlinkSync(csvFilePath);
             
             res.json({ success: true, message: 'File processed!', data: formattedData });
         }
     });


});

app.post('/multiprocess', async (req, res) => {
    console.log("multiprocess");
    // This is not showing up, at least in the manual upload flow
    const song_list = req.body.song_list;
    const delta_list = req.body.delta_list;
    //process delta_list to features

    console.log(song_list);
    console.log("delta_list + " + delta_list);
    console.log("delta_list.numResults + " + delta_list.numResults);

    for (let i = 0; i < song_list.length; i++) {
        let song = song_list[i];
        var songInfo = await checkSongArtist(token, song.name, song.artist);
        var songId = songInfo.tracks.items[0].id;
        origInfo.song = songInfo.tracks.items[0].name;
        origInfo.artist = songInfo.tracks.items[0].artists[0].name;
        origFeatures = await getFeatures(token, songId);
        var adjFeatures = await adjustFeatures(origFeatures, delta_list);
        var result = await getRecs(token, songId, adjFeatures, delta_list.numResults);
        var reser = await recommendationSnapshot();
    }

    console.log("done multiprocess");
    res.json({success: true});
})


var token;  
const clientID = 'e6f9d062524b4bbc91e48d1f62f5bee7';
const clientSecret = 'aa0701813c2044e8a208361f2b6eb12b';

//post sign in
var redirect_uri = 'http://localhost:5000/callback';


function generateRandomString(length) {
    const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    
    for (let i = 0; i < length; i++) {
        randomString += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
    }
    
    return randomString;
}

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    var scope = 'user-read-private user-read-email';
    
    console.log("i am in /login");
    console.log(redirect_uri);
    res.redirect('https://accounts.spotify.com/authorize?' + 
        querystring.stringify({
            response_type: 'code',
            client_id: clientID,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        })
    );

});

// sign in 
app.get('/callback', function(req, res) {
    console.log("calling back");
    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null) {
        res.redirect('/#' + 
            querystring.stringify({
                error: 'state_mismatch'
            })
        ); 
    } else {
        console.log("starting some authOption shit");
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(clientID + ':' + clientSecret).toString('base64'))
            },
            json: true
        };
        console.log("done setting up auth");

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
      
                var access_token = body.access_token;
                token = access_token;
                var refresh_token = body.refresh_token;
      
                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };
      
                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    res.redirect('/main');
                }) ;
      
                /*
                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                    access_token: access_token,
                    refresh_token: refresh_token
                }));
                */
            } else {
                res.redirect('/main' +
                    querystring.stringify({
                    error: 'invalid_token'
                }));
            }
        });
        console.log("got thru everything");
        

    }
});


const getToken = async () => {

    const result = await fetch(`https://accounts.spotify.com/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',
            'Authorization' : 'Basic ' + btoa(clientID + ':' + clientSecret)
        }, 
        body: 'grant_type=client_credentials'
    });

    const data = await result.json();
    return data.access_token;
}

app.get('/api/getToken', async (req, res) => {
    const token = await getToken();
    res.json(token)
})

const checkSongArtist = async(token, song, artist) => {
    console.log("in check song artist");
    console.log("token: ");
    console.log(token);
    const result = await fetch(`https://api.spotify.com/v1/search?q=track:${song}%20artist:${artist}&type=track&limit=1`, {
        method: 'GET',
        headers: {'Authorization' : `Bearer ${token}`}
    });
    const data = await result.json();
    //check min_pop = 80
    return data;
}

// take in song and artist 
app.post('/api/checkSongArtist', async (req, res) => {
    const song = req.body.song;
    const artist = req.body.artist;
    origInfo.song = song;
    origInfo.artist = artist;
    const songData = await checkSongArtist(token, song, artist);
    res.json(songData);
})

const getFeatures = async (token, songId) => {
    const result = await fetch (`https://api.spotify.com/v1/audio-features/${songId}`, {
        method: 'GET',
        headers: {'Authorization' : `Bearer ${token}`}
    });
    const data = await result.json();
    return data;
}

var tableData = [];

app.post('/api/getFeatures', async (req, res) => {
    const songId = req.body.songId;
    const features = await getFeatures(token, songId);
    res.json(features);
})

const adjustFeatures = (origFeatures, offset) => {
    adjData = {};
    adjData.minEn = parseFloat((Math.max(origFeatures.energy - offset.energy, 0.01)).toFixed(2));
    adjData.maxEn = parseFloat((Math.min(origFeatures.energy + offset.energy, 0.99)).toFixed(2));
    adjData.minVal = parseFloat((Math.max(origFeatures.valence - offset.valence, 0.01)).toFixed(2));
    adjData.maxVal = parseFloat((Math.min(origFeatures.valence + offset.valence, 0.99)).toFixed(2));
    adjData.pop = 80;
// What is this doing? - Dana
    return adjData;
}

app.post('/api/adjustFeatures', async (req, res) => {
    const features = req.body.features;
    const offset = req.body.offset;
    const adjFeatures = adjustFeatures(features, offset);
    res.json(adjFeatures);

})

var recData = {};
var origInfo = {};
const getRecs = async(token, songId1, features, numResults) => {
    console.log("numresults: " + numResults);

    const limit = numResults;

    const seedTracks = [songId1]; // An array of multiple seed track IDs
    const seedTracksString = seedTracks.join(',');

    const apiUrl = `https://api.spotify.com/v1/recommendations?limit=${limit}&seed_tracks=${seedTracksString}&min_popularity=${features.pop}&min_energy=${features.minEn}&max_energy=${features.maxEn}&min_valence=${features.minVal}&max_valence=${features.maxVal}`;

    const result = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Authorization' : `Bearer ${token}`}
    });
    const data = await result.json();
    console.log("getRecs");
    recData = data;
    return data;
}

origFeatures = {}; //eventually encase all orig in single json
app.post('/api/getRecs', async (req, res) => {
    const songId1 = req.body.songId1; //70LcF31zb1H0PyJoS1Sx1r
    const features = req.body.features; //{minEn, maxEn, ..., pop}
    origFeatures = req.body.orig;
    const recs = await getRecs(token, songId1, features, 10);
    res.json(recs);
    recommendationSnapshot();

})


const getRec = async(token, recEndPoint) => {
    const result = await fetch(`${recEndPoint}`, {
        method: 'GET',
        headers: { 'Authorization' : `Bearer ${token}`}
    })

    const data = await result.json();
    return data;
}

app.post('/api/getRec', async (req, res) => {
    const recEndPoint = req.body.recEndPoint;
    const rec = await getRec(token, recEndPoint);
    res.json(rec);
})

const getRecDelta = (origFeatures1, recFeatures) => {
    var origFeatures = {energy: 0, valence: 0}
    origFeatures.energy = (origFeatures1.energy);
    origFeatures.valence = (origFeatures1.valence);

    delta = {};
    delta.energy = recFeatures.energy - origFeatures.energy;
    delta.valence = recFeatures.valence - origFeatures.valence;
    return delta;

}

app.post('/api/getRecDelta', async (req, res) => {
    const origFeatures = req.body.origFeatures;
    const recFeatures = req.body.recFeatures;
    const recDelta = getRecDelta(origFeatures, recFeatures);
    res.json(recDelta)

})


async function createRawData(data) {
    var index = [];
    var songs = [];
    var artists = [];
    var uris = [];
    var energy = [];
    var valence = [];
    var acousticness = [];
    var danceability = [];
    var instrumentalness = [];
    var liveness = [];
    var loudness = [];
    var popularity = [];
    var releasedate = [];
    var speechiness = [];
    var tempo = [];

    

    for (let i = 0; i < data.tracks.length; i++) {
        console.log("SONG===");
        console.log(data.tracks[i]);
        index.push(i+1);
        songs.push(data.tracks[i].name);
        artists.push(data.tracks[i].artists[0].name);
        uris.push(data.tracks[i].href);
        const features = await getFeatures(token, data.tracks[i].id);

        energy.push(features.energy);
        valence.push(features.valence);
        acousticness.push(features.acousticness);
        danceability.push(features.danceability);
        instrumentalness.push(features.instrumentalness);
        liveness.push(features.liveness);
        loudness.push(features.loudness);
        popularity.push(data.tracks[i].popularity);
        releasedate.push(data.tracks[i].album.release_date);
        speechiness.push(features.speechiness);
        tempo.push(features.tempo);

        
    }

    //actual table
    const raw_data = [];
    //0
    raw_data.push({
        origSong: origInfo.song,
        origArtist: origInfo.artist,
        recNumber: 0,
        uri: 0,
        song: origInfo.song,
        artist: origInfo.artist,
        energy: origFeatures.energy,
        valence: origFeatures.valence,
        acousticness: origFeatures.acousticness,
        danceability: origFeatures.danceability,
        instrumentalness: origFeatures.instrumentalness,
        liveness: origFeatures.liveness,
        loudness: origFeatures.loudness,
        popularity: origFeatures.popularity,
        releasedate: origFeatures.releasedate,
        speechiness: origFeatures.speechiness,
        tempo: origFeatures.tempo,
    })
    for (let i = 0; i < data.tracks.length; i++) {
        api_url = data.tracks[i].href;
        let embed_url = api_url.replace("https://api.spotify.com/v1/tracks", "https://open.spotify.com/embed/track");

        raw_data.push({
            origSong: origInfo.song,
            origArtist: origInfo.artist,
            recNumber: index[i],
            song: data.tracks[i].name,
            artist: data.tracks[i].artists[0].name,
            uri: embed_url,
            energy: energy[i],
            valence: valence[i],
            acousticness: acousticness[i],
            danceability: danceability[i],
            instrumentalness: instrumentalness[i],
            liveness: liveness[i],
            loudness: loudness[i],
            popularity: popularity[i],
            releasedate: releasedate[i],
            speechiness: speechiness[i],
            tempo: tempo[i],
            
        });
    }

    return raw_data;
}

async function recommendationSnapshot() {
    console.log("snapshotting");
    const raw_data = await createRawData(recData);
    const data = Papa.unparse(raw_data);
    tableData.push(raw_data);
}

// generate csv
app.get('/generate-and-download/csv', async (req, res) => {
    // Example data
    console.log("generate-download");
    /*const raw_data = [
        {song: "grenade", artist: "bruno mars", energy: 64.8, valence: 63.9}
    ];*/

    const raw_data = await createRawData(recData);
    const data = Papa.unparse(raw_data);

    const csvFileName = `data-${Date.now()}.csv`;
    const csvFilePath = path.join(__dirname, csvFileName);

    fs.writeFileSync(csvFilePath, data);

    res.download(csvFilePath, csvFileName, (err) => {
        if (err) {
            console.error('Error:', err);
            res.status(500).send("Couldn't download the CSV");
        } else {
            fs.unlinkSync(csvFilePath); // Delete the file after sending to the user
        }
    });
});

app.get('/sample-download/csv', async(req, res) => {
    console.log("sample donwload");
    const csvFileName = 'sample_input.csv';
    const csvFilePath = path.join(__dirname, csvFileName)
    
    res.download(csvFilePath, csvFileName, (err) => {
        if (err) {
            console.error('Error:', err);
            res.status(500).send("Couldn't download the CSV");
        } 
    });
})



// generate csv
app.get('/end-download/csv', async (req, res) => {

//put in this format: https://open.spotify.com/embed/track/6lanRgr6wXibZr8KgzXxBl
//download playlist spreadsheet somewhere else different butoon

    console.log("/end-download/csv");
    var flattenedData = tableData.flat();
    const data = Papa.unparse(flattenedData);
    const csvFilename = `data-${Date.now()}.csv`;
    const csvFilePath = path.join(__dirname, csvFilename);

    fs.writeFileSync(csvFilePath, data);

    res.download(csvFilePath, csvFilename, (err) => {
        if (err) {
            console.error('Error:', err);
            res.status(500).send("Couldn't download the CSV");
        } else {
            fs.unlinkSync(csvFilePath); // Delete the file after sending to the user
        }
    });
});


//UNUSED
app.post('/download/csv', async (req, res) => {
    const Papa = require('papaparse');

    //const data = req.data;
    const data = [
        {song: "grenade", artist: "bruno mars", energy: 64.8, valence: 63.9}
    ];

    const csv = Papa.unparse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=data.csv');
    res.send(csv);

    /*
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("sheet 1");

    worksheet.columns = [
        {header: 'Song', key: 'song', width: 10},
        {header: 'Artist', key: 'artist', width: 10},
        {header: 'Energy', key: 'energy', width: 10},
        {header: 'Valence', key: 'valence', width: 10},
    ]

    data.forEach(e => {
        worksheet.addRow(e);
    });
    
    await workbook.xlsx.writeFile('filename.xlsx');
    */

})

const init = async() => {
    token = await getToken();
    console.log("console logging: ")
    console.log(token)
};

init()
