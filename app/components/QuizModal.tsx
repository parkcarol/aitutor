import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizModalProps {
  show: boolean;
  onHide: () => void;
  messages: any[];
  context: any;
}

export default function QuizModal({ show, onHide, messages, context }: QuizModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startQuiz = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, context }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quiz questions');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setSelectedAnswer('');
      setScore(0);
      setQuizCompleted(false);
      setShowExplanation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowExplanation(true);
    if (answer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setScore(0);
    setQuizCompleted(false);
    setShowExplanation(false);
    setError(null);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Knowledge Check</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center">
            <p>Ready to test your knowledge?</p>
            <Button onClick={startQuiz}>Start Quiz</Button>
          </div>
        ) : quizCompleted ? (
          <div className="text-center">
            <h4>Quiz Completed!</h4>
            <p>Your score: {score} out of {questions.length}</p>
            <Button onClick={resetQuiz}>Try Again</Button>
          </div>
        ) : (
          <div>
            <h5>Question {currentQuestionIndex + 1} of {questions.length}</h5>
            <p className="mb-3">{questions[currentQuestionIndex].question}</p>
            <Form>
              {questions[currentQuestionIndex].options.map((option, index) => (
                <Form.Check
                  key={index}
                  type="radio"
                  id={`option-${index}`}
                  label={option}
                  checked={selectedAnswer === option[0]}
                  onChange={() => handleAnswerSelect(option[0])}
                  disabled={showExplanation}
                  className="mb-2"
                />
              ))}
            </Form>
            {showExplanation && (
              <Alert variant={selectedAnswer === questions[currentQuestionIndex].correctAnswer ? "success" : "danger"} className="mt-3">
                <p className="mb-1">
                  {selectedAnswer === questions[currentQuestionIndex].correctAnswer ? "Correct!" : "Incorrect!"}
                </p>
                <p className="mb-0">{questions[currentQuestionIndex].explanation}</p>
              </Alert>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {questions.length > 0 && !quizCompleted && showExplanation && (
          <Button onClick={handleNextQuestion}>
            {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
} 