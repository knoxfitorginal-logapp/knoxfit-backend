const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

const CREDENTIALS_PATH = 'client_secret.json';
const TOKEN_PATH = 'token.json';

let oAuth2Client;

// Load credentials and token
function authorizeWithSavedToken() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);
}

authorizeWithSavedToken(); // ✅ Skip prompt and just load saved token

app.use(express.static('public'));

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!oAuth2Client) {
    return res.status(500).send('OAuth client not initialized');
  }

  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  const filePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    const fileMetadata = { name: originalName };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name'
    });

    fs.unlinkSync(filePath); // Delete uploaded file after sending
    res.send(`✅ Uploaded: ${response.data.name}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Upload failed.');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
