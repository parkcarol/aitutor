'use client'

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Dropdown from "react-bootstrap/Dropdown";
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaEdit, FaCheck, FaTimes, FaGripVertical, FaSyncAlt, FaArrowRight } from 'react-icons/fa';

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatId] = useState("default-chat");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState("");
  const [notes, setNotes] = useState([]);
  const [sections, setSections] = useState([
    { id: 'default', title: 'General Notes', order: 0 }
  ]);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const chatEndRef = useRef(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAddingSectionMode, setIsAddingSectionMode] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

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

            // if data is done, then adds to chat history 
            // and then sends that snippet to the notes 
            // instead sending the last xx messages to notes every time and then getting a separate call made

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

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSection = {
      id: Date.now().toString(),
      title: newSectionTitle,
      order: sections.length
    };
    setSections(prev => [...prev, newSection]);
    setNewSectionTitle('');
    setIsAddingSectionMode(false);
  };

  const updateSectionTitle = (sectionId, newTitle) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, title: newTitle } : section
    ));
    setEditingSectionId(null);
  };

  const deleteSection = (sectionId) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
    // Move notes from deleted section to default section
    setNotes(prev => prev.map(note => 
      note.sectionId === sectionId ? { ...note, sectionId: 'default' } : note
    ));
  };

  const addNote = (note, sectionId = 'default') => {
    const newNote = {
      id: Date.now().toString(),
      ...note,
      sectionId,
      timestamp: Date.now()
    };
    setNotes(prev => [...prev, newNote]);
  };

  const deleteNote = (noteId) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const moveNote = (noteId, targetSectionId) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId ? { ...note, sectionId: targetSectionId } : note
    ));
  };

  // Group notes by section
  const notesBySection = notes.reduce((acc, note) => {
    const sectionId = note.sectionId || 'default';
    if (!acc[sectionId]) acc[sectionId] = [];
    acc[sectionId].push(note);
    return acc;
  }, {});

  const getLastUserInput = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (chatHistory[i].role === 'user') {
        return chatHistory[i].content;
      }
    }
    return "Unknown";
  }

  const editNote = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setEditingNoteId(noteId);
      setEditingNoteContent(note.answer || note.content);
    }
  };

  const saveNoteEdit = (noteId) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, answer: editingNoteContent, content: editingNoteContent }
        : note
    ));
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDragStart = (e, note, fromSectionId) => {
    e.stopPropagation(); // Prevent section drag when dragging note
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'note',
      noteId: note.id,
      fromSectionId
    }));
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    // Reset opacity
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    // Necessary to allow dropping
    e.preventDefault();
    e.stopPropagation();
    // Add visual feedback for drop target
    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Remove visual feedback
    e.currentTarget.style.backgroundColor = '';
  };

  const handleDrop = (e, toSectionId) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.backgroundColor = '';

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (!data || !data.type) return;

      if (data.type === 'note') {
        const { noteId, fromSectionId } = data;
        if (fromSectionId !== toSectionId) {
          moveNote(noteId, toSectionId);
        }
      }
    } catch (error) {
      console.error('Error during note drop:', error);
    }
  };

  const handleSectionDragStart = (e, sectionId) => {
    if (sectionId === 'default') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'section',
      sectionId
    }));
    e.currentTarget.style.opacity = '0.4';
  };

  const handleSectionDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    // Clean up any remaining drop indicators
    document.querySelectorAll('.section-drop-indicator').forEach(el => {
      el.style.borderTop = '';
      el.style.borderBottom = '';
    });
  };

  const handleSectionDragOver = (e, targetSectionId) => {
    e.preventDefault();
    e.stopPropagation();

    const dropZone = e.currentTarget;
    const rect = dropZone.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    // Remove existing indicators
    document.querySelectorAll('.section-drop-indicator').forEach(el => {
      el.style.borderTop = '';
      el.style.borderBottom = '';
    });

    // Add indicator to current target
    if (e.clientY < midY) {
      dropZone.style.borderTop = '2px solid #0d6efd';
    } else {
      dropZone.style.borderBottom = '2px solid #0d6efd';
    }
  };

  const handleSectionDrop = (e, targetSectionId) => {
    e.preventDefault();
    e.stopPropagation();

    // Clean up drop indicators
    document.querySelectorAll('.section-drop-indicator').forEach(el => {
      el.style.borderTop = '';
      el.style.borderBottom = '';
    });

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (!data || data.type !== 'section') return;

      const { sectionId: draggedSectionId } = data;
      if (draggedSectionId === targetSectionId || draggedSectionId === 'default') return;

      const dropZone = e.currentTarget;
      const rect = dropZone.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dropAfter = e.clientY > midY;

      setSections(prev => {
        const newSections = [...prev];
        const draggedIndex = newSections.findIndex(s => s.id === draggedSectionId);
        const targetIndex = newSections.findIndex(s => s.id === targetSectionId);

        if (draggedIndex === -1 || targetIndex === -1) return prev;

        // Remove the dragged section
        const [draggedSection] = newSections.splice(draggedIndex, 1);
        
        // Calculate new position
        let newPosition = dropAfter ? targetIndex : targetIndex;
        // If we're moving forward and dropping after, we need to decrease the target index
        if (draggedIndex < targetIndex && dropAfter) {
          newPosition--;
        }
        // Ensure we don't place before the default section
        newPosition = Math.max(1, newPosition);
        
        // Insert at new position
        newSections.splice(newPosition, 0, draggedSection);
        return newSections;
      });
    } catch (error) {
      console.error('Error during section drop:', error);
    }
  };

  // Add this to your existing CSS or create a new style tag in your HTML
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .note-card {
        cursor: grab;
      }
      .note-card.dragging {
        opacity: 0.5;
      }
      .section-content {
        min-height: 50px;
        padding: 8px;
        border-radius: 4px;
      }
      .section-content.drag-over {
        background-color: rgba(0, 0, 0, 0.05);
      }
      .drag-handle {
        cursor: grab;
        padding: 4px;
        color: #666;
      }
      .drag-handle:hover {
        color: #333;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Add function to handle jumping to chat context
  const jumpToChatContext = (contextRange) => {
    if (!contextRange) return;
    
    // Use lastMessageId instead of firstMessageId
    const messageElement = document.getElementById(`msg-${contextRange.lastMessageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth' });
      setHighlightedMessageId(contextRange.lastMessageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  // Modify handleSummarize to include the note creation
  const handleSummarize = async () => {
    if (chatHistory.length === 0 || isSummarizing) return;

    try {
      setIsSummarizing(true);
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          messages: chatHistory
        }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      setNotes(prev => [...prev, data.note]);
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

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
                <div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  className={`p-2 mb-2 ${msg.role === 'user' ? 'bg-light' : 'bg-info bg-opacity-10'} 
                    ${msg.id === highlightedMessageId ? 'border border-primary' : ''}`}
                >
                  <strong>{msg.role}:</strong> {msg.content}
                </div>
              ))}
              <div ref={chatEndRef} />
              {isLoading && currentStream && (
                <div className="p-2 mb-2 bg-info bg-opacity-10">
                  <strong>assistant:</strong> {currentStream}
                </div>
              )}
            </div>

            <div className="d-flex gap-2">
              <div style={{ borderRadius: '10px' }} className="input-group p-1 bg-white flex-grow-1">
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
              <button
                style={{ color: 'white', backgroundColor: '#EEC643', borderRadius: '10px' }}
                className="btn d-flex align-items-center gap-2"
                onClick={handleSummarize}
                disabled={isSummarizing || chatHistory.length === 0}
              >
                {isSummarizing ? <FaSyncAlt className="spin" /> : "Summarize & Save"}
              </button>
            </div>

          </div>

          {/* Right Section */}
          <div style={{ backgroundColor: '#F2E6C9', borderRadius: '10px' }} className="d-flex flex-column w-50 mt-2 p-2 border rounded shadow">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
              <h4 className="m-0">Motion Notes</h4>
              {isAddingSectionMode ? (
                <div className="d-flex gap-2 align-items-center">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Section name"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSection()}
                    autoFocus
                  />
                  <button
                    className="btn btn-sm btn-success"
                    onClick={addSection}
                  >
                    <FaCheck />
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      setIsAddingSectionMode(false);
                      setNewSectionTitle('');
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setIsAddingSectionMode(true)}
                >
                  Add Section
                </button>
              )}
            </div>

            <div className="overflow-auto">
              {sections.map(section => (
                <div
                  key={section.id}
                  className={`mb-4 section-drop-indicator ${section.id === 'default' ? '' : 'draggable-section'}`}
                  draggable={section.id !== 'default'}
                  onDragStart={(e) => handleSectionDragStart(e, section.id)}
                  onDragEnd={handleSectionDragEnd}
                  onDragOver={(e) => handleSectionDragOver(e, section.id)}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderTop = '';
                    e.currentTarget.style.borderBottom = '';
                  }}
                  onDrop={(e) => handleSectionDrop(e, section.id)}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    {editingSectionId === section.id ? (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        defaultValue={section.title}
                        onBlur={(e) => updateSectionTitle(section.id, e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && updateSectionTitle(section.id, e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        {section.id !== 'default' && (
                          <div 
                            style={{ cursor: 'grab', color: '#666', padding: '4px' }}
                            onMouseDown={(e) => e.stopPropagation()} // Prevent text selection while dragging
                          >
                            <FaGripVertical />
                          </div>
                        )}
                        <h6 className="m-0">{section.title}</h6>
                      </div>
                    )}
                    {section.id !== 'default' && (
                      <Dropdown>
                        <Dropdown.Toggle variant="link" size="sm" className="text-muted">
                          <BsThreeDotsVertical />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => setEditingSectionId(section.id)}>
                            Edit
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => deleteSection(section.id)}>
                            Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>

                  <div
                    className="section-content p-2 rounded"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.backgroundColor = '';
                    }}
                    onDrop={(e) => handleDrop(e, section.id)}
                  >
                    {(notesBySection[section.id] || []).map(note => (
                      <div
                        key={note.id}
                        className="card mb-2"
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, note, section.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="d-flex gap-2 flex-grow-1">
                              <div 
                                className="d-flex align-items-center" 
                                style={{ cursor: 'grab', color: '#666', padding: '4px' }}
                              >
                                <FaGripVertical />
                              </div>
                              <div className="flex-grow-1">
                                {editingNoteId === note.id ? (
                                  <div className="d-flex gap-2 align-items-start">
                                    <textarea
                                      className="form-control"
                                      value={editingNoteContent}
                                      onChange={(e) => setEditingNoteContent(e.target.value)}
                                      rows={3}
                                      autoFocus
                                    />
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => saveNoteEdit(note.id)}
                                    >
                                      <FaCheck />
                                    </button>
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={() => {
                                        setEditingNoteId(null);
                                        setEditingNoteContent('');
                                      }}
                                    >
                                      <FaTimes />
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    {note.type === 'summary' && note.contextRange && (
                                      <div className="mb-2">
                                        <button
                                          style={{ backgroundColor: '#146FE1', borderColor: '#146FE1', color: 'white' }}
                                          className="btn btn-sm d-flex align-items-center gap-2"
                                          onClick={() => jumpToChatContext(note.contextRange)}
                                        >
                                          <FaArrowRight /> Jump to Chat 
                                        </button>
                                      </div>
                                    )}
                                    <p className="mb-0">
                                      <strong>{note.answer ? 'A: ' : ''}</strong>
                                      {note.answer || note.content}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <Dropdown>
                                <Dropdown.Toggle variant="link" size="sm" className="text-muted">
                                  <BsThreeDotsVertical />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                  <Dropdown.Item onClick={() => editNote(note.id)}>
                                    <FaEdit className="me-2" /> Edit
                                  </Dropdown.Item>
                                  {sections.map(s => (
                                    s.id !== section.id && (
                                      <Dropdown.Item 
                                        key={s.id}
                                        onClick={() => moveNote(note.id, s.id)}
                                      >
                                        Move to {s.title}
                                      </Dropdown.Item>
                                    )
                                  ))}
                                  <Dropdown.Item onClick={() => deleteNote(note.id)}>
                                    Delete
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .border-primary {
          box-shadow: 0 0 0 2px #0d6efd;
          transition: box-shadow 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}