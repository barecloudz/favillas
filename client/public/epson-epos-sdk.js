/**
 * Epson ePOS SDK for JavaScript
 * Simplified version for direct thermal printer access from browser
 * Based on Epson's ePOS-Print API
 */

window.epson = window.epson || {};

/**
 * ePOS Print Builder
 * Creates ESC/POS commands for Epson thermal printers
 */
window.epson.ePOSBuilder = function() {
  this.message = '';

  this.addTextLang = function(lang) { return this; };
  this.addTextAlign = function(align) {
    // 0=left, 1=center, 2=right
    this.message += '\x1ba' + String.fromCharCode(align);
    return this;
  };
  this.addTextSize = function(width, height) {
    // Size multiplier (1-8)
    const size = ((width - 1) << 4) | (height - 1);
    this.message += '\x1d!' + String.fromCharCode(size);
    return this;
  };
  this.addText = function(text) {
    this.message += text;
    return this;
  };
  this.addTextStyle = function(reverse, underline, bold, color) {
    if (bold) this.message += '\x1bE\x01';
    else this.message += '\x1bE\x00';
    return this;
  };
  this.addFeedLine = function(lines) {
    this.message += '\n'.repeat(lines || 1);
    return this;
  };
  this.addCut = function(type) {
    // Partial cut
    this.message += '\x1dV\x41\x03';
    return this;
  };
  this.toString = function() {
    return this.message;
  };
};

/**
 * ePOS Device
 * Handles communication with Epson thermal printer
 */
window.epson.ePOSDevice = function() {
  this.connect = function(ipAddress, port, callback) {
    this.ipAddress = ipAddress;
    this.port = port || 8008;
    console.log(`Connecting to printer at ${ipAddress}:${this.port}`);

    // Simulate connection success
    setTimeout(() => {
      callback('OK');
    }, 100);
  };

  this.createDevice = function(deviceId, deviceType, options, callback) {
    const printer = new window.epson.ePOSPrint(this.ipAddress, this.port);
    callback(printer, 'OK');
  };

  this.disconnect = function() {
    console.log('Disconnected from printer');
  };
};

/**
 * ePOS Print
 * Sends print data to the printer
 */
window.epson.ePOSPrint = function(ipAddress, port) {
  this.ipAddress = ipAddress;
  this.port = port;

  this.send = function(message) {
    console.log('Sending to printer:', this.ipAddress, this.port);

    // Send via ePOS-Print XML API
    const url = `http://${this.ipAddress}:${this.port}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;

    // Convert ESC/POS to ePOS XML commands
    const xmlMessage = this.convertToXML(message);

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""',
        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'
      },
      body: xmlMessage,
      mode: 'no-cors' // Important: bypass CORS for local printer
    }).then(response => {
      console.log('Print response:', response);
      if (this.onreceive) {
        this.onreceive({ success: true });
      }
      return response;
    }).catch(error => {
      console.error('Print error:', error);
      if (this.onerror) {
        this.onerror(error);
      }
      throw error;
    });
  };

  this.convertToXML = function(message) {
    // Convert ESC/POS message to ePOS-Print XML
    const escapedMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '&#10;');

    return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>${escapedMessage}</text>
      <cut type="partial"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;
  };

  this.onreceive = null;
  this.onerror = null;
};

console.log('Epson ePOS SDK loaded');
