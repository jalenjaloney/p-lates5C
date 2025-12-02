import { Link } from 'react-router-dom';

function App() {
  return (
    <main className="landing">
      <section className="panel">
        <h2>View The 5C&apos;s Menus</h2>
        <div className="action-row">
          <Link className="btn" to="/signup">
            Create account
          </Link>
          <Link className="btn btn--ghost" to="/signin">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

export default App;
