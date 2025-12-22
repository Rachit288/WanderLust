const socketIo = require("socket.io");
const Message = require("./models/message");

let io;

module.exports = {
    init: (httpServer) => {
        io = socketIo(httpServer, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        io.on("connection", (socket) => {
            console.log("Client connected:", socket.id);

            // 1. Join a private room based on User ID
            // The frontend will emit 'join' with the user's ID after login
            socket.on("join_room", (userId) => {
                socket.join(userId);
                console.log(`User ${userId} joined room ${userId}`);
            });

            // 2. Handle Chat Messages 
            socket.on("send_message", async (data) => {
                const { senderId, receiverId, content, senderName } = data;

                try {

                    // 1. Save Message to DB (History)
                    const newMessage = new Message({
                        sender: senderId,
                        recipient: receiverId,
                        content: content
                    })
                    await newMessage.save();

                    // 2. Emit to Receiver (Real-time Bubble)
                    // If they are on the chat screen, this will append the bubble
                    io.to(receiverId).emit("receive_message", newMessage);

                    // 3. Create Notification (The "Bell Icon" Alert)
                    // We notify them so they know they have a message even if they are on the Dashboard
                    const notif = await Notification.create({
                        recipient: receiverId,
                        sender: senderId,
                        type: "NEW_MESSAGE",
                        message: `New message from ${senderName}: ${content.substring(0, 30)}...`,
                        relatedId: senderId,
                        relatedModel: "User"
                    });

                    // Emit notification event (Red Dot)
                    io.to(receiverId).emit("new_notification", notif);
                } catch (error) {
                    console.error("Chat Error:", error);
                }
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected");
            });
        });
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io is not initialized!");
        }
        return io;
    }
}