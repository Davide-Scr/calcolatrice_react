// ========= CONFIGURATION =========
// API Key fornita dall'utente (inserita qui per la demo).
// ATTENZIONE: rigenera/cancella la chiave dopo la consegna.
const API_KEY = "AIzaSyBwgE03CXBwPpHZfscvxwRSw_FBbka-hvA";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// ======== UI ELEMENTS ========
const inputText = document.getElementById("inputText");
const sourceLanguage = document.getElementById("sourceLanguage");
const targetLanguage = document.getElementById("targetLanguage");
const submitBtn = document.getElementById("submitBtn");
const outputResult = document.getElementById("outputResult");

const translationBox = document.getElementById("translationBox");
const translationResult = document.getElementById("translationResult");
const explanationResult = document.getElementById("explanationResult");

// ======== UTILITY ========
function setLoading(isLoading){
  if(isLoading){
    submitBtn.disabled = true;
    submitBtn.textContent = "Analisi in corso…";
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = "Analizza Testo";
  }
}

function showOutput(htmlOrText){
  outputResult.innerHTML = "";
  const node = document.createElement("div");
  node.innerHTML = htmlOrText;
  outputResult.appendChild(node);
}

// ======== SANITIZE MARKDOWN ========
function sanitizeMarkdown(s){
  if(!s) return s;
  // remove code fences but keep inner
  s = s.replace(/```([\s\S]*?)```/g, '$1');
  // backticks
  s = s.replace(/`([^`]*)`/g, '$1');
  // bold/italic markers
  s = s.replace(/\*\*(.*?)\*\*/g, '$1');
  s = s.replace(/\*(.*?)\*/g, '$1');
  s = s.replace(/__(.*?)__/g, '$1');
  s = s.replace(/_(.*?)_/g, '$1');
  // leftover single asterisks (rare) remove
  s = s.replace(/\*+/g, '');
  return s.trim();
}

// ======== PROMPT ENGINEERING (modificato per source/target) ========
function buildPrompt(text, srcLang, tgtLang){
  const trimmed = (text || "").trim();
  const srcPart = (srcLang && srcLang !== 'Auto') ? (`dal ${srcLang} a ${tgtLang}`) : (`in ${tgtLang}`);
  // Prompt come richiesto: Traduci 'testo' in lingua. Inoltre, fornisci un esempio di utilizzo.
  return (
    "Agisci come un professore di lingue esperto e comprensibile. " +
    "Traduci il seguente testo " + srcPart + " e poi fornisci un esempio di utilizzo. " +
    "Etichetta la traduzione con 'Traduzione:' e l'esempio con 'Esempio:'.\n\n" +
    "Testo da tradurre: \"" + trimmed + "\"\n" +
    "Lingua di destinazione: " + tgtLang + "\n\n" +
    "Formato risposta: 1) Traduzione (etichettata 'Traduzione:'), 2) Esempio d'uso (etichettato 'Esempio:')."
  );
}

// ======== PARSING ========
function splitTranslationAndExample(fullText){
  if(!fullText) return { translation: "", example: "" };
  const sanitized = sanitizeMarkdown(fullText);
  const text = sanitized.trim();

  const lower = text.toLowerCase();
  const idxTrad = lower.indexOf("traduzione:");
  const idxEsemp = lower.indexOf("esempio:");

  if(idxTrad !== -1 && idxEsemp !== -1){
    const trad = text.substring(idxTrad + "traduzione:".length, idxEsemp).trim();
    const esempio = text.substring(idxEsemp + "esempio:".length).trim();
    return { translation: trad, example: esempio };
  }

  if(idxTrad !== -1 && idxEsemp === -1){
    const trad = text.substring(idxTrad + "traduzione:".length).trim();
    return { translation: trad, example: "" };
  }

  if(idxTrad === -1 && idxEsemp !== -1){
    const trad = text.substring(0, idxEsemp).trim();
    const esempio = text.substring(idxEsemp + "esempio:".length).trim();
    return { translation: trad, example: esempio };
  }

  // fallback: separazione per doppio newline
  const parts = text.split(/\n\s*\n/);
  if(parts.length >= 2){
    return { translation: parts[0].trim(), example: parts.slice(1).join("\n\n").trim() };
  }

  // fallback: tutto nella traduzione
  return { translation: text, example: "" };
}

// ======== HELPER: extract text from unknown model response ========
function extractModelText(obj){
  try {
    if(!obj) return null;
    if(obj.candidates && obj.candidates.length){
      const cand = obj.candidates[0];
      if(cand.content && cand.content.parts && cand.content.parts.length){
        return cand.content.parts.map(p => p.text || "").join("\n");
      }
    }
    if(obj.output && obj.output.length && obj.output[0].content && obj.output[0].content.parts){
      return obj.output[0].content.parts.map(p => p.text || "").join("\n");
    }
    // search recursively for longest string field
    const visited = new Set();
    let found = "";
    function recurse(o){
      if(!o || typeof o !== 'object' || visited.has(o)) return;
      visited.add(o);
      for(const k of Object.keys(o)){
        const v = o[k];
        if(typeof v === 'string' && v.trim().length > found.length){
          found = v.trim();
        } else if(typeof v === 'object'){
          recurse(v);
        }
      }
    }
    recurse(obj);
    return found || null;
  } catch(e){
    return null;
  }
}

// ======== DISCOVER MODELS ========
async function listModels(){
  const url = `${BASE_URL}/models?key=${API_KEY}`;
  const res = await fetch(url);
  if(!res.ok){
    const txt = await res.text();
    throw new Error(`ListModels HTTP ${res.status}: ${txt}`);
  }
  const data = await res.json();
  console.log("Lista modelli:", data);
  return data.models || [];
}

// Try one model with multiple possible method suffixes and body shapes
async function tryModel(modelName, prompt){
  const candidates = [
    { method: 'generateContent', body: { contents: [{ parts: [{ text: prompt }] }] } },
    { method: 'generateMessage', body: { messages: [{ author: 'user', content: [{ type: 'text', text: prompt }] }] } },
    { method: 'generateText', body: { prompt: prompt } },
    { method: 'generate', body: { input: prompt } }
  ];

  for(const c of candidates){
    const endpoint = `${BASE_URL}/${modelName}:${c.method}?key=${API_KEY}`;
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c.body)
      });
      if(!r.ok) continue;
      const data = await r.json();
      const text = extractModelText(data);
      if(text) return { text, modelName, method: c.method, raw: data };
      return { text: JSON.stringify(data, null, 2), modelName, method: c.method, raw: data };
    } catch(e){
      continue;
    }
  }
  return null;
}

// ======== MAIN CALL ROUTINE ========
async function generateWithAutoModel(prompt){
  const cache = localStorage.getItem('chosenModel');
  if(cache){
    try{
      const info = JSON.parse(cache);
      const tryCached = await tryModel(info.name, prompt);
      if(tryCached) return tryCached;
    }catch(e){/*ignore*/}
  }

  const models = await listModels();
  const prefer = models.slice().sort((a,b)=>{
    const an = (a.name||'').toLowerCase();
    const bn = (b.name||'').toLowerCase();
    const score = name => (name.includes('gemini')? -10 : name.includes('bison')? -5 : 0);
    return score(an)-score(bn);
  });

  for(const m of prefer){
    const name = m.name || m.model || m;
    const res = await tryModel(name, prompt);
    if(res){
      localStorage.setItem('chosenModel', JSON.stringify({ name, method: res.method }));
      return res;
    }
  }
  throw new Error('Nessun modello disponibile ha risposto correttamente al prompt. Controlla la ListModels nella Console per i dettagli.');
}

async function callAI(promptCompleto){
  return await generateWithAutoModel(promptCompleto);
}

// ======== EVENT HANDLER ========
submitBtn.addEventListener('click', async ()=>{
  const text = inputText.value;
  const src = sourceLanguage.value;
  const tgt = targetLanguage.value;

  if(!API_KEY){
    showOutput("<p style='color:orange'>Errore: API Key non configurata.</p>");
    return;
  }
  if(!text || text.trim().length===0){
    showOutput("<p style='color:orange'>Inserisci del testo da tradurre.</p>");
    return;
  }

  setLoading(true);
  showOutput("<p class='placeholder'>Invio la richiesta all'API… controlla la Console per dettagli (F12).</p>");
  translationBox.hidden = true;
  translationResult.innerHTML = '';
  explanationResult.innerHTML = '';

  const promptCompleto = buildPrompt(text, src, tgt);
  console.log('Prompt:', promptCompleto);

  try{
    const result = await callAI(promptCompleto);
    console.log('Risposta grezza:', result.raw || result);
    const full = result.text || result;
    const parsed = splitTranslationAndExample(full);

    // Sanitize final displayed strings (already sanitized inside parser, but extra pass)
    const trad = sanitizeMarkdown(parsed.translation) || "";
    const esempio = sanitizeMarkdown(parsed.example) || "";

    translationResult.innerHTML = trad ? trad.replace(/\n/g, '<br/>') : "<em>Nessuna traduzione trovata nella risposta.</em>";
    explanationResult.innerHTML = esempio ? esempio.replace(/\n/g, '<br/>') : "<em>Nessun esempio trovato nella risposta.</em>";

    translationBox.hidden = false;

    showOutput("<strong>Risultato ("+result.modelName+" via "+result.method+"):</strong><div style='margin-top:8px;font-size:0.85rem;color:var(--muted);'>Traduzione ed esempio mostrati qui sopra.</div>");
  }catch(err){
    console.error(err);
    showOutput("<p style='color:#ffb4b4'>Si è verificato un errore: "+(err.message||err)+"</p>");
  }finally{
    setLoading(false);
  }
});
