import React, { useState, useEffect } from 'react';
import Prompt from '../components/Prompt';
import '../styles/ChatPrep.css';

import { useJobContext } from '../context/JobContext';

const ChatPrep = () => {
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('chatprep_questions');
    return saved ? JSON.parse(saved) : [];
  });

  const [qaList, setQaList] = useState(() => {
    const saved = localStorage.getItem('chatprep_qaList');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const { jobDescription } = useJobContext();

  const handleSubmit = async (question) => {
    const updatedQaList = [...qaList, { question, answer: '...' }];
    setQaList(updatedQaList);
    localStorage.setItem('chatprep_qaList', JSON.stringify(updatedQaList));

    try {
      const response = await fetch('http://localhost:5000/Ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      const finalQaList = updatedQaList.map((qa, i) =>
        i === updatedQaList.length - 1 ? { ...qa, answer: data.answer } : qa
      );

      setQaList(finalQaList);
      localStorage.setItem('chatprep_qaList', JSON.stringify(finalQaList));
    } catch (err) {
      console.error(err);

      const errorQaList = updatedQaList.map((qa, i) =>
        i === updatedQaList.length - 1
          ? { ...qa, answer: 'Something went wrong. Try again.' }
          : qa
      );

      setQaList(errorQaList);
      localStorage.setItem('chatprep_qaList', JSON.stringify(errorQaList));
    }
  };
  useEffect(() => {
    const fetchQuestions = async () => {
      const storedQuestions = localStorage.getItem('chatprep_questions');
      if (storedQuestions) {
        setQuestions(JSON.parse(storedQuestions));
        return; 
      }
  
      if (!jobDescription) return;
  
      setLoadingQuestions(true);
  
      try {
        const res = await fetch('http://localhost:5000/get-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: jobDescription }),
        });
  
        const data = await res.json();
        setQuestions(data.questions);
        localStorage.setItem('chatprep_questions', JSON.stringify(data.questions));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingQuestions(false);
      }
    };
  
    fetchQuestions();
  }, [jobDescription]);
  
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('chatprep_questions');
      localStorage.removeItem('chatprep_qaList');
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
  
    // Clean up the listener when the component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
 
  
  return (
    <div className='ChatPrep'>
        <div className="questions">
            <h2>TEN QUESTIONS TO BE ASKED</h2>

            {loadingQuestions ? (
              <div className="dot-loader">
                <span></span><span></span><span></span>
              </div>
            ) : questions.length > 0 ? (
              <ul>
                {questions.map((qa, index) => (
                  <li key={index} className="qa-item">
                    <h3>Q: {qa.question}</h3>
                    <p>A: {qa.answer}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No questions available.</p>
            )}
        </div>

      <div className="chatprep-container">
        <h2 className="chatprep-header">Interview Helper Agent</h2>

        <div className="chatprep-body">
          {qaList.map((item, idx) => (
            <div key={idx} className="qa-item">
              <p><strong>Q:</strong> {item.question}</p>
              <p><strong>A:</strong> {item.answer}</p>
            </div>
          ))}
        </div>

        <Prompt onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default ChatPrep;
