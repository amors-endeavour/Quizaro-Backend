// =====================================================
// CLOUDINARY CONFIGURATION & UPLOAD FUNCTION
// Handles uploading media files to Cloudinary
// =====================================================

const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

dotenv.config();

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});


// =====================================================
// UPLOAD FUNCTION
// Uploads file to Cloudinary and returns secure URL
// =====================================================
const uploadToCloudinary = async (file, folderName) => {

    try {
        // If no file provided → exit
        if (!file) return;

        // Upload file to Cloudinary
        const uploadToCloud = await cloudinary.uploader.upload(file, {
            folder: folderName,
            resource_type: "auto"
        });

        // Get secure URL of uploaded file
        const secureUrl = uploadToCloud.secure_url;

        return secureUrl;

    } catch (error) {
        console.log("Cloudinary Error", error);
    }

};


// =====================================================
// EXPORT FUNCTION
// =====================================================
module.exports = { uploadToCloudinary };