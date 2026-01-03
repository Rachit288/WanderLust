const axios = require("axios");

const ML_SERVICE_URL = process.env.PYTHON_SERVICE_URL;

async function getEmbedding(text) {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/get-embedding`, { text });
        return response.data.embedding;
    } catch (error) {
        console.error("⚠️ AI Service Error (Embedding):", error.message);
        return []; // Return empty so the app doesn't crash
    }
}

async function getRecommendations(listingId, userId = null) {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/recommend`, { listing_id: listingId, user_id: userId });
        return response.data.recommendations || [];
    } catch (error) {
        console.error("⚠️ AI Service Error (Recommendations):", error.message);
        return [];
    }
}

async function getPersonalizedRecommendations(historyIds, userId = null) {
    try {
        // Only call Python if we have data
        if (!historyIds || historyIds.length === 0) return [];

        const response = await axios.post(`${ML_SERVICE_URL}/recommend-for-user`, {
            history_ids: historyIds,
            user_id: userId
        });
        return response.data.recommendations || [];
    } catch (error) {
        console.error("⚠️ AI Service Error (User Recs):", error.message);
        return [];
    }
}

module.exports = { getEmbedding, getRecommendations, getPersonalizedRecommendations };