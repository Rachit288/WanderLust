"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react"; // Switched Bot icon to Sparkles for a "Concierge" feel
import axios from "axios";

// Type for chat messages
type Message = {
  id: string;
  sender: "user" | "bot";
  text: string;
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "bot", text: "Welcome to Roam. How may I assist in planning your journey today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Call your Node.js Backend
      const response = await axios.post("http://localhost:5000/api/chat", {
        message: userMsg.text,
        user_id: "guest_user" // Replace with real ID when ready
      });

      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: "bot", 
        text: response.data.reply 
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: "error", sender: "bot", text: "I am currently unable to connect to the concierge service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[500px] bg-white rounded-t-lg rounded-bl-lg shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header - Luxury Style */}
          <div className="bg-deepNavy p-4 flex justify-between items-center text-white border-b-2 border-goldAccent">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-goldAccent">
                 <Sparkles size={16} />
              </div>
              <div>
                  <h3 className="font-serif font-bold tracking-wide text-lg">Concierge</h3>
                  <p className="text-xs text-goldAccent uppercase tracking-widest">Always Available</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:text-goldAccent transition-colors p-1">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-offWhite/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] p-4 text-sm leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-deepNavy text-white rounded-2xl rounded-tr-sm"
                      : "bg-white border border-gray-100 text-deepNavy rounded-2xl rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 text-xs p-3 rounded-2xl rounded-tl-sm text-mutedGrey animate-pulse flex gap-2 items-center">
                    <div className="w-1.5 h-1.5 bg-goldAccent rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-goldAccent rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-goldAccent rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2 items-center bg-offWhite rounded-full border border-gray-200 px-2 py-2 focus-within:border-goldAccent focus-within:ring-1 focus-within:ring-goldAccent transition-all">
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about our curated stays..."
                className="flex-1 text-sm bg-transparent px-3 text-deepNavy placeholder-gray-400 focus:outline-none"
                />
                <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="h-8 w-8 bg-deepNavy text-goldAccent rounded-full flex items-center justify-center hover:bg-goldAccent hover:text-deepNavy transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <Send size={14} />
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button (The Bubble) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 ${
            isOpen 
            ? "bg-white text-deepNavy border-deepNavy" 
            : "bg-deepNavy text-goldAccent border-goldAccent"
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
}