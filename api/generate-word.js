export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  // Check origin or referer - browsers send one of these
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const allowed = 'halahi47.vercel.app';
  
  const isAllowed = origin.includes(allowed) || referer.includes(allowed);
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }
 
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
    return res.status(500).json({ error: 'Failed to generate word info', details: e.message });
  }
}
