import fs from 'fs';
import multer from 'multer';
import { google } from 'googleapis';
import nextConnect from 'next-connect';

const upload = multer({ dest: '/tmp' });

const handler = nextConnect()
  .use(upload.single('file'))
  .post(async (req, res) => {
    try {
      const credentials = JSON.parse(process.env.CLIENT_SECRET);
      const token = JSON.parse(process.env.TOKEN);
      const { client_id, client_secret, redirect_uris } = credentials.installed;

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );
      oAuth2Client.setCredentials(token);

      const drive = google.drive({ version: 'v3', auth: oAuth2Client });

      const fileMetadata = {
        name: `${Date.now()}_${req.file.originalname}`,
        parents: ['1A21vhVYhDswFUTK0_oX3VO1vdA5TtUsb'], // ✅ Your Drive folder ID
      };

      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      fs.unlinkSync(req.file.path);

      res.status(200).json({ success: true, id: response.data.id });
    } catch (error) {
      console.error('Upload error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
