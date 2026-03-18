require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// POST /api/attendance
// Receives the processed JSON payload from the frontend and pushes it to MongoDB Data API
app.post('/api/attendance', async (req, res) => {
  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ success: false, error: 'No documents provided for insertion.' });
    }

    const mongoUrl = process.env.MONGO_API_URL;
    const mongoKey = process.env.MONGO_API_KEY;
    const dbName = process.env.DATABASE_NAME;
    const colName = process.env.COLLECTION_NAME;
    const cluster = process.env.CLUSTER_NAME;

    // Based on the Apps Script format requested by the user:
    const payload = {
      dataSource: cluster,
      database: dbName,
      collection: colName,
      documents: documents
    };

    const response = await axios.post(mongoUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': mongoKey
      }
    });

    if (response.status >= 200 && response.status < 300) {
      return res.status(200).json({ success: true, message: `Successfully inserted ${documents.length} records.`, data: response.data });
    } else {
      console.error('MongoDB API returned unexpected status:', response.status, response.data);
      return res.status(response.status).json({ success: false, error: 'MongoDB Data API Error', details: response.data });
    }

  } catch (err) {
    console.error('Error inserting into MongoDB:', err.message);
    if (err.response) {
      console.error('Mongo Error Response:', err.response.data);
      return res.status(err.response.status).json({ success: false, error: err.response.data });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error', details: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`Waiting for parsed CSV data from frontend...`);
});
