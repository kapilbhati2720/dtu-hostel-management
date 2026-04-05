const { GoogleGenerativeAI } = require("@google/generative-ai");
const pool = require('../db'); 

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define Models
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // For text generation
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// --- FEATURE 1: GENERATION & TRIAGE (Admin Features) ---
const generateGrievance = async (scenario) => {
    try {
        const prompt = `
            You are a B.Tech student at Delhi Technological University (DTU). Write a formal grievance based on: "${scenario}".
            Keep it polite and concise. Do not add subject lines or placeholders like [Name]. Just the body text.
        `;
        const result = await textModel.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        console.error("AI Generation Error:", err);
        return "Error generating text.";
    }
};

const triageGrievance = async (grievanceText) => {
    try {
        const prompt = `
            Analyze this grievance: "${grievanceText}".
            Return ONLY a JSON object (no markdown) with keys: "category" (Academic, Hostel, Administration, Library, Accounts, Other), "severity" (Low, Medium, High, Critical), and "reasoning" (1 sentence).
        `;
        const result = await textModel.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (err) {
        console.error("AI Triage Error:", err);
        return { category: "Other", severity: "Medium", reasoning: "AI Analysis Failed" };
    }
};

// --- FEATURE 2: EMBEDDINGS (Smart De-Duplication) ---

// 1. Generate Embedding (Text -> Numbers)
const generateEmbedding = async (text) => {
    try {
        if (!text) return null;
        // Clean text to avoid token limits or empty strings
        const cleanText = text.replace(/\n/g, " ").slice(0, 8000); 
        const result = await embeddingModel.embedContent(cleanText);
        return result.embedding.values; 
    } catch (err) {
        console.error("Gemini Embedding Error:", err);
        return null; 
    }
};

// 2. Cosine Similarity (The Math)
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// 3. Find Similar Grievances (In-Memory Search)
const findSimilarGrievances = async (newText) => {
    const newVector = await generateEmbedding(newText);
    if (!newVector) return [];

    // Fetch ONLY active grievances
    const res = await pool.query(`
        SELECT ticket_id, title, description, embedding, status 
        FROM grievances 
        WHERE status IN ('Submitted', 'Open', 'In Progress') 
        AND embedding IS NOT NULL
    `);

    if (res.rows.length === 0) return [];

    const matches = res.rows.map(row => {
        // Postgres float8[] comes back as an array of numbers automatically
        const dbVector = row.embedding; 
        const similarity = cosineSimilarity(newVector, dbVector);
        return { 
            ticket_id: row.ticket_id, 
            title: row.title, 
            status: row.status, 
            similarity 
        };
    });

    // Return top 3 matches with > 75% similarity
    return matches
        .filter(match => match.similarity > 0.75)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
};

// Export ALL functions
module.exports = { 
    generateGrievance, 
    triageGrievance, 
    generateEmbedding, 
    findSimilarGrievances 
};