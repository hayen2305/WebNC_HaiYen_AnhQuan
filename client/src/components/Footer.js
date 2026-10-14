export default function Footer() {
  const d = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return (
    <footer id="about" className="app-footer">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6" />
      </svg>
      <span>Hanoi, {d}</span>
    </footer>
  );
}
