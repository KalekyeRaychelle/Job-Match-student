import React from 'react'
import '../styles/Header.css'
import { Link } from 'react-router-dom'
const Header = () => {
  return (
    <div>
    <header className="app-header">
      
        <ul>
         
          <li><Link to='/'>Skill Match Analysis</Link></li>
          <li><Link to='/ChatPrep'>Quick Chat Prep</Link></li>

        </ul>
      <h1>JobMatch Students</h1>
    </header>
    </div>
  )
}

export default Header
