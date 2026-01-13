import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

/**
 * Generates a QR code for a vehicle that can only be scanned within the app
 * 
 * QR Code Format: RENTQUAD_VEHICLE:{vehicle_id}
 * 
 * This format ensures that:
 * - QR codes are only useful within the RentQuad app
 * - External QR scanners won't understand the format
 * - The app validates and handles vehicle IDs directly
 * 
 * @param {Object} vehicle - The vehicle object with id, code, and display_name
 * @param {number} size - QR code size in pixels (default: 200)
 */
const VehicleQRCode = ({ vehicle, size = 200 }) => {
  if (!vehicle || !vehicle.id) return null;
  
  // Simple format: just the vehicle ID
  // The app's QR scanner will know how to handle this
  const qrData = `RENTQUAD_VEHICLE:${vehicle.id}`;
  
  return (
    <View style={styles.container}>
      <QRCode
        value={qrData}
        size={size}
        backgroundColor="white"
        color="black"
      />
      <Text style={styles.vehicleCode}>
        {vehicle.code || vehicle.display_name || `Vehicle ${vehicle.id}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  vehicleCode: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});

export default VehicleQRCode;
