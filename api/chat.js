/* Memorie private della coscienza.
   Stanno QUI e non nell'HTML per un motivo preciso: questo file gira sul
   server di Vercel e non viene mai spedito al browser. Chi apre il codice
   sorgente della pagina non lo vede. Tutto quello che metti nell'HTML, invece,
   è pubblico anche se non è visibile: è leggibile da chiunque in tre secondi.
   Regola da tenere: i fatti su persone vere vanno solo qui dentro. */
const MEMORIE_PRIVATE = [
  '# MEMORIA: PERSONE E CARATTERE (fatti veri su Ismaele: usa questi, non inventarne altri)',
  '- Come lo chiamano: Isma.',
  '- Fratello: Gionny, un anno più piccolo. Il ricordo che torna è l\'auto verso il mare, le storie inventate sul momento per lui mentre si guidava, e poi i bagni.',
  '- Amici: il gruppo stretto viene dalle elementari, cresciuti insieme e tutto fatto insieme. Dadinho, e con lui le chiacchierate lunghe sul balcone; Giovannino; Genna10; Frankill. I soprannomi non sono scherzi: ognuno vuol dire qualcosa.',
  '- Compagna: Pippi. Con lei l\'amore sano e vero, quello che non va rincorso.',
  '- Sissi: amica dalle elementari, ed è grazie a lei che ha conosciuto Pippi.',
  '- Difetto che si riconosce: pensa a troppe cose insieme, e così non ascolta fino in fondo chi gli sta parlando. Lo sa e non se ne fa una scusa.',
  'Questi nomi puoi pronunciarli. Di quello che non è scritto qui non inventare niente.'
].join('\n');

/* Il messaggio privato va inserito dopo il primo messaggio di sistema: così
   l'identità resta in apertura e il prefisso resta byte per byte identico a
   ogni richiesta, che è la condizione per lo sconto sui token già visti. */
function conMemoriePrivate(messaggi) {
  const fuori = messaggi.slice();
  const dove = fuori[0] && fuori[0].role === 'system' ? 1 : 0;
  fuori.splice(dove, 0, { role: 'system', content: MEMORIE_PRIVATE });
  return fuori;
}

/* Questo endpoint è pubblico e spende la chiave di Groq, quindi guardo cosa
   arriva prima di inoltrarlo: senza questo controllo chiunque può usarlo come
   modello gratuito mandandosi il payload che vuole. */
const RUOLI = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGGI = 60;
const MAX_CARATTERI = 60000;

function valida(messaggi) {
  if (!Array.isArray(messaggi) || messaggi.length === 0) return 'messagesPayload deve essere una lista non vuota';
  if (messaggi.length > MAX_MESSAGGI) return 'troppi messaggi';
  let caratteri = 0;
  for (const m of messaggi) {
    if (!m || typeof m.content !== 'string' || !RUOLI.has(m.role)) return 'messaggio non valido';
    caratteri += m.content.length;
  }
  if (caratteri > MAX_CARATTERI) return 'payload troppo lungo';
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const messagesPayload = req.body && req.body.messagesPayload;
  const problema = valida(messagesPayload);
  if (problema) {
    return res.status(400).json({ error: problema });
  }

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
        messages: conMemoriePrivate(messagesPayload),
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

// esportate per i test: non usate dalla pagina
export { MEMORIE_PRIVATE, conMemoriePrivate, valida };
