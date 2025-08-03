const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// Load client secrets from environment variable (Render safe)
const CREDENTIALS = JSON.parse(fs.readFileSync('client_secret.json'));
const TOKEN = JSON.parse(fs.readFileSync('token.json'));

// Set up OAuth2 client
const { client_secret, client_id, redirect_uris } = CREDENTIALS.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(TOKEN);

// Set up Google Drive API
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Set up storage and multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${timestamp}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Serve static files from /public
app.use(express.static('public'));

// ✅ Route: Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Route: Handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const email = req.body.email;

    const response = await drive.files.create({
      requestBody: {
        name: req.file.filename,
        parents: ['1A21vhVYhDswFUTK0_oX3VO1vdA5TtUsb'] // Replace with your folder ID
      },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(filePath)
      }
    });

    // Get public URL (optional)
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const fileUrl = `https://drive.google.com/uc?id=${response.data.id}`;

    res.json({ success: true, filename: req.file.filename, fileUrl });

    // Optional: delete local file
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
