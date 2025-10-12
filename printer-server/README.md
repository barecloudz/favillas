# Thermal Printer Server for Raspberry Pi

This is a local network printer server that receives print jobs from your Pizza Spin Rewards web app and sends them to your Epson thermal printer.

## Hardware Setup

- **Raspberry Pi 4** (4GB) connected to network via Ethernet
- **Epson Thermal Printer** at IP: `192.168.1.208` (connected via Ethernet)

## Installation on Raspberry Pi

### 1. Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Copy this folder to your Raspberry Pi

You can either:
- Clone the entire repository and navigate to `printer-server/`
- Or copy just this folder using SCP:

```bash
scp -r printer-server/ pi@<raspberry-pi-ip>:~/printer-server
```

### 3. Install dependencies

```bash
cd ~/printer-server
npm install
```

### 4. Test the connection

```bash
npm start
```

You should see:
```
🖨️  Thermal Printer Server Started
📡 Server running on port 3001
🖨️  Printer IP: 192.168.1.208:9100
Ready to receive print jobs...
```

### 5. **IMPORTANT: Set up auto-start on boot**

This ensures the printer server starts automatically whenever the Raspberry Pi boots up or restarts.

#### Step 1: Create a systemd service file

```bash
sudo nano /etc/systemd/system/printer-server.service
```

#### Step 2: Paste this configuration

```ini
[Unit]
Description=Thermal Printer Server for Pizza Orders
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/printer-server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

#### Step 3: Enable and start the service

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable printer-server

# Start the service now
sudo systemctl start printer-server

# Check that it's running
sudo systemctl status printer-server
```

You should see **"active (running)"** in green.

#### Step 4: Test auto-start by rebooting

```bash
sudo reboot
```

After the Pi reboots, check if the service is running:

```bash
sudo systemctl status printer-server
```

**The printer server will now automatically start every time the Raspberry Pi boots up!**

## Testing

### From your web app or browser:

```javascript
// Test health endpoint
fetch('http://<raspberry-pi-ip>:3001/health')
  .then(r => r.json())
  .then(console.log);

// Test print
fetch('http://<raspberry-pi-ip>:3001/print', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    receipt: {
      storeName: "Favilla's NY Pizza",
      orderId: 123,
      orderDate: new Date(),
      orderType: 'pickup',
      items: [
        {
          name: 'Pepperoni Pizza',
          quantity: 1,
          price: 12.99
        }
      ],
      subtotal: 12.99,
      tax: 1.04,
      total: 14.03
    }
  })
});
```

## Configuration

If you need to change the printer IP address, edit `server.js`:

```javascript
const PRINTER_IP = '192.168.1.208';  // Change this
const PRINTER_PORT = 9100;            // Usually don't need to change
```

## Troubleshooting

### Can't connect to printer
- Verify printer IP: `ping 192.168.1.208`
- Check printer is on the same network
- Verify ESC/POS port 9100 is open on the printer

### Web app can't reach the server
- Find your Pi's IP: `hostname -I`
- Make sure port 3001 isn't blocked by firewall
- Test from same network: `curl http://<pi-ip>:3001/health`

### View server logs
```bash
sudo journalctl -u printer-server -f
```

## Next Steps

Once the server is running on your Raspberry Pi, update your web app's printer configuration to point to:

```
http://<raspberry-pi-ip>:3001
```

This will be configured in your client app's thermal printer utility.
