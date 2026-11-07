export function HomePage() {
  return (
    <div>
      <h1>My Sets</h1>
      <p>Your folders and exercise sets will appear here.</p>
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px dashed #475569', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
        No sets yet. Go to <strong>Builder</strong> to create a prompt for AI, or <strong>Import</strong> a JSON you already have.
      </div>
    </div>
  )
}
