import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import supabase from '../lib/supabaseClient';
import formatVehicleTitle from '../lib/vehicleUtils';
import { useRentalFlowContext } from '../hooks/useRentalFlow';

export default function ScanQR() {
  const navigation = useNavigation();
  const { activeCar, scanVehicle, phase } = useRentalFlowContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('ScanQR - activeCar:', activeCar);
    console.log('ScanQR - phase:', phase);
  }, [activeCar, phase]);

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
        onBarcodeScanned={async (result) => {
          if (scanned || processing) return;
          
          const data = result?.data;
          
          // Check if this is a RentQuad vehicle QR code
          if (data?.startsWith('RENTQUAD_VEHICLE:')) {
            setScanned(true);
            setProcessing(true);
            const vehicleId = data.replace('RENTQUAD_VEHICLE:', '');
            
            try {
              // If there's already a reserved vehicle, check if this matches
              console.log('Checking reservation - activeCar:', activeCar, 'scannedId:', vehicleId);
              
              if (activeCar) {
                console.log('Active car found:', activeCar.id, 'vs scanned:', vehicleId);
                if (activeCar.id === vehicleId) {
                  // Correct vehicle scanned - navigate back and trigger scan
                  navigation.navigate('Ana Sayfa', {
                    completeScanForVehicle: vehicleId,
                  });
                  setProcessing(false);
                } else {
                  // Wrong vehicle scanned - different from reserved
                  Alert.alert(
                    'Yanlış Araç!',
                    `Rezerve ettiğiniz araç: ${activeCar.code || activeCar.title}\n\nLütfen rezerve ettiğiniz aracın QR kodunu taratın veya rezervasyonu iptal edin.`,
                    [
                      { 
                        text: 'Tamam', 
                        style: 'cancel',
                        onPress: () => { 
                          setScanned(false); 
                          setProcessing(false); 
                        } 
                      }
                    ]
                  );
                }
                return;
              }
              
              // No reserved vehicle - start new rental
              // Fetch vehicle details from database
              const { data: vehicleData, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', vehicleId)
                .single();
              
              if (error || !vehicleData) {
                Alert.alert(
                  'Araç Bulunamadı',
                  'Bu QR koduna ait araç sistemde bulunamadı.',
                  [{ text: 'Tekrar Dene', onPress: () => { setScanned(false); setProcessing(false); } }]
                );
                return;
              }
              
              // Check if vehicle is available
              if (vehicleData.status !== 'available') {
                Alert.alert(
                  'Araç Müsait Değil',
                  `${vehicleData.code || 'Bu araç'} şu anda kullanımda veya bakımda. Lütfen başka bir araç seçin.`,
                  [{ text: 'Tamam', onPress: () => { setScanned(false); setProcessing(false); } }]
                );
                return;
              }
              
              // Parse vehicle location
              let latitude = null;
              let longitude = null;
              if (vehicleData.current_location) {
                const locationStr = vehicleData.current_location;
                const clean = locationStr.startsWith('\\x') ? locationStr.slice(2) : locationStr;
                if (clean.length >= 34) {
                  const buffer = new ArrayBuffer(clean.length / 2);
                  const view = new DataView(buffer);
                  for (let i = 0; i < clean.length; i += 2) {
                    view.setUint8(i / 2, parseInt(clean.substr(i, 2), 16));
                  }
                  const littleEndian = view.getUint8(0) === 1;
                  let offset = 1;
                  const type = view.getUint32(offset, littleEndian);
                  offset += 4;
                  const EWKB_SRID_FLAG = 0x20000000;
                  if ((type & EWKB_SRID_FLAG) !== 0) {
                    offset += 4;
                  }
                  longitude = view.getFloat64(offset, littleEndian);
                  latitude = view.getFloat64(offset + 8, littleEndian);
                }
              }
              
              const vehicleForRental = {
                id: vehicleData.id,
                code: vehicleData.code,
                title: formatVehicleTitle(vehicleData),
                battery: vehicleData.battery_percent,
                latitude,
                longitude,
                ...vehicleData,
              };
              
              // Show confirmation dialog
              Alert.alert(
                'Kiralamayı Başlat?',
                `${vehicleForRental.title}\nBatarya: ${vehicleForRental.battery}%\n\nBu aracı kiralamak istediğinize emin misiniz?`,
                [
                  {
                    text: 'İptal',
                    style: 'cancel',
                    onPress: () => {
                      setScanned(false);
                      setProcessing(false);
                    }
                  },
                  {
                    text: 'Kirala',
                    onPress: () => {
                      // Navigate to Home and start rental
                      navigation.navigate('Ana Sayfa', {
                        startRentalForVehicle: vehicleForRental,
                      });
                      setProcessing(false);
                      // Don't reset scanned so camera doesn't restart immediately
                    }
                  }
                ]
              );
              
            } catch (err) {
              console.error('Error fetching vehicle:', err);
              Alert.alert(
                'Hata',
                'Araç bilgileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.',
                [{ text: 'Tamam', onPress: () => { setScanned(false); setProcessing(false); } }]
              );
            }
          } else {
            // Invalid QR code
            setScanned(true);
            Alert.alert(
              'Geçersiz QR Kod', 
              'Bu QR kodu RentQuad uygulamasına ait değil. Lütfen aracın üzerindeki QR kodu taratın.',
              [
                { text: 'Tekrar Dene', onPress: () => { setScanned(false); setProcessing(false); } }
              ]
            );
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
          {activeCar ? (
            <>
              <Text style={styles.sheetTitle}>Rezerve Edilmiş Araç</Text>
              <Text style={styles.sheetDescription}>
                {activeCar.code || activeCar.title} için QR kodunu taratın
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>QR Kodunu Tara</Text>
              <Text style={styles.sheetDescription}>
                Kiralamayı Başlatmak İçin Aracın Üzerindeki QR Kodunu Taratın
              </Text>
            </>
          )}
          {processing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator color="#0A84FF" size="small" />
              <Text style={styles.processingText}>Araç bilgileri yükleniyor...</Text>
            </View>
          ) : scanned ? (
            <Button title="Tekrar Tara" onPress={() => { setScanned(false); setProcessing(false); }} />
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
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
});
