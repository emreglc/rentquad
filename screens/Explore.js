import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import supabase from '../lib/supabaseClient';
import formatVehicleTitle from '../lib/vehicleUtils';

const EXCLUDED_STATUSES = new Set(['reserved', 'in_use', 'retired']);

const toRad = (value) => (value * Math.PI) / 180;
const distanceMeters = (lat1, lon1, lat2, lon2) => {
    if ([lat1, lon1, lat2, lon2].some((v) => typeof v !== 'number')) return null;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const formatDistance = (meters) => {
    if (meters === null || meters === undefined) return 'Konum bekleniyor';
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
};

const batteryColor = (percentage) => {
    if (percentage > 60) return '#22c55e';
    if (percentage > 25) return '#f59e0b';
    return '#ef4444';
};

const parseWkbPoint = (hexString) => {
    try {
        if (!hexString) return null;
        const clean = hexString.startsWith('\\x') ? hexString.slice(2) : hexString;
        if (clean.length < 34) return null;
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
        const x = view.getFloat64(offset, littleEndian);
        offset += 8;
        const y = view.getFloat64(offset, littleEndian);
        return { latitude: y, longitude: x };
    } catch (error) {
        console.warn('WKB parse failed', error);
        return null;
    }
};

const parsePoint = (point) => {
    if (!point) return null;
    if (typeof point === 'string') {
        const clean = point.startsWith('\\x') ? point.slice(2) : point;
        if (/^[0-9a-fA-F]+$/.test(clean)) {
            return parseWkbPoint(point);
        }
        try {
            return parsePoint(JSON.parse(point));
        } catch (error) {
            return null;
        }
    }
    if (Array.isArray(point)) {
        const [lon, lat] = point;
        if (typeof lat === 'number' && typeof lon === 'number') {
            return { latitude: lat, longitude: lon };
        }
        return null;
    }
    if (typeof point === 'object') {
        if (Array.isArray(point.coordinates)) {
            const [lon, lat] = point.coordinates;
            if (typeof lat === 'number' && typeof lon === 'number') {
                return { latitude: lat, longitude: lon };
            }
        }
        if (typeof point.lat === 'number' && typeof point.lon === 'number') {
            return { latitude: point.lat, longitude: point.lon };
        }
    }
    return null;
};

const Explore = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const listRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(false);
    const [vehiclesError, setVehiclesError] = useState(null);

    const requestLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Konum izni verilmedi. Lütfen ayarlardan izin verin.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
            setLocationError(null);
        } catch (error) {
            setLocationError('Konum alınırken hata oluştu.');
        }
    }, []);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    const loadVehicles = useCallback(async () => {
        setVehiclesLoading(true);
        setVehiclesError(null);
        const { data, error } = await supabase
            .from('vehicles')
            .select('id, code, display_name, model, status, battery_percent, current_location, last_seen_at')
            .not('status', 'eq', 'retired');
        if (error) {
            setVehiclesError(error.message);
        } else {
            setVehicles(data || []);
        }
        setVehiclesLoading(false);
    }, []);

    useEffect(() => {
        loadVehicles();
        const interval = setInterval(loadVehicles, 30000);
        return () => clearInterval(interval);
    }, [loadVehicles]);

    const sortedVehicles = useMemo(() => {
        if (!vehicles.length) return [];
        const enriched = vehicles
            .map((vehicle) => {
                if (EXCLUDED_STATUSES.has(vehicle.status)) return null;
                const coords = parsePoint(vehicle.current_location);
                if (!coords) return null;
                const dist = location
                    ? distanceMeters(location.latitude, location.longitude, coords.latitude, coords.longitude)
                    : null;
                return {
                    id: vehicle.id,
                    title: formatVehicleTitle(vehicle),
                    code: vehicle.code,
                    model: vehicle.model || 'RentQuad One',
                    distance: dist,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    battery: Number(vehicle.battery_percent ?? 0),
                };
            })
            .filter(Boolean);
        return enriched.sort((a, b) => {
            if (a.distance === null && b.distance === null) return a.title.localeCompare(b.title);
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
        });
    }, [location, vehicles]);

    const handleViewOnMap = useCallback((vehicleId) => {
        navigation.navigate('Ana Sayfa', { targetVehicleId: vehicleId });
    }, [navigation]);

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <View style={styles.distanceBadge}>
                    <FontAwesome5 name="map-marker-alt" size={12} color="#1d4ed8" style={styles.distanceIcon} />
                    <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
                </View>
            </View>
            <View style={styles.batteryRow}>
                <Text style={styles.metaLabel}>Pil</Text>
                <View style={styles.batteryContainer}>
                    <View
                        style={[
                            styles.batteryFill,
                            {
                                width: `${Math.max(5, Math.min(100, Math.round(item.battery)))}%`,
                                backgroundColor: batteryColor(item.battery),
                            },
                        ]}
                    />
                </View>
                <Text style={styles.batteryText}>{Math.round(item.battery)}%</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => handleViewOnMap(item.id)}>
                <Text style={styles.primaryButtonText}>Aracı gör</Text>
            </TouchableOpacity>
        </View>
    );

    const listEmpty = () => (
        <View style={styles.emptyContainer}>
            {vehiclesLoading ? (
                <ActivityIndicator size="large" color="#0A84FF" />
            ) : (
                <Text style={styles.emptyText}>Yakınında görüntülenecek araç bulunamadı.</Text>
            )}
        </View>
    );

    useEffect(() => {
        if (isFocused && listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [isFocused]);

    return (
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}> 
            <FlatList
                ref={listRef}
                data={sortedVehicles}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 48 }]}
                ListHeaderComponent={(
                    <View style={styles.headerSection}>
                        <Text style={styles.headerTitle}>Yakındaki RentQuad araçları</Text>
                        <Text style={styles.headerSubtitle}>Konumuna göre sıralandı</Text>
                        {locationError && <Text style={styles.locationError}>{locationError}</Text>}
                        {vehiclesError && <Text style={styles.locationError}>Araçlar yüklenemedi: {vehiclesError}</Text>}
                    </View>
                )}
                ListEmptyComponent={listEmpty}
                refreshing={vehiclesLoading}
                onRefresh={loadVehicles}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    listContent: {
        paddingHorizontal: 20,
    },
    headerSection: {
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0f172a',
    },
    headerSubtitle: {
        marginTop: 4,
        fontSize: 14,
        color: '#475569',
    },
    locationError: {
        marginTop: 8,
        fontSize: 13,
        color: '#b91c1c',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#dbeafe',
    },
    distanceIcon: {
        marginRight: 4,
    },
    distanceText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1d4ed8',
    },
    metaLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 4,
    },
    batteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    batteryContainer: {
        flex: 1,
        height: 10,
        backgroundColor: '#e5e7eb',
        borderRadius: 6,
        overflow: 'hidden',
    },
    batteryFill: {
        height: '100%',
        borderRadius: 6,
    },
    batteryText: {
        fontSize: 14,
        color: '#111827',
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: '#0A84FF',
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        paddingHorizontal: 24,
    },
});

export default Explore;
