/**
 * Script to generate QR code images for all vehicles
 * 
 * Usage: node scripts/generate-qr-codes.js
 * 
 * This will create PNG images in the qr-codes/ directory
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
    model: 'RentQuad One',
  },
  {
    id: '1ff488dd-3ccf-4aba-b041-dc37ec1725bb',
    code: 'RQ-002',
    display_name: 'RentQuad One',
    model: 'RentQuad One',
  },
  {
    id: '395df293-2791-470c-9cc0-090e199e5f75',
    code: 'RQ-001',
    display_name: 'RentQuad One',
    model: 'RentQuad One',
  },
  {
    id: '4e179427-869e-4174-8e75-cd534592250d',
    code: 'RQ-004',
    display_name: 'RentQuad One',
    model: 'RentQuad One',
  },
  {
    id: '87851dbf-f00c-4b8b-87d2-973b92cc7873',
    code: 'RQ-005',
    display_name: 'RentQuad One',
    model: 'RentQuad One',
  },
];

// Create output directory
const outputDir = path.join(__dirname, '../qr-codes');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// QR code generation options
const qrOptions = {
  errorCorrectionLevel: 'H',
  type: 'image/png',
  quality: 1,
  margin: 2,
  width: 512,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

console.log('🔧 Generating QR codes for vehicles...\n');

// Generate QR code for each vehicle
vehicles.forEach((vehicle, index) => {
  const qrData = `RENTQUAD_VEHICLE:${vehicle.id}`;
  const fileName = `${vehicle.code}.png`;
  const filePath = path.join(outputDir, fileName);

  QRCode.toFile(filePath, qrData, qrOptions, (err) => {
    if (err) {
      console.error(`❌ Error generating QR for ${vehicle.code}:`, err);
    } else {
      console.log(`✅ Generated: ${fileName} (${vehicle.display_name})`);
    }

    // Print summary after last vehicle
    if (index === vehicles.length - 1) {
      console.log(`\n✨ Done! QR codes saved to: ${outputDir}`);
      console.log(`\n📋 To print these QR codes:`);
      console.log(`   1. Open the PNG files in the qr-codes/ folder`);
      console.log(`   2. Print them on sticker paper or labels`);
      console.log(`   3. Attach to the corresponding vehicles`);
    }
  });
});
