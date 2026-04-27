const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const pdf = require("pdf-parse");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.extractQuestions = async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ message: "File URL is required" });

    // 1. Fetch PDF Buffer
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    // 2. Extract Text
    const data = await pdf(buffer);
    const rawText = data.text;

    if (!rawText || rawText.trim().length < 50) {
        return res.status(400).json({ message: "Unable to extract sufficient text from PDF. Ensure it is not an image-only scan." });
    }

    // 3. Prompt Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      You are an expert academic examiner. Extract all Multiple Choice Questions (MCQs) from the following text and return them strictly in JSON format.
      
      Format:
      [
        {
          "questionText": "Question string",
          "options": [{"text": "Option 1"}, {"text": "Option 2"}, {"text": "Option 3"}, {"text": "Option 4"}],
          "correctOption": 0, // Index of correct option (0-3)
          "explanation": "Brief explanation"
        }
      ]

      Rules:
      1. If the correct answer is not explicitly stated, use your best knowledge to determine it.
      2. Ensure the JSON is valid and can be parsed.
      3. Do not include any text other than the JSON array.

      Text:
      ${rawText}
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();
    
    // Clean JSON response (sometimes Gemini adds ```json tags)
    const cleanedJson = aiResponse.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleanedJson);

    res.json(questions);

  } catch (err) {
    console.error("AI Extraction Error:", err);
    res.status(500).json({ message: "AI Intelligence Engine failed to synthesize questions. Verify your PDF quality and API configuration." });
  }
};
