const express = require('express');
const ytdl = require('@distube/ytdl-core');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.set("view engine", "ejs");
app.set("views", "./views");  // Ensuring Express knows where to look for views
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Uncomment this to parse JSON bodies

// Serve the HTML file
app.get('/', (req, res) => {
    res.render('index');  // Ensure 'index.ejs' is placed in the 'views' folder
});

// Endpoint to handle video download
app.post('/download', async (req, res) => {
    const videoUrl = req.body.url;
    if (!ytdl.validateURL(videoUrl)) {
        return res.json({ success: false, error: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);

        // Choose a compatible video format that is not AV1
        const formats = ytdl.filterFormats(info.formats, format => {
            return format.container === 'mp4' && !format.codecs.includes('av01');
        });

        if (!formats.length) {
            throw new Error('No compatible formats found');
        }

        const chosenFormat = formats[0];

        // Generate filename based on video title
        const filename = `${info.videoDetails.title.replace(/[^\w\s]/gi, '_')}.mp4`;
        const filepath = path.join(__dirname, 'downloads', filename);

        // Download video stream with both video and audio
        const videoStream = ytdl(videoUrl, { format: chosenFormat });

        // Pipe video stream to file
        videoStream.pipe(fs.createWriteStream(filepath))
            .on('finish', () => {
                res.json({ success: true, filename: filename });
            })
            .on('error', (err) => {
                console.error('Error downloading video:', err);
                res.json({ success: false, error: 'Error downloading video.' });
            });

    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Endpoint to serve the downloaded file
app.get('/download-file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'downloads', filename);
    res.download(filepath, filename, (err) => {
        if (err) {
            res.status(500).send('Error downloading file.');
        }
    });
});

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
