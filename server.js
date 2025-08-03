const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000;

// === 1. Serve HTML files ===
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === 2. Setup multer for file uploads ===
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// === 3. Google Drive OAuth2 Setup ===
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const TOKEN_PATH = 'token.json';
oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// === 4. Upload Route ===
app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const fileMetadata = {
    name: req.file.filename,
    parents: ['YOUR_DRIVE_FOLDER_ID'] // Replace with actual folder ID
  };
  const media = {
    mimeType: req.file.mimetype,
    body: fs.createReadStream(filePath)
  };

  try {
    await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });
    res.send(`✅ Uploaded: ${req.file.originalname}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('❌ Failed to upload file');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 10000;

// === 1. Serve HTML files ===
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === 2. Setup multer for file uploads ===
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// === 3. Google Drive OAuth2 Setup ===
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const TOKEN_PATH = 'token.json';
oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// === 4. Upload Route ===
app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const fileMetadata = {
    name: req.file.filename,
    parents: ['YOUR_DRIVE_FOLDER_ID'] // Replace with actual folder ID
  };
  const media = {
    mimeType: req.file.mimetype,
    body: fs.createReadStream(filePath)
  };

  try {
    await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });
    res.send(`✅ Uploaded: ${req.file.originalname}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('❌ Failed to upload file');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
