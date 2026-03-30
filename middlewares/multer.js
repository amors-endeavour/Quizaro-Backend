// Import multer for handling file uploads
import multer from "multer";

// Configure multer storage
const upload = multer({ 
    dest: 'uploads/',  // Folder where uploaded files will be stored
    limits : 10 * 1024 * 1024     // Max file size = 10MB
})    

// =====================================================
// MIDDLEWARES FOR FILE UPLOAD
// =====================================================

// Upload single image for posts
// Field name should be "postImage"
const multMid = upload.single("postImage")

// Upload single image for profile picture
// Field name should be "profilepic"
const uploadProfileMidWare = upload.single("profilepic")

// =====================================================
// EXPORT MIDDLEWARES
// =====================================================
export { multMid, uploadProfileMidWare };