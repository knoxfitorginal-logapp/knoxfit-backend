const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 10000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OAuth setup
const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

let token;
try {
  token = JSON.parse(fs.readFileSync('token.json'));
  oAuth2Client.setCredentials(token);
} catch (err) {
  console.error('❌ No token.json found or invalid token. Uploads will not work.');
}

// Upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!oAuth2Client.credentials) {
    return res.status(401).send('Google Drive authorization is not set up.');
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

    fs.unlinkSync(filePath); // Delete uploaded file
    res.send(`✅ Uploaded: ${response.data.name}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Upload failed.');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
