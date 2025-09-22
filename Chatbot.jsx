import React, { useState } from "react";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to UI
    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    try {
      // Call FastAPI backend
      const res = await fetch(`http://127.0.0.1:8000/chat?message=${encodeURIComponent(input)}`);
      const data = await res.json();

      // Choose how to display response
      let botReply = "";
      if (data.error) {
        botReply = `❌ ${data.error}`;
      } else if (data.ticker) {
        botReply = `📊 ${data.ticker}\nPrice: ${data.price}\nSignal: ${data.signal}\nSupport: ${data.support}\nResistance: ${data.resistance}\n${data.alert ?? ""}`;
      } else if (data.label) {
        botReply = `📝 Sentiment: ${data.label} (score: ${data.score.toFixed(2)})`;
      } else {
        botReply = "🤖 I didn’t understand the response.";
      }

      // Add bot reply to chat
      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: "bot", text: "⚠️ Server error, check backend." }]);
    }

    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 rounded-2xl shadow-md">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 max-w-xs rounded-xl ${
              msg.sender === "user"
                ? "bg-blue-500 text-white self-end ml-auto"
                : "bg-gray-200 text-gray-800 self-start"
            }`}
          >
            {msg.text.split("\n").map((line, j) => (
              <div key={j}>{line}</div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3 flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2 focus:outline-none"
          placeholder="Type a stock ticker or sentiment text..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-xl"
        >
          Send
        </button>
      </div>
    </div>
  );
}
