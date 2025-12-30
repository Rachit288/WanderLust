const socketIo = require("socket.io");
const Message = require("./models/message");
const Notification = require("./models/notification");

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
                // LOGGING: See exactly what arrives
                console.log("📩 Socket received:", data);

                // DESTRUCTURE: Handle both naming conventions just in case
                const { sender, recipient, senderId, receiverId, content, senderName } = data;
                
                // NORMALIZE: Ensure we have the IDs regardless of what frontend sent
                const finalSender = sender || senderId;
                const finalRecipient = recipient || receiverId;

                try {
                    // 1. Save Message to DB
                    const newMessage = new Message({
                        sender: finalSender,
                        recipient: finalRecipient,
                        content: content
                    });
                    
                    const savedMessage = await newMessage.save(); // Wait for save
                    console.log("✅ Message Saved to DB:", savedMessage._id);

                    // 2. Emit to Receiver
                    io.to(finalRecipient).emit("receive_message", savedMessage);

                    // 3. Notification Logic (Keep your existing code here)
                    const Notification = require("./models/notification"); // Ensure this is imported
                    // ... create notification ...

                } catch (error) {
                    console.error("❌ Socket Error:", error.message);
                    console.error(error);
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