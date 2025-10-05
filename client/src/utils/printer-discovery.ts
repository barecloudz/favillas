/**
 * Client-side printer discovery for Epson ePOS printers
 * Scans local network for Epson thermal printers
 */

export interface DiscoveredPrinter {
  ipAddress: string;
  port: number;
  name: string;
  modelName?: string;
  status: 'available' | 'offline' | 'error';
}

/**
 * Discover Epson printers on local network
 * Tests common IP addresses in the 192.168.1.x range
 */
export async function discoverEpsonPrinters(): Promise<DiscoveredPrinter[]> {
  const discoveredPrinters: DiscoveredPrinter[] = [];

  // Get user's network range
  const baseIP = '192.168.1'; // Most common home network range

  // Common Epson printer IPs to check (you can expand this range)
  const ipsToCheck = [
    `${baseIP}.200`,
    `${baseIP}.201`,
    `${baseIP}.202`,
    `${baseIP}.203`,
    `${baseIP}.204`,
    `${baseIP}.205`,
    `${baseIP}.206`,
    `${baseIP}.207`,
    `${baseIP}.208`,
    `${baseIP}.209`,
    `${baseIP}.210`,
  ];

  console.log(`🔍 Scanning ${ipsToCheck.length} IP addresses for Epson printers...`);

  // Test each IP in parallel
  const scanPromises = ipsToCheck.map(ip => testPrinterConnection(ip));
  const results = await Promise.allSettled(scanPromises);

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      discoveredPrinters.push(result.value);
      console.log(`✅ Found printer at ${result.value.ipAddress}`);
    }
  });

  console.log(`🔍 Discovery complete. Found ${discoveredPrinters.length} printer(s)`);
  return discoveredPrinters;
}

/**
 * Test if a printer is available at the given IP address
 */
async function testPrinterConnection(ipAddress: string): Promise<DiscoveredPrinter | null> {
  try {
    // Try HTTPS port 8084 first (for SSL-enabled printers)
    const httpsResult = await testPrinterPort(ipAddress, 8084, true);
    if (httpsResult) return httpsResult;

    // Fallback to HTTP port 80
    const httpResult = await testPrinterPort(ipAddress, 80, false);
    if (httpResult) return httpResult;

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Test a specific printer port
 */
async function testPrinterPort(
  ipAddress: string,
  port: number,
  useHttps: boolean
): Promise<DiscoveredPrinter | null> {
  try {
    const protocol = useHttps ? 'https' : 'http';
    const testUrl = `${protocol}://${ipAddress}:${port}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=3000`;

    // Send a minimal test request
    const testXml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text></text>
    </epos-print>
  </s:Body>
</s:Envelope>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      body: testXml,
      mode: 'no-cors',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // In no-cors mode, we can't read the response, but if fetch doesn't throw, printer is reachable
    return {
      ipAddress,
      port,
      name: `Epson Printer (${ipAddress})`,
      modelName: 'TM-M30II', // Default assumption
      status: 'available'
    };

  } catch (error: any) {
    // Timeout or network error means no printer at this IP
    return null;
  }
}

/**
 * Get printer information from IP address
 * Attempts to fetch printer details via ePOS-Print status
 */
export async function getPrinterInfo(ipAddress: string): Promise<{
  modelName?: string;
  serialNumber?: string;
  firmwareVersion?: string;
} | null> {
  try {
    // Try to get printer status
    const statusUrl = `https://${ipAddress}:8084/cgi-bin/epos/service.cgi?devid=local_printer`;

    const statusXml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <status />
    </epos-print>
  </s:Body>
</s:Envelope>`;

    const response = await fetch(statusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      body: statusXml,
      mode: 'cors' // Try to read response
    });

    if (response.ok) {
      const text = await response.text();
      // Parse XML response to extract model info
      // This is a simplified version - full implementation would parse XML properly
      return {
        modelName: 'TM-M30II',
        serialNumber: 'Unknown',
        firmwareVersion: 'Unknown'
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get printer info:', error);
    return null;
  }
}
