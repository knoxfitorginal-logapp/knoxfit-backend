import formidable from 'formidable';
import fs from 'fs';
import { google } from 'googleapis';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  const form = new formidable.IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ message: 'Form parsing error' });
    }

    const email = fields.email;
    const dietImage = files.dietImage?.[0];
    const workoutImage = files.workoutImage?.[0];

    if (!email || !dietImage || !workoutImage) {
      return res.status(400).json({ message: 'Missing email or files' });
    }

    // Initialize Google Drive auth
    const auth = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    auth.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

    const drive = google.drive({ version: 'v3', auth });

    // Step 1: Check if folder for email already exists
    let folderId;
    try {
      const folderRes = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${email}' and '${process.env.DRIVE_FOLDER_ID}' in parents and trashed = false`,
        fields: 'files(id, name)',
      });

      if (folderRes.data.files.length > 0) {
        folderId = folderRes.data.files[0].id;
      } else {
        const folder = await drive.files.create({
          requestBody: {
            name: email,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [process.env.DRIVE_FOLDER_ID],
          },
          fields: 'id',
        });
        folderId = folder.data.id;
      }
    } catch (err) {
      console.error('Folder check/create error:', err);
      return res.status(500).json({ message: 'Google Drive folder error' });
    }

    const uploadToDrive = async (file, name) => {
      const fileMetadata = {
        name,
        parents: [folderId],
      };
      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.filepath),
      };

      return await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });
    };

    try {
      await uploadToDrive(dietImage, `diet_${Date.now()}.jpg`);
      await uploadToDrive(workoutImage, `workout_${Date.now()}.jpg`);
      return res.status(200).json({ message: '✅ Upload successful' });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ message: 'File upload failed' });
    }
  });
}
