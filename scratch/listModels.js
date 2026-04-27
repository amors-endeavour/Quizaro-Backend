const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy
    // The SDK doesn't have a direct listModels, but we can try to use the model and see if it works
    // Actually, let's try a different approach.
    console.log("Checking gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("test");
        console.log("gemini-1.5-flash works");
    } catch (e) {
        console.log("gemini-1.5-flash failed:", e.message);
    }

    console.log("Checking gemini-pro...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        await model.generateContent("test");
        console.log("gemini-pro works");
    } catch (e) {
        console.log("gemini-pro failed:", e.message);
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
