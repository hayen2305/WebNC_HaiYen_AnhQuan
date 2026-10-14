import 'bootstrap/dist/css/bootstrap.min.css';
import './main/css/App.css';
import Header from './components/Header';
import Banner from './components/Banner';
import Content from './components/Content';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="app-layout">
      <Header />
      <Banner />
      <Content />
      <Footer />
    </div>
  );
}
