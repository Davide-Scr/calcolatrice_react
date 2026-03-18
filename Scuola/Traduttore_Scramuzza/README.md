# Polyglot AI — Traduttore Didattico

Aggiornato: script.js ora prova a scoprire automaticamente un modello funzionante tramite l'API ListModels e tenta diversi metodi (generateContent, generateMessage, generateText, generate) fino a trovare uno che risponda. Il modello scelto viene memorizzato in localStorage per velocizzare le chiamate successive.

Note importanti:
- La demo inserisce la API Key direttamente nel client: NON farlo in produzione. Rigenera la chiave dopo la consegna.
- Se riscontri ancora problemi, apri la Console (F12) e cerca i log di "Lista modelli" o gli errori HTTP.
