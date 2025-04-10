"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatId] = useState("default-chat");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState("");

  // Log chat history and context changes
  useEffect(() => {
    console.log("Current Chat History:", chatHistory);
  }, [chatHistory]);

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    try {
      setIsLoading(true);
      setCurrentStream("");

      // Add user message to history immediately
      const userMsg = { id: Date.now().toString(), role: "user", content: message };
      setChatHistory(prev => [...prev, userMsg]);

      const requestBody = {
        chatId,
        message: message.trim()
      };

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
              setCurrentStream("");
              setChatHistory(data.history);
              // Save the assistant's response as a note
              const lastMessage = data.history[data.history.length - 1];
              if (lastMessage.role === 'assistant') {
                await fetch("/api/notes", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    chatId,
                    messageId: lastMessage.id
                  }),
                });
              }
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
      <nav className="navbar navbar-expand-lg bg-body-tertiary">
        <div className="container-fluid">

          <a className="navbar-brand" href="#">AITutor</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* To do: user authentication */}
          {/* <div className="col-md-3 text-end">
            <button type="button" className="btn btn-outline-primary me-2">Login</button>
            <button type="button" className="btn btn-primary">Sign-up</button>
          </div> */}

          <Dropdown>
            <Dropdown.Toggle variant="" id="dropdown-basic">
              <Image src="/user.png" alt="mdo" width="32" height="32" className="rounded-circle" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item href="#/action-1">Profile</Dropdown.Item>
              <Dropdown.Item href="#/action-2">Settings</Dropdown.Item>
              <Dropdown.Item href="#/action-3">Sign out</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

        </div>
      </nav>

      {/* Main content */}
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
              {isLoading && currentStream && (
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

          <div className="mt-2 p-2 border rounded shadow">
            <h3>Motion Notes</h3>
          </div>
        </div>
      </div>
    </div>
  );
}