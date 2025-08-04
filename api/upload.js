import { google } from 'googleapis';
import multer from 'multer';
import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();

// Middleware to handle file upload
const upload = multer({ dest: '/tmp/' });

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Vercel requires async function as handler
export default async function handler(req, res) {
  if (req.method === 'POST') {
    upload.single('image')(req, res, async function (err) {
      if (err) return res.status(500).send('File upload error');

      const filePath = req.file.path;
      const fileMetadata = {
        name: `${Date.now()}_${req.file.originalname}`,
        parents: [DRIVE_FOLDER_ID],
      };
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(filePath),
      };

      try {
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id',
        });

        fs.unlinkSync(filePath); // Clean temp file
        return res.status(200).json({ success: true, fileId: response.data.id });
      } catch (uploadErr) {
        console.error('Google Drive Upload Error:', uploadErr);
        return res.status(500).send('Google Drive upload failed');
      }
    });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
