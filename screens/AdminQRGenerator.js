import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehicleQRCode from '../components/VehicleQRCode';
import supabase from '../lib/supabaseClient';

/**
 * Admin screen to generate QR codes for all vehicles
 * This screen is for printing/displaying QR codes that can be attached to physical vehicles
 */
export default function AdminQRGenerator() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, code, display_name, model, status')
        .order('code');

      if (error) throw error;

      if (data) {
        setVehicles(data);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Hata', 'Araçlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const renderVehicle = ({ item }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>
          {item.display_name || item.code || `Vehicle ${item.id}`}
        </Text>
        {item.model && <Text style={styles.vehicleModel}>{item.model}</Text>}
        <Text style={styles.vehicleId}>ID: {item.id}</Text>
      </View>
      <View style={styles.qrContainer}>
        <VehicleQRCode vehicle={item} size={180} />
      </View>
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Bu QR kodu yazdırın ve aracın üzerine yapıştırın
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Araç QR Kodları</Text>
        <Text style={styles.headerSubtitle}>
          {vehicles.length} araç için QR kod oluşturuldu
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadVehicles}>
          <Text style={styles.refreshButtonText}>Yenile</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={renderVehicle}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz araç bulunmuyor</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 QR kodları sadece RentQuad uygulaması içinde çalışır
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  vehicleInfo: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  vehicleId: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 16,
  },
  instructions: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  instructionText: {
    fontSize: 13,
    color: '#1e40af',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  footer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#fde68a',
  },
  footerText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
});
