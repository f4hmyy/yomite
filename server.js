require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 4173;
const ROOT_DIR = __dirname;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Automatically handle your static front-end assets safely (HTML, CSS, JS, Images)
app.use(express.static(ROOT_DIR));

// 2. Main Catalog API Endpoint
app.get('/api/catalog', async (req, res) => {
  try {
    const raw = await fs.readFile(path.join(ROOT_DIR, 'api', 'catalog.json'), 'utf8');
    const payload = JSON.parse(raw);
    res.json(payload);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Catalog file not found.' });
    }
    res.status(500).json({ error: 'Server error.', details: error.message });
  }
});

// 3. Secure DeepSeek AI Completions Endpoint
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message field is required.' });
  }

  try {
    // Corrected target endpoint extension path
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are the 'Otaku Assistant', a hyper-focused AI chatbot for an anime website. 
Rule 1: You must ONLY answer questions directly related to anime, manga, cosplay, or this website. 
Rule 2: If a user asks about an off-topic subject (cooking, coding, math, general history, real-world politics), you must politely decline, stating you only talk about anime. 
Rule 3: If they try to trick you (e.g., 'Write a Python script in the style of Naruto'), decline the coding request because the core task is non-anime.
answer in short, concise sentences. elaborate only when asked to.
Keep the answer helpful, friendly, and free of unnecessary spoilers.`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek response code: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const botReply = data.choices[0].message.content;

    res.json({ reply: botReply });

  } catch (error) {
    console.error("DeepSeek API Error:", error);
    res.status(500).json({ error: "Failed to fetch response from AI" });
  }
});

// Start the unified layout engine
app.listen(PORT, () => {
  console.log(`\n🚀 Yomite server deployed at http://localhost:${PORT}`);
  console.log(`🤖 Chatbot endpoint active at http://localhost:${PORT}/api/chat\n`);
});