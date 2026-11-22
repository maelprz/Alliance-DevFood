export default function CartStatus({ ready, error, retry }) {
  if (error) return (
    <div className="feature-status" role="alert">
      <span>{error}</span>
      <button type="button" className="secondary-button" onClick={retry}>Try again</button>
    </div>
  );

  if (!ready) return <p className="feature-status" role="status">Loading your cart…</p>;
  return null;
}
