const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Cambia se necessario
    password: '', // Cambia se necessario
    database: 'progetto_maturita'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL Connected');
});

// RAWG API endpoint
const RAWG_API_URL = 'https://api.rawg.io/api/games';
const RAWG_API_KEY = 'YOUR_RAWG_API_KEY'; // Inserisci la tua API key

// Endpoint per ottenere giochi da RAWG
app.get('/api/games', async (req, res) => {
    try {
        const response = await axios.get(RAWG_API_URL, {
            params: {
                key: RAWG_API_KEY,
                page_size: 10,
                search: req.query.search || ''
            }
        });
        res.json(response.data.results);
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero giochi' });
    }
});

// ... Altri endpoint (login, recensioni, ecc.) ...

app.listen(3001, () => {
    console.log('Server avviato su http://localhost:3001');
});
