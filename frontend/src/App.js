import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ChatPrep from "./pages/ChatPrep";
import Header from "./components/Header";
import Heading from './components/Heading';
import Jobs from "./pages/Jobs";
import { JobProvider } from "./context/JobContext";
import PrepHeading from "./components/PrepHeading";
import Authentication from './pages/Authentication';

function App() {
  const location = useLocation();
  
  const path = location.pathname;

  const showHeader = path === '/SkillMatch' || path === '/ChatPrep';
  

  return (
    <div className="App">
      {showHeader && <Header />}
      
      
      {(path === '/SkillMatch') && <Heading />}
      {path === '/ChatPrep' && <PrepHeading />}

      <JobProvider>
        <Routes>
          <Route path="/" element={<Authentication />} />
          <Route path="/ChatPrep" element={<ChatPrep />} />
          <Route path="/SkillMatch" element={<Jobs />} />
          
        </Routes>
      </JobProvider>
    </div>
  );
}
export default App;