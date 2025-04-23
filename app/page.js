'use client'

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Dropdown from "react-bootstrap/Dropdown";
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaEdit, FaCheck, FaTimes, FaGripVertical, FaSyncAlt, FaArrowRight, FaArrowUp } from 'react-icons/fa';

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
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAddingSectionMode, setIsAddingSectionMode] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const chatEndRef = useRef(null);

  // Log chat history and context changes
  useEffect(() => {
    console.log("Current Chat History:", chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Add this new function to parse and sanitize HTML content
  const parseAndSanitizeHTML = (content) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    return doc.body.innerHTML;
  };

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
              // No longer automatically saving notes here
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

  const handleSaveNote = async (messages) => {
    try {
      // Format messages to match the expected structure
      const formattedMessages = messages.map(msg => ({
        id: msg.id || Date.now().toString(),
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || Date.now()
      }));

      console.log('Sending to summary API:', {
        chatId,
        messages: formattedMessages,
        originalMessages: messages
      });

      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          messages: formattedMessages
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Summary API error response:', errorData);
        throw new Error(errorData.error || 'Failed to generate summary');
      }
      const data = await response.json();
      console.log('Summary API success response:', data);
      
      // Add the summarized note to the notes state
      if (data.note) {
        setNotes(prev => [...prev, data.note]);
      }
    } catch (error) {
      console.error("Error saving note:", error);
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
      // Convert HTML bullet points and breaks to plain text format for editing
      const content = (note.answer || note.content)
        .replace(/<br\s*\/?>/g, '\n')  // Convert <br> to newlines
        .replace(/<li>/g, '• ')        // Convert list items to bullet points
        .replace(/<\/?[^>]+(>|$)/g, '') // Remove any other HTML tags
        .trim();
      setEditingNoteId(noteId);
      setEditingNoteContent(content);
    }
  };

  const saveNoteEdit = (noteId) => {
    // Convert plain text bullet points and newlines back to HTML
    const formattedContent = editingNoteContent
      .split('\n')
      .map(line => {
        line = line.trim();
        if (line.startsWith('•') || line.startsWith('*')) {
          return `<li>${line.substring(1).trim()}</li>`;
        }
        return line;
      })
      .join('<br />');

    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, answer: formattedContent, content: formattedContent }
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

  const jumpToChatContext = (contextRange) => {
    if (!contextRange) return;
    
    // Find the message in chat history
    const message = chatHistory.find(msg => msg.id === contextRange.lastMessageId);
    if (!message) return;

    // Scroll to the message
    const messageElement = document.getElementById(`msg-${message.id}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(message.id);
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
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
      .section-content .card {
        background-color: rgba(242, 230, 201, 0.6);
      }
      button.delete-btn {
        transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
      }
      button.delete-btn:hover {
        background-color:rgb(204, 50, 50) !important;
        border-color: #9e3333 !important;
      }
      .note-content li {
        margin-left: 20px;
        list-style-type: disc;
      }
      .note-content br {
        display: block;
        margin: 8px 0;
        content: "";
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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

            <div className="d-flex flex-column justify-content-between" style={{ height: '100%' }}>
              <div style={{ height: '75vh' }} className="overflow-auto mb-3">
                {chatHistory.map((msg, index) => (
                  <div 
                    key={msg.id} 
                    id={`msg-${msg.id}`}
                    className={`p-2 mb-2 ${msg.role === 'user' ? 'bg-light' : 'bg-info bg-opacity-10'} ${highlightedMessageId === msg.id ? 'border border-primary border-2' : ''}`}
                    style={{
                      transition: 'border-color 0.3s ease-in-out',
                      borderRadius: '8px'
                    }}
                  >
                    <strong>{msg.role}:</strong>{' '}
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: parseAndSanitizeHTML(msg.content) 
                      }} 
                      style={{ display: 'inline' }}
                    />
                    {msg.role === 'assistant' && (
                      <div className="mt-2">
                        <button
                          style={{ backgroundColor: '#EEC643', borderRadius: '10px' }}
                          className="btn btn-sm text-white"
                          onClick={() => {
                            const contextMessages = chatHistory.slice(Math.max(0, index - 1), index + 1)
                              .map(msg => ({
                                id: msg.id,
                                role: msg.role,
                                content: msg.content,
                                timestamp: Date.now()
                              }));
                            handleSaveNote(contextMessages);
                          }}
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
                    <strong>assistant:</strong>{' '}
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: parseAndSanitizeHTML(currentStream) 
                      }} 
                      style={{ display: 'inline' }}
                    />
                  </div>
                )}
              </div>

              <div>
                {/* Pre-prompting buttons */}
                <div className="d-flex flex-row gap-2 mb-3">
                  <button
                    style={{ 
                      backgroundColor: 'black', 
                      color: 'white', 
                      borderRadius: '10px',
                      padding: '4px 12px',
                      height: '32px',
                      flex: '1'
                    }}
                    className="btn"
                    onClick={() => setMessage("What is force?")}
                  >
                    What is force?
                  </button>
                  <button
                    style={{ 
                      backgroundColor: 'black', 
                      color: 'white', 
                      borderRadius: '10px',
                      padding: '4px 12px',
                      height: '32px',
                      flex: '1'
                    }}
                    className="btn"
                    onClick={() => setMessage("What is thermodynamics?")}
                  >
                    What is thermodynamics?
                  </button>
                  <button
                    style={{ 
                      backgroundColor: 'black', 
                      color: 'white', 
                      borderRadius: '10px',
                      padding: '4px 12px',
                      height: '32px',
                      flex: '1'
                    }}
                    className="btn"
                    onClick={() => setMessage("How is motion defined?")}
                  >
                    How is motion defined?
                  </button>
                </div>

                {/* Chat input */}
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
                                  <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <div className="d-flex gap-2">
                                        <button
                                          style={{ backgroundColor: '#146FE1', borderColor: '#146FE1', color: 'white', width: '24px', height: '24px', padding: '0px', fontSize: '14px', fontWeight: 'bold' }}
                                          className="btn btn-sm"
                                          onClick={() => saveNoteEdit(note.id)}
                                          title="Save note"
                                        >
                                          <FaCheck />
                                        </button>
                                        <button
                                          style={{ backgroundColor: '#333333', borderColor: '#333333', color: 'white', width: '24px', height: '24px', padding: '0px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          className="btn btn-sm"
                                          onClick={() => {
                                            setEditingNoteId(null);
                                            setEditingNoteContent('');
                                          }}
                                          title="Cancel"
                                        >
                                          <FaTimes />
                                        </button>
                                      </div>
                                    </div>
                                    <textarea
                                      className="form-control border-0"
                                      value={editingNoteContent}
                                      onChange={(e) => setEditingNoteContent(e.target.value)}
                                      rows={5}
                                      placeholder="Use '•' or '*' at the start of a line for bullet points"
                                      style={{ 
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        backgroundColor: 'transparent',
                                        resize: 'none'
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      {note.contextRange && (
                                        <button
                                          style={{ backgroundColor: '#146FE1', borderColor: '#146FE1', color: 'white', width: '24px', height: '24px', padding: '0px', fontSize: '14px', fontWeight: 'bold' }}
                                          className="btn btn-sm"
                                          onClick={() => jumpToChatContext(note.contextRange)}
                                          title="Jump to chat"
                                        >
                                          <FaArrowUp />
                                        </button>
                                      )}
                                      <div className="d-flex gap-2">
                                        <button
                                          style={{ backgroundColor: '#333333', borderColor: '#333333', color: 'white', width: '24px', height: '24px', padding: '0px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          className="btn btn-sm"
                                          onClick={() => editNote(note.id)}
                                          title="Edit note"
                                        >
                                          <FaEdit />
                                        </button>
                                        <button
                                          style={{ backgroundColor: '#333333', borderColor: '#333333', color: 'white', width: '24px', height: '24px', padding: '0px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                          className="btn btn-sm delete-btn"
                                          onClick={() => deleteNote(note.id)}
                                          title="Delete note"
                                        >
                                          <FaTimes />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="mb-0 note-content">
                                      {note.answer && <strong>A: </strong>}
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html: parseAndSanitizeHTML(note.answer || note.content)
                                        }}
                                        style={{ 
                                          display: 'inline',
                                          lineHeight: '1.5'
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
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
    </div >
  );
}