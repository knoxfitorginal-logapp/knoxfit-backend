const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 10000;

// Serve the HTML form from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Load Google API credentials
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const token = JSON.parse(fs.readFileSync('token.json'));

const oAuth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  credentials.installed.redirect_uris[0]
);

oAuth2Client.setCredentials(token);
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const fileMetadata = {
      name: `${Date.now()}_${req.file.originalname}`,
      parents: ['1A21vhVYhDswFUTK0_oX3VO1vdA5TtUsb'], // Your Drive folder ID
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    fs.unlinkSync(req.file.path); // delete temp file
    res.send(`<p>✅ Uploaded successfully!</p><a href="/">Go Back</a>`);
  } catch (err) {
    console.error('❌ Upload Error:', err.message);
    res.status(500).send('❌ Upload failed.');
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
