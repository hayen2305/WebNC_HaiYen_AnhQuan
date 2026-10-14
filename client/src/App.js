import React, { useEffect, useState } from 'react';
import './main/css/App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3000/sinhvien');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const result = await response.json();
        setStudents(Array.isArray(result) ? result : [result]);
      } catch (error) {
        console.error('Error fetching data:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="app-shell">
      <header className="browser-bar">
        <div className="browser-actions">
          <span className="nav-icon">←</span>
          <span className="nav-icon">→</span>
          <span className="nav-icon">⟳</span>
        </div>

        <div className="address-bar">
          <span className="lock">🔒</span>
          <span>http://127.0.0.1:3001/#/home</span>
        </div>

        <div className="browser-tools">
          <span className="nav-icon">☆</span>
          <span className="nav-icon">◉</span>
          <span className="nav-icon">☰</span>
        </div>
      </header>

      <nav className="bookmark-bar">
        <div className="bookmark-item">Import bookmarks...</div>
        <div className="bookmark-item">Getting Started</div>
        <div className="bookmark-item">GETS | New Zealand...</div>
        <div className="bookmark-item">DFIR Review - DFR...</div>
        <div className="bookmark-item">DFRWS USA 2024 -...</div>
        <div className="bookmark-item">Tổng công ty đường...</div>
        <div className="bookmark-item">Khoa CNTT - Courses...</div>
        <div className="bookmark-item search-box">Search results for "..."</div>
      </nav>

      <main className="dashboard-page">
        <div className="page-header">
          <div className="brand">MY APP</div>
          <div className="nav-links">
            <span>Home</span>
            <span>Link</span>
            <span>Options</span>
          </div>
        </div>

        <section className="hero-banner">
          <button className="hero-arrow" type="button" aria-label="Previous slide">‹</button>

          <div className="hero-content">
            <h1>{getGreeting()}</h1>
            <p>Cybers and Spaces.</p>
            <div className="underline" />
          </div>

          <button className="hero-arrow" type="button" aria-label="Next slide">›</button>
        </section>

        <section className="student-table-panel">
          <div className="table-head">
            <span>Name</span>
            <span>ID</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div className="empty-state">Loading students...</div>
          ) : students.length > 0 ? (
            students.map((student) => (
              <div className="table-row" key={student.id ?? student.maSV ?? student.ten}>
                <span>{student.ten || 'Unknown Name'}</span>
                <span>{student.id ?? student.maSV ?? '-'}</span>
                <span className="status-badge">Active</span>
              </div>
            ))
          ) : (
            <div className="empty-state">No students found.</div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
