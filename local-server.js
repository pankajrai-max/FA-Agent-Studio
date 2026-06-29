// Local development API proxy → OpenAI
// Run: node local-server.js   (requires: npm install express dotenv)
import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'OPENAI_API_KEY not set in .env file' } });
  }
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const messages = [];
    if (req.body.system) messages.push({ role: 'system', content: req.body.system });
    for (const m of (req.body.messages || [])) messages.push({ role: m.role, content: m.content });

    const oaResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: Math.min(req.body.max_tokens || 4096, 8192), messages }),
    });
    const data = await oaResp.json();
    if (!oaResp.ok) {
      return res.status(oaResp.status).json({ error: data.error || { message: `OpenAI returned ${oaResp.status}` } });
    }
    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: { message: error.message } });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ FA Agent Studio proxy (OpenAI) on http://localhost:${PORT}`);
  console.log(`   Make sure OPENAI_API_KEY is set in .env`);
});
