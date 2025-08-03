const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('public')); // ✅ Serves index.html from public/

// Storage configuration
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Google Auth
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
const token = JSON.parse(fs.readFileSync('token.json'));
oAuth2Client.setCredentials(token);

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Handle upload
app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  const fileMetadata = {
    name: req.file.filename,
  };
  const media = {
    mimeType: req.file.mimetype,
    body: fs.createReadStream(filePath),
  };
  try {
    await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    res.send(`✅ Uploaded: ${req.file.originalname}`);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('❌ Upload failed');
  }
});

// ✅ Fallback to index.html if route is not found
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
