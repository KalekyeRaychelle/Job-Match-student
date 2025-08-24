import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Jobs.css';

import { useJobContext } from '../context/JobContext';

const Jobs = () => {
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const [cvFileName, setCvFileName] = useState(() => {
    return localStorage.getItem('cvFileName') || '';
  });

  const [jdFileName, setJdFileName] = useState(() => {
    return localStorage.getItem('jobDescriptionFileName') || '';
  });

  const [feedback, setFeedback] = useState(() => {
    const saved = localStorage.getItem('feedback');
    return saved ? JSON.parse(saved) : null;
  });

  const { setJobDescription: setGlobalJobDescription } = useJobContext();

  // CV Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCvFile(file);
      localStorage.setItem('cvFileName', file.name);
      setCvFileName(file.name);
    }
  };

  // JD Upload
  const handleJDFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setJobDescriptionFile(file);
      localStorage.setItem('jobDescriptionFileName', file.name);
      setJdFileName(file.name);
    }
  };

  // Analyze button
  const handleAnalyzeClick = async () => {
    if (!jobDescriptionFile || !cvFile) {
      alert('Please upload both the job description and your CV.');
      return;
    }

    const formData = new FormData();
    formData.append('job_description', jobDescriptionFile); // now file
    formData.append('cv', cvFile);

    setLoadingFeedback(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/analyze',
        formData
      );

      setFeedback(response.data.feedback);
      localStorage.setItem('feedback', JSON.stringify(response.data.feedback));

      // optional: keep global context for consistency
      setGlobalJobDescription(jdFileName);
    } catch (error) {
      console.error('There was an error!', error);
      alert('An error occurred while processing your request.');
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Clear localStorage when page is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('feedback');
      localStorage.removeItem('jobDescriptionFileName');
      localStorage.removeItem('cvFileName');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className='Jobs'>
      <div className='jobCards'>
        {/* CV Upload */}
        <div className='CV-card'>
          <label>Upload CV (PDF):</label>
          <input type='file' accept='.pdf' onChange={handleFileChange} />
          {cvFileName && <p>Selected CV: {cvFileName}</p>}
        </div>

        {/* JD Upload */}
        <div className='description'>
          <label>Upload Job Description (PDF/DOC/TXT):</label>
          <input
            type='file'
            accept='.pdf,.doc,.docx,.txt'
            onChange={handleJDFileChange}
          />
          {jdFileName && <p>Selected JD: {jdFileName}</p>}
        </div>

        {/* Analyze */}
        <div className='btnSection'>
          <button onClick={handleAnalyzeClick}>Analyze</button>
        </div>
      </div>

      {/* Feedback */}
      <div className='feedback'>
        {loadingFeedback ? (
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
                <div>
                  <h3>Similarities:</h3>
                  <ul>
                    {(feedback.similarities || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3>What is missing from your CV:</h3>
                  <ul>
                    {(feedback.missing || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

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
