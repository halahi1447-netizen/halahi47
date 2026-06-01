export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://halahi47.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Missing word' });
 
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
 
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `For the English word "${word}", respond ONLY with valid JSON (no markdown): {"category":"noun/verb/adjective/adverb/phrase","example":"A natural example sentence.","translation":"Arabic translation"}`
            }]
          }]
        })
      }
    );
 
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);
 
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
