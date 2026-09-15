export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { messagesPayload } = req.body;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Qui carichiamo la chiave in modo sicuro dalle impostazioni di Vercel
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: messagesPayload,
        temperature: 0.6,
        // I token di reasoning rientrano in questo budget. Le risposte sono capped
        // a 60 parole (~90 token), quindi 512 lascia margine al ragionamento
        // senza pagare la latenza dei 1500 di prima.
        max_completion_tokens: 512,
        // gpt-oss non accetta "none": low è il minimo. Per risposte di due frasi
        // un ragionamento lungo è solo latenza.
        reasoning_effort: "low",
        top_p: 1,
        stream: false
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Errore interno" });
  }
}
