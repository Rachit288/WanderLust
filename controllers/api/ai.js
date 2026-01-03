const axios = require('axios');

// Configure your Python Service URL (usually port 8000)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL;
1
module.exports.chat = async (req, res) => {
    try {
        const { message, listing_id = null } = req.body;

        const userId = req.user ? req.user._id.toString() : null;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }
        const response = await axios.post(`${PYTHON_SERVICE_URL}/chat`, {
            message,
            user_id: userId,
            listing_id: listing_id
        });

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