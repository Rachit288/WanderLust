const axios = require('axios');

// Configure your Python Service URL (usually port 8000)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

module.exports.chat = async (req, res) => {
    try {
        const { message, page_context = "general", listing_id = null } = req.body;

        // 1. Validation
        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        // 2. Forward to Python AI Service
        // We pass the data exactly how main.py (FastAPI) expects it: 
        // { message, page_context, listing_id }
        const response = await axios.post(`${PYTHON_SERVICE_URL}/chat`, {
            message,
            page_context,
            listing_id
        });

        // 3. Return AI Response to Frontend
        // The Python service returns { "response": "..." }
        res.json(response.data);

    } catch (err) {
        console.error("❌ AI Chat Error:", err.message);
        
        // Handle Python Service Down
        if (err.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                response: "I'm having trouble connecting to my brain right now. Please try again in a moment." 
            });
        }

        res.status(500).json({ message: "Failed to chat with AI" });
    }
};