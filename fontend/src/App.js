import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gọi API lấy dữ liệu (Nếu backend bị lỗi, sẽ lấy dữ liệu mặc định để hiển thị)
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/data');
        setData(Array.isArray(response.data) ? response.data : [response.data]);
      } catch (error) {
        console.warn("Chưa kết nối API Backend, hiển thị dữ liệu mẫu:", error.message);
        // Dữ liệu mẫu khớp với hình ảnh giao diện yêu cầu
        setData([
          { id: 1, name: "John Doe", status: "Active" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* 1. HEADER / NAVBAR (Có hỗ trợ Hamburger Menu trên Mobile) */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
        <div class="container-fluid px-4">
          <a class="navbar-brand fw-bold" href="#home">MY APP</a>
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav" 
            aria-controls="navbarNav" 
            aria-expanded="false" 
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <a className="nav-link active" href="#home">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#link">Link</a>
              </li>
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#options" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  Options
                </a>
                <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                  <li><a className="dropdown-item" href="#option1">Option 1</a></li>
                  <li><a className="dropdown-item" href="#option2">Option 2</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* 2. BANNER / CAROUSEL SLIDER */}
      <div id="bannerCarousel" className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-indicators">
          <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
          <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
          <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
        </div>
        <div className="carousel-inner">
          <div className="carousel-item active">
            <div 
              className="d-flex flex-column justify-content-center align-items-center text-white p-5 text-center"
              style={{
                height: '240px',
                background: 'linear-gradient(135deg, #20b2aa, #708090)',
              }}
            >
              <h1 className="fw-bold fs-2">Good Morning</h1>
              <p className="fs-6 opacity-75">Cybers and Spaces.</p>
            </div>
          </div>
          <div className="carousel-item">
            <div 
              className="d-flex flex-column justify-content-center align-items-center text-white p-5 text-center"
              style={{
                height: '240px',
                background: 'linear-gradient(135deg, #008080, #2f4f4f)',
              }}
            >
              <h1 className="fw-bold fs-2">Good Afternoon</h1>
              <p className="fs-6 opacity-75">Spaces and Cybers.</p>
            </div>
          </div>
        </div>
        <button className="carousel-control-prev" type="button" data-bs-target="#bannerCarousel" data-bs-slide="prev">
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Previous</span>
        </button>
        <button className="carousel-control-next" type="button" data-bs-target="#bannerCarousel" data-bs-slide="next">
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Next</span>
        </button>
      </div>

      {/* 3. MAIN CONTENT (BẢNG HIỂN THỊ DỮ LIỆU CÓ DÙNG API / AXIOS) */}
      <div className="container-fluid px-4 my-3 flex-grow-1">
        {loading ? (
          <div className="text-center my-4">Đang tải dữ liệu...</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="w-50 fw-bold">Name</th>
                  <th scope="col" className="w-25 fw-bold">ID</th>
                  <th scope="col" className="w-25 fw-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{item.name}</td>
                    <td>{item.id}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. FOOTER (CHÂN TRANG) */}
      <footer className="text-center py-3 border-top mt-auto bg-white">
        <p className="mb-0 text-dark fs-6">🎓 Hanoi, August 2026</p>
      </footer>
    </div>
  );
}

export default App;