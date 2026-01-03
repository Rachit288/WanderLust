const socketIo = require("socket.io");
const Message = require("./models/message");
const Notification = require("./models/notification");
const mongoose = require("mongoose");

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

            if (mongoose.Types.ObjectId.isValid(userIdFromQuery)) {
                socket.join(userIdFromQuery);
                console.log(`✅ Client ${socket.id} connected and joined room ${userIdFromQuery}`);
            } else {
                console.log(`⚠️ Client ${socket.id} connected without a valid userId`);
            }

            socket.on("join_room", (userId) => {
                socket.join(userId);
                console.log(`User ${userId} joined room ${userId}`);
            });

            socket.on("send_message", async ({ sender, recipient, content }) => {
                console.log("📩 Socket received:", { sender, recipient, content });

                if (!mongoose.Types.ObjectId.isValid(sender) || !mongoose.Types.ObjectId.isValid(recipient) || !content) {
                    return console.error("❌ Invalid message payload");
                }

                try {
                    const savedMessage = await Message.create({
                        sender,
                        recipient,
                        content
                    });

                    console.log("✅ Message Saved to DB:", savedMessage._id);

                    io.to(recipient).emit("receive_message", savedMessage);

                    const newNotification = await Notification.create({
                        recipient,
                        sender,
                        message: `New message: ${content.substring(0, 20)}...`,
                        type: 'NEW_MESSAGE',
                        relatedId: savedMessage._id,
                        relatedModel: 'Message'
                    });

                    // 4. Emit Notification count/data to receiver
                    io.to(recipient).emit("receive_notification", newNotification);

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