import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Jobs.css';

import { useJobContext } from '../context/JobContext';

const Jobs = () => {
  // -------------------- STATE --------------------
  // Store uploaded job description + CV files
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);

  // Loading indicator while backend analyzes CV vs JD
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // File names for display (loaded from localStorage if available)
  const [cvFileName, setCvFileName] = useState(() => {
    return localStorage.getItem('cvFileName') || '';
  });

  const [jdFileName, setJdFileName] = useState(() => {
    return localStorage.getItem('jobDescriptionFileName') || '';
  });

  // Store feedback results (similarities, missing skills, courses, etc.)
  const [feedback, setFeedback] = useState(() => {
    const saved = localStorage.getItem('feedback');
    return saved ? JSON.parse(saved) : null;
  });

  // Global state (so job description can also be used in ChatPrep.js)
  const { setJobDescription: setGlobalJobDescription } = useJobContext();

  // -------------------- HANDLERS --------------------

  /**
   * Handle CV file upload
   * - Saves file to state
   * - Stores file name in localStorage (for persistence across reloads)
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCvFile(file);
      localStorage.setItem('cvFileName', file.name);
      setCvFileName(file.name);
    }
  };

  /**
   * Handle Job Description file upload
   * - Saves file to state
   * - Stores file name in localStorage
   */
  const handleJDFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setJobDescriptionFile(file);
      localStorage.setItem('jobDescriptionFileName', file.name);
      setJdFileName(file.name);
    }
  };

  /**
   * Handle "Analyze" button click
   * - Validates both files are uploaded
   * - Sends them to backend (/analyze)
   * - Receives AI feedback (match %, similarities, missing skills, course links)
   * - Stores feedback in state + localStorage
   * - Also updates global JobContext for use in ChatPrep
   */
  const handleAnalyzeClick = async () => {
    if (!jobDescriptionFile || !cvFile) {
      alert('Please upload both the job description and your CV.');
      return;
    }

    const formData = new FormData();
    formData.append('job_description', jobDescriptionFile); 
    formData.append('cv', cvFile);

    setLoadingFeedback(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/analyze',
        formData
      );

      setFeedback(response.data.feedback);
      localStorage.setItem('feedback', JSON.stringify(response.data.feedback));

      // Store JD globally so ChatPrep can generate interview questions from it
      setGlobalJobDescription(jobDescriptionFile);

    } catch (error) {
      console.error('There was an error!', error);
      alert('An error occurred while processing your request.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  // -------------------- EFFECTS --------------------

  /**
   * Clear stored data on page reload/exit
   * - Ensures fresh uploads + feedback each session
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('feedback');
      localStorage.removeItem('jobDescriptionFileName');
      localStorage.removeItem('cvFileName');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // -------------------- RENDER --------------------
  return (
    <div className='Jobs'>
      <div className='jobCards'>
        {/* CV Upload Section */}
        <div className='CV-card'>
          <label>Upload CV (PDF):</label>
          <input type='file' accept='.pdf' onChange={handleFileChange} />
          {cvFileName && <p>Selected CV: {cvFileName}</p>}
        </div>

        {/* Job Description Upload Section */}
        <div className='description'>
          <label>Upload Job Description (PDF):</label>
          <input
            type='file'
            accept='.pdf,.doc,.docx,.txt'
            onChange={handleJDFileChange}
          />
          {jdFileName && <p>Selected JD: {jdFileName}</p>}
        </div>

        {/* Analyze Button */}
        <div className='btnSection'>
          <button onClick={handleAnalyzeClick}>Analyze</button>
        </div>
      </div>

      {/* Feedback Section */}
      <div className='feedback'>
        {loadingFeedback ? (
          // Loader animation while waiting for backend
          <div className='dot-loader'>
            <span></span>
            <span></span>
            <span></span>
          </div>
        ) : (
          feedback && (
            <div className='Feedback'>
              <h2>You have a {feedback.match_percentage}% match</h2>

              <div className='feedback-sections'>
                {/* List similarities */}
                <div>
                  <h3>Similarities:</h3>
                  <ul>
                    {(feedback.similarities || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* List missing skills */}
                <div>
                  <h3>What is missing from your CV:</h3>
                  <ul>
                    {(feedback.missing || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended courses section */}
              <div className='courses'>
                <h3>Recommended Courses to bridge the gap</h3>
                <ul>
                  {(feedback.course_recommendations || []).map((item, idx) => (
                    <li key={idx}>
                      <a
                        href={item.url}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Jobs;
