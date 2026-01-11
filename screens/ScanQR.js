import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Linking, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.center}><Text>İzin kontrol ediliyor...</Text></View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Kamera izni gerekli</Text>
        <Button title="İzin Ver" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <CameraView
        style={styles.camera}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={(result) => {
          if (scanned) return;
          setScanned(true);
          const data = result?.data;
          if (data?.startsWith('http')) {
            Linking.openURL(data).catch(() => {});
          }
        }}
      />
        {!cameraReady && (
          <View style={styles.cameraLoading}>
            <ActivityIndicator color="#38bdf8" size="large" />
            <Text style={styles.cameraLoadingText}>Kamera hazırlanıyor…</Text>
          </View>
        )}
        <View pointerEvents="none" style={styles.frameOverlay}>
          <View style={styles.frameBox}>
            <View style={[styles.frameCorner, styles.cornerTopLeft]} />
            <View style={[styles.frameCorner, styles.cornerTopRight]} />
            <View style={[styles.frameCorner, styles.cornerBottomLeft]} />
            <View style={[styles.frameCorner, styles.cornerBottomRight]} />
          </View>
        </View>
      </View>
      <View style={styles.sheetWrapper}>
        <View style={styles.sheetCard}>
          <Text style={styles.sheetTitle}>QR Kodunu Tara</Text>
          <Text style={styles.sheetDescription}>Kiralamayı Başlatmak İçin Aracın Üzerindeki QR Kodunu Taratın</Text>
          {scanned ? (
            <Button title="Tekrar Tara" onPress={() => setScanned(false)} />
          ) : (
            <Text style={styles.sheetHint}>Kamera hazır, kodu çerçeve içine getir.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  cameraLoadingText: {
    marginTop: 12,
    color: '#e2e8f0',
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameBox: {
    width: '68%',
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  frameCorner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderColor: '#38bdf8',
    borderWidth: 4,
    borderStyle: 'solid',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
  },
  sheetCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  sheetDescription: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 16,
  },
  sheetHint: {
    fontSize: 13,
    color: '#475569',
  },
});
