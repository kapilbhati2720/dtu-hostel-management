const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config(); // Load environment variables

// 1. Configure Cloudinary with your keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Storage Settings
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dtu-grievances', // This folder will be created automatically in your Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
    // resource_type: 'auto' // Uncomment if you plan to upload videos later
  },
});

// 3. Create the upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max file size
});

module.exports = upload;