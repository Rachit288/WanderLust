const Message = require("../../models/message");
const User = require("../../models/user");

module.exports.getConversations = async (req, res) => {
    try {
        const currentUserId = req.user._id;

        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { recipient: currentUserId }]
        }).sort({ createdAt: -1 }).populate("sender recipient", "username");

        const usersSet = new Set();
        const conversations = [];

        messages.forEach(msg => {
            const otherUser = msg.sender._id.equals(currentUserId) ? msg.recipient : msg.sender;

            if (!usersSet.has(otherUser._id.toString())) {
                usersSet.add(otherUser._id.toString());
                conversations.push({
                    user: otherUser,
                    lastMessage: msg.content,
                    timestamp: msg.createdAt
                })
            }
        })
        res.status(200).json(conversations);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
}

module.exports.getChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sender: myId, recipient: userId },
                { sender: userId, recipient: myId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch history" });
    }
}