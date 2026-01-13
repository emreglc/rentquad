/**
 * Script to generate an HTML page with all QR codes for easy printing
 * 
 * Usage: node scripts/generate-qr-codes-html.js
 * 
 * This will create an HTML file that you can open in a browser and print
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Vehicle data from the database
const vehicles = [
  {
    id: '0495f641-83d6-4efa-98e4-d775fd5d3432',
    code: 'RQ-003',
    display_name: 'RentQuad One',
    license_plate: '34 RQ 003',
  },
  {
    id: '1ff488dd-3ccf-4aba-b041-dc37ec1725bb',
    code: 'RQ-002',
    display_name: 'RentQuad One',
    license_plate: '34 RQ 002',
  },
  {
    id: '395df293-2791-470c-9cc0-090e199e5f75',
    code: 'RQ-001',
    display_name: 'RentQuad One',
    license_plate: '34 RQ 001',
  },
  {
    id: '4e179427-869e-4174-8e75-cd534592250d',
    code: 'RQ-004',
    display_name: 'RentQuad One',
    license_plate: '34 RQ 004',
  },
  {
    id: '87851dbf-f00c-4b8b-87d2-973b92cc7873',
    code: 'RQ-005',
    display_name: 'RentQuad One',
    license_plate: '34 RQ 005',
  },
];

// QR code generation options
const qrOptions = {
  errorCorrectionLevel: 'H',
  type: 'image/png',
  quality: 1,
  margin: 1,
  width: 400,
};

console.log('🔧 Generating HTML page with QR codes...\n');

// Generate QR codes as data URLs
Promise.all(
  vehicles.map(async (vehicle) => {
    const qrData = `RENTQUAD_VEHICLE:${vehicle.id}`;
    try {
      const dataUrl = await QRCode.toDataURL(qrData, qrOptions);
      console.log(`✅ Generated QR for ${vehicle.code}`);
      return {
        ...vehicle,
        qrDataUrl: dataUrl,
      };
    } catch (err) {
      console.error(`❌ Error generating QR for ${vehicle.code}:`, err);
      return null;
    }
  })
).then((vehiclesWithQR) => {
  // Filter out any failed generations
  const validVehicles = vehiclesWithQR.filter((v) => v !== null);

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RentQuad Vehicle QR Codes</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header h1 {
      font-size: 32px;
      color: #111827;
      margin-bottom: 8px;
    }

    .header p {
      color: #64748b;
      font-size: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }

    .vehicle-card {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .vehicle-code {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .vehicle-name {
      font-size: 16px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .vehicle-plate {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 24px;
      font-family: monospace;
    }

    .qr-container {
      background: #f1f5f9;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: inline-block;
    }

    .qr-container img {
      display: block;
      width: 280px;
      height: 280px;
    }

    .instructions {
      background: #eff6ff;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      color: #1e40af;
      margin-top: 16px;
    }

    .footer {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 14px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .header {
        box-shadow: none;
        border-bottom: 2px solid #e2e8f0;
        border-radius: 0;
      }

      .grid {
        gap: 40px;
      }

      .vehicle-card {
        box-shadow: none;
        border: 2px solid #e2e8f0;
      }

      .footer {
        display: none;
      }
    }

    @page {
      margin: 2cm;
    }

    .no-print {
      margin-bottom: 20px;
      text-align: center;
    }

    .print-button {
      background: #0A84FF;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(10, 132, 255, 0.3);
    }

    .print-button:hover {
      background: #0077ED;
    }

    @media print {
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚗 RentQuad Vehicle QR Codes</h1>
    <p>Araç Kiralama için QR Kodları</p>
  </div>

  <div class="no-print">
    <button class="print-button" onclick="window.print()">🖨️ Yazdır</button>
  </div>

  <div class="grid">
${validVehicles
  .map(
    (vehicle) => `
    <div class="vehicle-card">
      <div class="vehicle-code">${vehicle.code}</div>
      <div class="vehicle-name">${vehicle.display_name}</div>
      <div class="vehicle-plate">${vehicle.license_plate}</div>
      <div class="qr-container">
        <img src="${vehicle.qrDataUrl}" alt="${vehicle.code} QR Code">
      </div>
      <div class="instructions">
        Kiralamak için RentQuad uygulaması ile taratın
      </div>
    </div>
`
  )
  .join('')}
  </div>

  <div class="footer">
    <p>✨ Bu QR kodları sadece RentQuad uygulaması içinde çalışır</p>
    <p style="margin-top: 8px; font-size: 12px;">Oluşturulma: ${new Date().toLocaleString('tr-TR')}</p>
  </div>
</body>
</html>`;

  // Write HTML file
  const outputPath = path.join(__dirname, '../qr-codes.html');
  fs.writeFileSync(outputPath, html);

  console.log(`\n✨ Done! HTML file created: ${outputPath}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Open qr-codes.html in your browser`);
  console.log(`   2. Click the print button or use Ctrl+P`);
  console.log(`   3. Print to PDF or directly to sticker paper`);
  console.log(`   4. Cut and attach QR codes to vehicles\n`);
});
