'use client'

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Dropdown from "react-bootstrap/Dropdown";
import { BsThreeDotsVertical } from 'react-icons/bs';
import { FaEdit, FaPen, FaCheck, FaTimes, FaGripVertical, FaSyncAlt, FaArrowRight, FaArrowAltCircleUp, FaQuestionCircle, FaCog } from 'react-icons/fa';
import { HiLightBulb } from 'react-icons/hi';
import QuizModal from './components/QuizModal';
import { chatSessions } from "../lib/store";




export default function Home() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatId] = useState("default-chat");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState("");
  const [notes, setNotes] = useState([
    {
      id: 'default-note',
      content: 'Click on Save to Notes and your tutor will generate notes here!',
      sectionId: 'default',
      timestamp: Date.now()
    }
  ]);
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
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [userInputCount, setUserInputCount] = useState(0);
  const toastRef = useRef(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const inputRef = useRef(null);




  // Initialize chat session
  useEffect(() => {
    const initChat = async () => {
      try {
        // Initialize the chat session
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId,
            message: "", // Empty message for initialization
            context: {
              topic: "Motion and Force",
              chapter: "Motion in the context of a vacuum",
              subject: "Physics",
              gradeLevel: "Grade 9",
              learningObjectives: [
                "Basic definitions of motion, force",
                "Motion in the context of space",
                "Definitions of force",
                "relationship between force and motion"
              ]
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to initialize chat session');
        }

        console.log("Chat session initialized");
      } catch (error) {
        console.error("Error initializing chat:", error);
      }
    };

    initChat();
  }, [chatId]);

  // Log chat history and context changes
  useEffect(() => {
    console.log("Current Chat History:", chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Add this new function to parse and sanitize HTML content
  const parseAndSanitizeHTML = (content) => {
    if (typeof window === 'undefined') return content; // Return raw content on server-side
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    return doc.body.innerHTML;
  };

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    setUserInputCount(prev => prev + 1);


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
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
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
        // setNotes(prev => [...prev, data.note]);
        addNote(data.note);
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
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== 'default-note');
      return [...filtered, newNote];
    });
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
      @keyframes loading-progress {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes spinner-border {
        to { transform: rotate(360deg); }
      }
      .quiz-spinner {
        width: 2rem;
        height: 2rem;
        border: 0.2em solid #28a745;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spinner-border .75s linear infinite;
        margin-top: 1.5rem;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const toggleQuizMode = async () => {
    if (toastRef.current) {
      const { default: Toast } = await import('bootstrap/js/dist/toast');
      const toastInstance = Toast.getInstance(toastRef.current) || new Toast(toastRef.current);
      toastInstance.hide();
      setIsToastVisible(false);
    }
    if (!isQuizMode) {
      // Switch to quiz mode immediately
      setIsQuizMode(true);
      setIsLoadingQuiz(true);
      try {
        console.log("Fetching quiz questions...");
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: chatHistory,
            context: chatSessions[chatId]?.context
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Quiz API error:', errorData);
          throw new Error(errorData.details || errorData.error || 'Failed to fetch quiz questions');
        }

        console.log("Quiz response received");
        const data = await response.json();
        console.log("Quiz data:", data);

        if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error('Invalid quiz data format');
        }

        setQuizQuestions(data.questions);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        alert('Failed to load quiz questions. Please try again.');
        // Don't switch back to chat mode on error, just show error state
      } finally {
        setIsLoadingQuiz(false);
      }
    } else {
      // Switch back to chat mode
      setIsQuizMode(false);
      setQuizQuestions([]);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
    }
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null); // optional: clear selection
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
    }
  };

  useEffect(() => {
    const showToastIfNeeded = async () => {
      if (userInputCount === 5 && toastRef.current) {
        const { default: Toast } = await import('bootstrap/js/dist/toast');
        const toast = new Toast(toastRef.current, { autohide: false });

        toast.show();
        setIsToastVisible(true);

        toastRef.current.addEventListener('hidden.bs.toast', () => {
          setIsToastVisible(false);
        });
      }
    };

    showToastIfNeeded();
  }, [userInputCount]);



  return (
    <div>

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg bg-body-tertiary">
        <div className="container-fluid text-center" style={{ justifyContent: 'center' }}>
          <Image src={"/logo.png"} alt="Logo" width={100} height={40} className="" />
          <a className="navbar-brand" href="#"></a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>
      </nav >

      {/* Main Content */}
      <div div className="container-fluid" >
        <div style={{ gridTemplateColumns: '1fr 1fr' }} className="d-flex flex-row gap-3">

          {/* Left Section */}
          <div style={{
            height: 'calc(100vh - 80px)', backgroundColor: '#DADADA', borderRadius: '10px', position: 'relatove'
          }} className="d-flex flex-column w-50 mt-2 p-2 border shadow">
            <div

              className="position-absolute top-0 p-3"
              style={{ left: '310px' }}
            >
              <div
                ref={toastRef}
                className="toast align-items-center"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <div className="d-flex">
                  <div className="toast-body">
                    Let&apos;s test your knowledge! Click the lightbulb icon to start the quiz.
                  </div>
                  <button
                    type="button"
                    className="btn-close me-2 m-auto"
                    data-bs-dismiss="toast"
                    aria-label="Close"
                  ></button>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
              <h4 className="m-0">{isQuizMode ? "Quiz" : "Chat"}</h4>
              <button
                style={{
                  backgroundColor: isQuizMode ? '#28a745' : 'transparent',
                  borderColor: isQuizMode ? '#28a745' : '#333333',
                  color: isQuizMode ? 'white' : '#333333',
                  width: '32px',
                  height: '32px',
                  padding: '0px',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '12px'
                }}
                className="btn btn-sm"
                title={isQuizMode ? "Return to Chat" : "Quiz Mode"}
                onClick={toggleQuizMode}
                onMouseEnter={(e) => {
                  if (!isQuizMode) {
                    e.currentTarget.style.backgroundColor = '#28a745';
                    e.currentTarget.style.borderColor = '#28a745';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isQuizMode) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#333333';
                    e.currentTarget.style.color = '#333333';
                  }
                }}
              >
                <HiLightBulb className={isToastVisible ? "shake-effect" : ""} />

              </button>

            </div>

            {isQuizMode ? (
              <div className="flex-grow-1 d-flex flex-column">
                {isLoadingQuiz ? (
                  <div className="d-flex flex-column justify-content-center align-items-center h-100">
                    <div className="text-center">
                      {/* <h5 style={{ fontSize: '24px', fontWeight: '500', marginBottom: '12px' }}>
                        Generating Quiz Questions...
                      </h5> */}
                      <p className="text-muted" style={{ fontSize: '20px' }}>
                        Quiz questions are cooking!
                      </p>
                      <div className="spinner-border text-success mt-4" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  </div>
                ) : quizQuestions.length > 0 ? (
                  <div className="">
                    <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                      <div className="flex-column align-items-center card text-center mb-3 border-0" style={{ minHeight: '200px', backgroundColor: '#EEF0F2' }}>
                        <div className="d-flex flex-column align-items-center justify-content-center card-body" style={{ maxWidth: '300px' }}>
                          <small className="text-muted">Question {currentQuestion + 1} of {quizQuestions.length}</small>
                          <h5 className="mb-4">{quizQuestions[currentQuestion].question}</h5>
                        </div>
                      </div>
                      <div className="d-flex flex-wrap">
                        {quizQuestions[currentQuestion].options.map((option, index) => (
                          <div key={index} className="w-50 p-1">
                            <button
                              key={index}
                              className={`btn ${selectedAnswer === option[0] ? 'btn-secondary' : 'btn-light'} w-100`}
                              onClick={() => handleAnswerSelect(option[0])}
                              disabled={selectedAnswer !== null}
                              style={{ height: '100%', borderRadius: '10px' }}
                            >
                              <div className="d-flex w-100 align-items-center">
                                <span
                                  className="rounded-circle fw-bold text-dark d-inline-flex justify-content-center align-items-center flex-shrink-0"
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    backgroundColor: '#69C8EC',
                                    lineHeight: 'normal',
                                    marginRight: '10px'
                                  }}
                                >
                                  {option[0]}
                                </span>

                                <span className="text-start">{option.slice(3)}</span>
                              </div>
                            </button>

                          </div>
                        ))}
                      </div>
                      {selectedAnswer && (
                        <div className="mt-4">
                          <div className={`alert ${selectedAnswer === quizQuestions[currentQuestion].correctAnswer
                            ? 'alert-success'
                            : 'alert-danger'
                            }`}>
                            <h6 className="mb-2">
                              {selectedAnswer === quizQuestions[currentQuestion].correctAnswer
                                ? 'Correct!'
                                : 'Incorrect'}
                            </h6>
                            <p className="mb-0">{quizQuestions[currentQuestion].explanation}</p>
                          </div>
                          <div className="d-flex justify-content-between mt-3">
                            {currentQuestion > 0 ? (
                              <button
                                className="btn"
                                onClick={handlePreviousQuestion}
                                style={{ height: '80px', borderRadius: '10px', backgroundColor: '#0D21A1', color: 'white' }}
                              >
                                Previous Question
                              </button>
                            ) : <div style={{ width: "150px" }}></div>}
                            {currentQuestion < quizQuestions.length - 1 && (
                              <button
                                className="btn"
                                onClick={handleNextQuestion}
                                style={{ height: '80px', borderRadius: '10px', backgroundColor: '#0D21A1', color: 'white' }}
                              >
                                Next Question
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p>No quiz questions available.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="d-flex flex-column" style={{ height: 'calc(100% - 40px)' }}>
                <div style={{ height: 'calc(100% - 120px)', overflowY: 'auto' }} className="mb-3">
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
                      {/* <strong>{msg.role}:</strong>{' '} */}
                      <strong>
                        {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'aiTutor' : msg.role}:
                      </strong>{' '}
                      <div
                        dangerouslySetInnerHTML={{
                          __html: parseAndSanitizeHTML(msg.content)
                        }}
                        style={{ display: 'inline' }}
                      />
                      {msg.role === 'assistant' && (
                        <div className="mt-2">
                          <button
                            style={{
                              backgroundColor: '#EEC643',
                              fontSize: '12px',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}
                            className="btn btn-sm"
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
                      <strong>aiTutor:</strong>{' '}
                      <div
                        dangerouslySetInnerHTML={{
                          __html: parseAndSanitizeHTML(currentStream)
                        }}
                        style={{ display: 'inline' }}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  {/* Pre-prompting buttons */}
                  <div className="d-flex flex-row gap-2 mb-3">
                    <button
                      style={{
                        backgroundColor: 'darkgrey',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        height: '48px',
                        flex: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word'
                      }}
                      className="btn"
                      onClick={() => setMessage("What is force?")}
                    >
                      What is<br />force?
                    </button>
                    <button
                      style={{
                        backgroundColor: 'darkgrey',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        height: '48px',
                        flex: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word'
                      }}
                      className="btn"
                      onClick={() => setMessage("How do objects move in space?")}
                    >
                      How do objects<br />move in space?
                    </button>
                    <button
                      style={{
                        backgroundColor: 'darkgrey',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        height: '48px',
                        flex: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word'
                      }}
                      className="btn"
                      onClick={() => setMessage("How is motion defined?")}
                    >
                      How is motion<br />defined?
                    </button>
                  </div>

                  {/* Chat input */}
                  <div style={{ borderRadius: '10px' }} className="input-group mb-3 p-1 bg-white">
                    <input
                      ref={inputRef}
                      type="text"
                      style={{ border: '0px', borderRadius: '10px' }}
                      className="form-control p-2"
                      placeholder="Chat with me here"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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
            )}
          </div>

          {/* Right Section */}
          <div style={{ height: 'calc(100vh - 80px)', backgroundColor: '#F2E6C9', borderRadius: '10px' }} className="d-flex flex-column w-50 mt-2 p-2 border rounded shadow">
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
              <h4 className="mb-0">Notes</h4>

              {isAddingSectionMode ? (
                <div className="d-flex gap-2 align-items-center">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Section name"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSection()}
                    autoFocus
                  />
                  <button
                    style={{ fontSize: '12px', borderRadius: '6px' }}
                    className="btn btn-sm btn-success"
                    onClick={addSection}
                  >
                    <FaCheck />
                  </button>
                  <button
                    style={{ fontSize: '12px', borderRadius: '6px' }}
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
                  style={{
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setIsAddingSectionMode(true)}
                >
                  Add Section
                </button>
              )}
            </div>

            <div className="overflow-auto" style={{ height: 'calc(100% - 40px)' }}>
              {sections.map(section => (
                <div
                  key={section.id}
                  className={`mb-4 mt-2 section-drop-indicator ${section.id === 'default' ? '' : 'draggable-section'}`}
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
                        onKeyDown={(e) => e.key === 'Enter' && updateSectionTitle(section.id, e.target.value)}
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
                    {(() => {
                      const sectionNotes = notesBySection[section.id] || [];
                      const isOnlyDefaultNote = sectionNotes.length === 1 && sectionNotes[0].id === 'default-note';

                      if (isOnlyDefaultNote) {
                        return (
                          <div className="text-muted fst-italic text-center">
                            {sectionNotes[0].content}
                          </div>
                        );
                      }

                      return sectionNotes.map(note => (
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
                                      <div className="d-flex justify-content-end align-items-start mb-2">
                                        <div className="d-flex gap-2">
                                          <button
                                            style={{ backgroundColor: '#0D21A1', borderColor: '#146FE1', color: 'white', width: '24px', height: '24px', padding: '0px', fontSize: '14px', fontWeight: 'bold' }}
                                            className="btn btn-sm m-1"
                                            onClick={() => saveNoteEdit(note.id)}
                                            title="Save note"
                                          >
                                            <FaCheck />
                                          </button>
                                          <button
                                            style={{ backgroundColor: '#0D21A1', borderColor: '#333333', color: 'white', width: '24px', height: '24px', padding: '0px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            className="btn btn-sm m-1"
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
                                      <div className="d-flex justify-content-end align-items-start mb-2 gap-2">
                                        <div>
                                          <button
                                            style={{ backgroundColor: '#0D21A1', color: 'white', fontSize: '12px', borderRadius: '6px' }}
                                            className="btn btn-sm"
                                            onClick={() => editNote(note.id)}
                                            title="Edit note"
                                          >
                                            <FaPen />
                                          </button>
                                        </div>
                                        <div>
                                          <button
                                            style={{ backgroundColor: '#0D21A1', color: 'white', fontSize: '12px', borderRadius: '6px' }}
                                            className="btn btn-sm delete-btn"
                                            onClick={() => deleteNote(note.id)}
                                            title="Delete note"
                                          >
                                            <FaTimes />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mb-0 note-content">
                                        {note.answer && <strong></strong>}
                                        <div
                                          dangerouslySetInnerHTML={{
                                            __html: parseAndSanitizeHTML(note.answer || note.content)
                                          }}
                                          style={{
                                            display: 'inline',
                                            lineHeight: '1.5',
                                            ...(note.id === 'default-note' ? {
                                              color: '#666',
                                              fontStyle: 'italic',
                                              textAlign: 'center',
                                              padding: '20px 0'
                                            } : {})
                                          }}
                                        />
                                      </div>
                                      {note.contextRange && (
                                        <div className="d-flex justify-content-end mt-2">
                                          <button
                                            style={{
                                              backgroundColor: '#0D21A1',
                                              borderColor: '#146FE1',
                                              color: 'white',
                                              fontSize: '12px',
                                              padding: '4px 8px',
                                              borderRadius: '6px'
                                            }}
                                            className="btn btn-sm"
                                            onClick={() => jumpToChatContext(note.contextRange)}
                                            title="Jump to chat"
                                          >
                                            Jump to chat
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div >




      <QuizModal
        show={showQuiz}
        onHide={() => setShowQuiz(false)}
        messages={chatHistory}
        context={chatSessions[chatId]?.context}
      />
    </div >
  );
}