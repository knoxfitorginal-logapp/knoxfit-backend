const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const app = express();

// Load OAuth2 credentials
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_secret, client_id, redirect_uris } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Load token from file
const tokenPath = path.join(__dirname, 'token.json');
if (fs.existsSync(tokenPath)) {
  const token = JSON.parse(fs.readFileSync(tokenPath));
  oAuth2Client.setCredentials(token);
} else {
  console.error('❌ token.json not found. Authorize locally and upload the token file.');
  process.exit(1);
}

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Serve static files from public/
app.use(express.static('public'));

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  const filePath = req.file.path;
  const fileName = `${Date.now()}_${req.file.originalname}`;
  const folderId = '1A21vhVYhDswFUTK0_oX3VO1vdA5TtUsb';

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId], // Upload into your Drive folder
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });

    fs.unlinkSync(filePath); // delete local file after upload
    res.send(`✅ Uploaded: ${fileName}`);
  } catch (err) {
    console.error('❌ Upload failed:', err);
    res.status(500).send('❌ Upload failed');
  }
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use dynamic port for Render or fallback to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

