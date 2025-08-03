const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('public'));

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client,
});

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload route
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const filePath = path.join(__dirname, 'uploads', req.file.filename);
  const fileMetadata = {
    name: req.file.filename,
    parents: ['1A21vhVYhDswFUTK0_oX3VO1vdA5TtUsb'], // ✅ Your folder ID
  };
  const media = {
    mimeType: req.file.mimetype,
    body: fs.createReadStream(filePath),
  };

  try {
    await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });
    fs.unlinkSync(filePath); // optional: delete after upload
    res.send(`✅ Uploaded: ${req.file.filename}`);
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).send('❌ Upload failed');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
