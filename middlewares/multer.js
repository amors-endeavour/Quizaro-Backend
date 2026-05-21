const multer = require("multer");

const upload = multer({ 
    dest: 'uploads/',
    limits : 10 * 1024 * 1024
})    

// Upload single image for posts
const multMid = upload.single("postImage")

// Upload single image for profile picture
const uploadProfileMidWare = upload.single("profilepic")

// Upload single image for avatar
const uploadAvatarMid = upload.single("avatar")

// Upload single PDF for academic resources
const uploadPDFMid = upload.single("file")

module.exports = { multMid, uploadProfileMidWare, uploadAvatarMid, uploadPDFMid };