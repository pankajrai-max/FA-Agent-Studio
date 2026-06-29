// Vercel serverless proxy → OpenAI (keeps the API key server-side).
// Accepts the app's Anthropic-style body {system, messages, max_tokens}
// and returns an Anthropic-shaped response so the front-end stays unchanged.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "OPENAI_API_KEY not configured on server" } });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || !Array.isArray(body.messages)) {
      return res.status(400).json({ error: { message: "Missing 'messages' array in request body" } });
    }

    // Change this line to "gpt-4o-mini" for cheaper runs, or set OPENAI_MODEL in env.
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    const messages = [];
    if (body.system) messages.push({ role: "system", content: body.system });
    for (const m of body.messages) messages.push({ role: m.role, content: m.content });

    const oaResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(body.max_tokens || 4096, 8192),
        messages,
      }),
    });

    const data = await oaResp.json();

    if (!oaResp.ok) {
      console.error("OpenAI API error:", oaResp.status, data);
      return res.status(oaResp.status).json({ error: data.error || { message: `OpenAI returned ${oaResp.status}` } });
    }

    const text = data.choices?.[0]?.message?.content || "";
    // Return Anthropic-shaped payload so the front-end's parser works unchanged.
    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: { message: "Internal server error: " + (error.message || "Unknown") } });
  }
}
