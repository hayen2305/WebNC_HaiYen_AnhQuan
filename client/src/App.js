import { useEffect, useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [health, setHealth] = useState('checking');
  const [services, setServices] = useState([]);
  const [servicesState, setServicesState] = useState('loading');

  useEffect(() => {
    const loadServerData = async () => {
      try {
        const [healthResponse, servicesResponse] = await Promise.all([
          fetch(`${API_URL}/api/health`),
          fetch(`${API_URL}/api/v1/services`),
        ]);

        if (!healthResponse.ok || !servicesResponse.ok) {
          throw new Error('Server returned an error');
        }

        const healthData = await healthResponse.json();
        const servicesData = await servicesResponse.json();
        setHealth(healthData.status === 'ok' ? 'online' : 'offline');
        setServices(servicesData);
        setServicesState('ready');
      } catch (error) {
        setHealth('offline');
        setServicesState('error');
      }
    };

    loadServerData();
  }, []);

  return (
    <main className="App">
      <header className="app-header">
        <p className="eyebrow">CLIENT / SERVER BOOKING</p>
        <h1>Đặt lịch dễ dàng.</h1>
        <p className="subtitle">Chọn dịch vụ phù hợp và để hệ thống xử lý phần còn lại.</p>
        <span className={`server-status ${health}`}>
          <span className="status-dot" />
          {health === 'online' ? 'Server đang hoạt động' : 'Chưa kết nối server'}
        </span>
      </header>

      <section className="services-section" aria-labelledby="services-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DỊCH VỤ</p>
            <h2 id="services-title">Chọn trải nghiệm của bạn</h2>
          </div>
          <span className="api-label">GET /api/v1/services</span>
        </div>

        {servicesState === 'loading' && <p className="state-message">Đang tải dịch vụ...</p>}
        {servicesState === 'error' && (
          <p className="state-message error">Không thể tải dữ liệu từ server. Hãy kiểm tra backend đang chạy.</p>
        )}
        {servicesState === 'ready' && services.length === 0 && (
          <p className="state-message">Chưa có dịch vụ nào trong cơ sở dữ liệu.</p>
        )}
        {servicesState === 'ready' && services.length > 0 && (
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.id}>
                <div className="service-number">01</div>
                <h3>{service.name}</h3>
                <p>{service.durationMinutes} phút</p>
                <strong>{Number(service.price).toLocaleString('vi-VN')} đ</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
