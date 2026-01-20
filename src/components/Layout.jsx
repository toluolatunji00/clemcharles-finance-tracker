
export default function Layout({ children }) {
  return (
    <div className="app-shell">
      {/* HEADER */}
      <header className="header">

        {/* Page Title */}
        <h1>Clemcharles Finance Tracker</h1>
        
      </header>

      {/* MAIN CONTENT */}
      <main className="container">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <img src="/Clemcharles Logo.JPG" alt="Company Logo" />
      </footer>
    </div>
  );
}
