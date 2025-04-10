"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

// connecting to simple route 
export default function Home() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatId] = useState("default-chat");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState("");

  // Log chat history changes
  useEffect(() => {
    console.log("Chat history updated:", chatHistory);
  }, [chatHistory]);

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    try {
      setIsLoading(true);
      setCurrentStream("");
      
      // Add user message to history immediately
      const userMsg = { id: Date.now().toString(), role: "user", content: message };
      console.log("Adding user message to history:", userMsg);
      setChatHistory(prev => {
        const newHistory = [...prev, userMsg];
        console.log("Updated history after user message:", newHistory);
        return newHistory;
      });
      
      const requestBody = {
        chatId,
        message: message.trim()
      };

      console.log("Sending request with body:", requestBody);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.done) {
              console.log("Received final response with history:", data.history);
              setChatHistory(data.history);
            } else {
              setCurrentStream(prev => prev + data.content);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
      setMessage("");
    }
  };

  return (
    <div className="">
      <div className="container-fluid">
        <div style={{ gridTemplateColumns: '1fr 1fr' }} className="d-grid gap-3">
          <div style={{ height: '92vh' }} className="mt-2 p-2 border rounded shadow">
            <h3>Chat</h3>
            
            {/* Chat messages display */}
            <div style={{ height: '80%', overflowY: 'auto' }} className="mb-3">
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`p-2 mb-2 ${msg.role === 'user' ? 'bg-light' : 'bg-info bg-opacity-10'}`}>
                  <strong>{msg.role}:</strong> {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="p-2 mb-2 bg-info bg-opacity-10">
                  <strong>assistant:</strong> {currentStream}
                </div>
              )}
            </div>

            <div className="input-group mb-3">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Chat with me here" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={isLoading}
              />
              <button 
                className="btn btn-outline-secondary" 
                type="button" 
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}