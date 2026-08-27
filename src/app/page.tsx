// Temporary landing page; the dashboard UI will replace this in a later iteration.

export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Slanko</h1>
      <p>Backend scaffold running. Available API routes:</p>
      <ul>
        <li>
          <code>GET /api/health</code>
        </li>
        <li>
          <code>GET /api/users</code>
        </li>
        <li>
          <code>GET /api/clients</code>
        </li>
      </ul>
    </main>
  );
}
