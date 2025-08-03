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

// Step 1: Load credentials and authorize
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
  } else {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });

    console.log("\n🔗 Open this link in your browser and log in:");
    console.log(authUrl);

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('\n📩 Paste the code from the browser here: ', async (code) => {
      readline.close();
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      console.log('✅ Token saved to', TOKEN_PATH);
      startServer(); // Start the server after auth
    });

    return; // Don't start server yet
  }

  startServer(); // Start the server if token already exists
}

// Step 2: Set up the upload route
function startServer() {
  app.use(express.static('public'));

  app.post('/upload', upload.single('file'), async (req, res) => {
    if (!oAuth2Client) {
      return res.status(500).send('❌ OAuth not initialized');
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

      fs.unlinkSync(filePath); // Remove file after upload
      res.send(`✅ Uploaded: ${response.data.name}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('❌ Upload failed.');
    }
  });

  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// Start everything
authorize();
