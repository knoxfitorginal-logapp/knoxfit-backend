const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files (index.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Google Drive API setup
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'client_secret.json';
const DRIVE_FOLDER_ID = '1A21vhVYhDswFUTK0_oX3VO1vdA5TtUsb';

// Authorize Google Drive
function authorize() {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);

    return oAuth2Client;
}

// Upload a file to Google Drive
async function uploadFile(auth, filePath, fileName, mimeType) {
    const drive = google.drive({ version: 'v3', auth });
    const fileMetadata = {
        name: fileName,
        parents: [DRIVE_FOLDER_ID],
    };
    const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
    };
    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
    });
    return file.data.id;
}

// Upload route
app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const auth = authorize();
    const filePath = req.file.path;
    const fileName = `${Date.now()}_${req.file.originalname}`;
    const mimeType = req.file.mimetype;

    try {
        await uploadFile(auth, filePath, fileName, mimeType);
        fs.unlinkSync(filePath); // Delete local copy
        res.json({ success: true, message: 'File uploaded successfully to Google Drive' });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
});

// API to list files
app.get('/api/files', async (req, res) => {
    try {
        const auth = authorize();
        const drive = google.drive({ version: 'v3', auth });

        const response = await drive.files.list({
            q: `'${DRIVE_FOLDER_ID}' in parents and trashed=false`,
            fields: 'files(id, name, createdTime, size)',
            orderBy: 'createdTime desc',
            pageSize: 20,
        });

        res.json({ success: true, files: response.data.files });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch file list' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
