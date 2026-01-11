import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationAccess, setLocationAccess] = useState(true);

  const onLanguage = () => Alert.alert('Dil', 'Dil seçimi (dummy)');
  const onAbout = () => Alert.alert('Hakkında', 'RentQuad v1.0.0\nBu bir demo ayarlar ekranıdır.');
  const onClearCache = () => Alert.alert('Önbellek', 'Önbellek temizlendi (dummy)');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ayarlar</Text>

        <View style={styles.card}>
          <SectionTitle icon="tune" title="Tercihler" />
          <RowSwitch
            icon="bell-outline"
            title="Bildirimler"
            value={notifications}
            onValueChange={setNotifications}
          />
          <RowSwitch
            icon="theme-light-dark"
            title="Koyu Mod"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <RowSwitch
            icon="map-marker-radius-outline"
            title="Konum Erişimi"
            value={locationAccess}
            onValueChange={setLocationAccess}
          />
        </View>

        <View style={styles.card}>
          <SectionTitle icon="application-cog-outline" title="Uygulama" />
          <RowButton icon="earth" title="Dil" onPress={onLanguage} />
          <RowButton icon="information-outline" title="Hakkında" onPress={onAbout} />
          <RowButton icon="delete-outline" title="Önbelleği Temizle" onPress={onClearCache} danger />
        </View>

        <Text style={styles.version}>Sürüm 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitle}>
      <MaterialCommunityIcons name={icon} size={18} color="#0A84FF" />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function RowSwitch({ icon, title, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <MaterialCommunityIcons name={icon} size={22} color="#0A84FF" />
        <Text style={styles.rowText}>{title}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function RowButton({ icon, title, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <MaterialCommunityIcons name={icon} size={22} color={danger ? '#dc2626' : '#0A84FF'} />
        <Text style={[styles.rowText, danger && { color: '#dc2626' }]}>{title}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#999" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  sectionTitleText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e6e6e6',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { fontSize: 15, color: '#0f172a' },
  version: { textAlign: 'center', color: '#94a3b8', marginTop: 4 },
});
