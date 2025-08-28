import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Middleware to parse XML and text
app.use(express.text({ type: 'text/xml' }));
app.use(express.raw({ type: 'text/xml' }));

// Mock ePOS-Print endpoint
app.post('/cgi-bin/epos/service.cgi', (req, res) => {
  console.log('\n🖨️ MOCK PRINTER RECEIVED PRINT JOB:');
  console.log('=====================================');
  
  // Parse the XML to extract the text content
  const xmlContent = req.body.toString();
  const textMatch = xmlContent.match(/<text>(.*?)<\/text>/s);
  
  if (textMatch) {
    const printContent = textMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    console.log(printContent);
  } else {
    console.log('Raw XML:', xmlContent);
  }
  
  console.log('=====================================\n');
  
  // Send successful response
  res.setHeader('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<response success="true" code="" status="0" battery="6"/>
`);
});

// Health check
app.get('/', (req, res) => {
  res.send('Mock Epson Printer Server Running');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🖨️ Mock printer server running on http://localhost:${PORT}`);
  console.log('This will simulate an Epson printer and show print output in console');
  console.log('Update your test script to use printerIp: "localhost:8080"\n');
});