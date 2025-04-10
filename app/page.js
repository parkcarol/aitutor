'use client'

import MotionPage from "./motion/page";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Dropdown from "react-bootstrap/Dropdown";

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatId] = useState("default-chat");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState("");
  const [notes, setNotes] = useState([])
  const chatEndRef = useRef(null)

  // Log chat history and context changes
  useEffect(() => {
    console.log("Current Chat History:", chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

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

  const addNote = (note) => {
    setNotes((prev) => [...prev, note])
  }

  const deleteNote = (index) => {
    setNotes((prev) =>
      prev.filter((_, i) => i !== index))
  }

  const getLastUserInput = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (chatHistory[i].role === 'user') {
        return chatHistory[i].content;
      }
    }
    return "Unknown";
  }

  return (
    <div>

      {/* Navbar */}
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
            <Dropdown.Toggle variant="" id="dropdown-basic" className="opacity-50">
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

      {/* Main Content */}
      <div className="container-fluid">
        <div style={{ gridTemplateColumns: '1fr 1fr' }} className="d-flex flex-row gap-3">

          {/* Left Section */}
          <div style={{ height: '92vh', backgroundColor: '#DADADA', borderRadius: '10px' }} className="d-flex flex-column justify-content-between w-50 mt-2 p-2 border shadow">
            <h4 className="pb-2 border-bottom">Chat</h4>

            <div style={{ height: '80vh' }} className="overflow-auto mb-3">
              {chatHistory.map((msg, index) => (
                <div key={msg.id} className={`p-2 mb-2 ${msg.role === 'user' ? 'bg-light' : 'bg-info bg-opacity-10'}`}>
                  <strong>{msg.role}:</strong> {msg.content}
                  {msg.role === 'assistant' && (
                    <div className="mt-2">
                      <button
                        style={{ backgroundColor: '#EEC643', borderRadius: '10px' }}
                        className="btn btn-sm text-white"
                        onClick={() => addNote({ question: getLastUserInput(index), answer: msg.content })}
                      >
                        Save to Notes
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
              {isLoading && currentStream && (
                <div className="p-2 mb-2 bg-info bg-opacity-10">
                  <strong>assistant:</strong> {currentStream}
                </div>
              )}
            </div>

            <div style={{ borderRadius: '10px' }} className="input-group mb-3 p-1 bg-white">
              <input
                type="text"
                style={{ border: '0px', borderRadius: '10px' }}
                className="form-control p-2"
                placeholder="Chat with me here"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={isLoading}
              />
              <button
                style={{ color: 'white', backgroundColor: '#0D21A1', borderRadius: '10px' }}
                className="btn"
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? "..." : ">"}
              </button>
            </div>

          </div>

          {/* Right Section */}
          <div style={{ backgroundColor: '#F2E6C9', borderRadius: '10px' }} className="d-flex flex-column w-50 mt-2 p-2 border rounded shadow">
            <h4 className="pb-2 border-bottom">Motion Notes</h4>
            <MotionPage notes={notes} deleteNote={deleteNote} />
          </div>

        </div>
      </div>
    </div >
  );
}