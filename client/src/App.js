import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          HOLA MUNDO
        </p>
        <a
          className="App-link"
          href="http://localhost:5000/"
          target="_blank"
          rel="noopener noreferrer"
        >
          LINK IN BIO
        </a>
      </header>
    </div>
  );
}

export default App;
