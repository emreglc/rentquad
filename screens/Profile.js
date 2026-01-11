import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onEdit = () => Alert.alert('Bilgi', 'Profili düzenle (yakında)');
  const onLogout = async () => {
    setSigningOut(true);
    const { error } = await signOut();
    setSigningOut(false);
    if (error) {
      Alert.alert('Çıkış yapılamadı', error.message);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'RentQuad Sürücüsü';
  const email = user?.email || 'email tanımlı değil';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Profil</Text>

      <View style={styles.card}>
        <View style={styles.avatar}> 
          <MaterialCommunityIcons name="account-circle" size={80} color="#0A84FF" />
        </View>
  <Text style={styles.name}>{displayName}</Text>
  <Text style={styles.email}>{email}</Text>

        <View style={styles.row}>
          <View style={styles.badge}><Text style={styles.badgeText}>Standard</Text></View>
          <View style={[styles.badge, { backgroundColor: '#F0F6FF' }]}><Text style={[styles.badgeText, { color: '#0A84FF' }]}>100 Puan</Text></View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onEdit}>
            <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
            <Text style={styles.primaryText}>Profili Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={onLogout} disabled={signingOut}>
            {signingOut ? (
              <ActivityIndicator size="small" color="#0A84FF" />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={18} color="#0A84FF" />
                <Text style={styles.ghostText}>Çıkış Yap</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.list}>
        <ListItem icon="bell-outline" title="Bildirimler" />
        <ListItem icon="credit-card-outline" title="Ödeme Yöntemleri" />
        <ListItem icon="help-circle-outline" title="Yardım" />
        <ListItem icon="shield-check-outline" title="Gizlilik" />
      </View>
    </SafeAreaView>
  );
}

function ListItem({ icon, title }) {
  return (
    <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => {}}>
      <View style={styles.listLeft}>
        <MaterialCommunityIcons name={icon} size={22} color="#0A84FF" />
        <Text style={styles.listText}>{title}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#999" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  header: { fontSize: 22, fontWeight: '700', marginVertical: 12, color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: { alignItems: 'center', marginTop: 8 },
  name: { marginTop: 8, fontSize: 20, fontWeight: '700', textAlign: 'center', color: '#0f172a' },
  email: { marginTop: 4, fontSize: 14, textAlign: 'center', color: '#64748b' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eef2ff', borderRadius: 999 },
  badgeText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  actions: { marginTop: 16, flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  ghostBtn: {
    flex: 1,
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#cfe2ff',
  },
  ghostText: { color: '#0A84FF', fontWeight: '700' },
  list: { marginTop: 16, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  listItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6',
  },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listText: { fontSize: 15, color: '#0f172a' },
});
