import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Authentication.css";

const Authentication = () => {
  const text = "Job Match";
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isLogin) {
        // Login request
        const response = await fetch("http://127.0.0.1:5000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });
        const data = await response.json();

        if (data.success) {
          alert(data.message || "Login successful!");
          navigate("/SkillMatch"); // redirect after login
        } else {
          setMessage(data.message || "Login failed.");
        }
      } else {
        // Signup request
        const response = await fetch("http://127.0.0.1:5000/signUp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await response.json();

        if (data.success) {
          setMessage(data.message || "Signup successful! Please login.");
          setIsLogin(true); // switch to login form after signup
          setFormData({ name: "", email: "", password: "" }); // clear form
        } else {
          setMessage(data.message || "Signup failed.");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <p className="nextHeading">
        <span className="text">
          {text.split("").map((char, index) => (
            <span
              key={index}
              className="letter"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>
      </p>

      {/* Toggle buttons */}
      <div className="auth-toggle">
        <button
          type="button"
          className={`toggle-btn ${isLogin ? "active" : ""}`}
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
        <button
          type="button"
          className={`toggle-btn ${!isLogin ? "active" : ""}`}
          onClick={() => setIsLogin(false)}
        >
          Signup
        </button>
      </div>

      {/* Form */}
      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
          />
        )}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="form-input"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="form-input"
        />

        <button type="submit" className="submit-btn">
          {isLogin ? "Login" : "Signup"}
        </button>
      </form>

      {/* Message */}
      {message && <p className="auth-message">{message}</p>}
    </div>
  );
};

export default Authentication;
