export function ImportPage() {
  return (
    <div>
      <h1>Import JSON</h1>
      <p>Paste the JSON response from AI here to validate and save it.</p>
      <textarea
        placeholder="Paste JSON here..."
        style={{ width: '100%', height: '200px', marginTop: '1rem', background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.5rem' }}
      />
    </div>
  )
}
