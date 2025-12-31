const socketIo = require("socket.io");
const Message = require("./models/message");
const Notification = require("./models/notification");

let io;

module.exports = {
    init: (httpServer) => {
        io = socketIo(httpServer, {
            cors: {
                origin: [process.env.FRONTEND_URL, "http://localhost:3000"],
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['polling', 'websocket']
        });
        io.on("connection", (socket) => {
            const userIdFromQuery = socket.handshake.query.userId;
            
            if (userIdFromQuery && userIdFromQuery !== 'undefined') {
                socket.join(userIdFromQuery);
                console.log(`✅ Client ${socket.id} connected and joined room: ${userIdFromQuery}`);
            } else {
                console.log(`⚠️ Client ${socket.id} connected without a valid userId`);
            }

            socket.on("join_room", (userId) => {
                socket.join(userId);
                console.log(`User ${userId} joined room ${userId}`);
            });

            socket.on("send_message", async (data) => {
                console.log("📩 Socket received:", data);

                const { sender, recipient, senderId, receiverId, content, senderName } = data;

                const finalSender = sender || senderId;
                const finalRecipient = recipient || receiverId;

                if (!finalSender || !finalRecipient) {
                    return console.error("❌ Cannot save message: Missing sender or recipient");
                }

                try {
                    const newMessage = new Message({
                        sender: finalSender,
                        recipient: finalRecipient,
                        content: content
                    });

                    const savedMessage = await newMessage.save();
                    console.log("✅ Message Saved to DB:", savedMessage._id);

                    io.to(finalRecipient).emit("receive_message", savedMessage);

                    const newNotification = new Notification({
                        receiver: finalRecipient,
                        sender: finalSender,
                        message: `New message: ${content.substring(0, 20)}...`,
                        type: 'message',
                        relatedId: savedMessage._id,
                        relatedModel: 'Message'
                    });
                    await newNotification.save();

                    // 4. Emit Notification count/data to receiver
                    io.to(finalRecipient).emit("receive_notification", newNotification);

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