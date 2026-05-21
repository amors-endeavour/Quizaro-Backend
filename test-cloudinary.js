const { uploadToCloudinary } = require("./config/cloudinary.js");
const path = require("path");

async function test() {
  console.log("Testing Cloudinary with environment variables:");
  console.log("CLOUD_NAME:", process.env.CLOUD_NAME);
  console.log("API_KEY:", process.env.API_KEY);
  
  // We can try to upload Quizaro.pdf which is in the parent directory
  const filePath = path.join(__dirname, "../Quizaro.pdf");
  console.log("Uploading file:", filePath);
  
  try {
    const url = await uploadToCloudinary(filePath, "test_folder");
    console.log("Uploaded successfully! URL:", url);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
