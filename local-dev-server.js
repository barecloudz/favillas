const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Function to load and execute Netlify functions
async function loadFunction(functionName) {
  try {
    const functionPath = path.join(__dirname, 'api', `${functionName}.ts`);
    delete require.cache[require.resolve(functionPath)];
    const func = require(functionPath);
    return func.handler || func.exports?.handler;
  } catch (error) {
    console.error(`Error loading function ${functionName}:`, error);
    return null;
  }
}

// Route handler for API calls
app.all('/api/:functionName', async (req, res) => {
  const { functionName } = req.params;

  console.log(`📞 API call: ${req.method} /api/${functionName}`);

  const handler = await loadFunction(functionName);

  if (!handler) {
    return res.status(404).json({
      error: `Function ${functionName} not found or failed to load`
    });
  }

  // Create Netlify-like event object
  const event = {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
  };

  // Create Netlify-like context object
  const context = {
    functionName,
    requestId: `local-${Date.now()}`,
  };

  try {
    const response = await handler(event, context);

    // Set headers if provided
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    // Send response
    res.status(response.statusCode || 200);

    if (response.body) {
      // Try to parse as JSON, fallback to string
      try {
        const jsonBody = JSON.parse(response.body);
        res.json(jsonBody);
      } catch {
        res.send(response.body);
      }
    } else {
      res.end();
    }

  } catch (error) {
    console.error(`💥 Function error:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Local dev server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints: http://localhost:${PORT}/api/{function-name}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});