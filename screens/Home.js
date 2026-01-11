import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, Text, TouchableOpacity, Animated, Platform, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
// Removed static import of react-native-maps to avoid web bundling error
// import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useRentalFlow, { PHASES } from '../hooks/useRentalFlow';
import RideDetailsCard from '../components/RideDetailsCard';
import supabase from '../lib/supabaseClient';
import formatVehicleTitle from '../lib/vehicleUtils';

const FLOW_LABELS = {
    [PHASES.IDLE]: 'Hazır',
    [PHASES.SELECTING]: 'Araç seçildi',
    [PHASES.RESERVING]: 'Rezervasyon gönderiliyor',
    [PHASES.RESERVED]: 'Araç rezerve edildi',
    [PHASES.SCANNING]: 'QR taraması',
    [PHASES.RIDE_STARTING]: 'Sürüş başlatılıyor',
    [PHASES.RIDING]: 'Sürüş devam ediyor',
    [PHASES.FINDING]: 'Araç bulunuyor',
    [PHASES.ENDING]: 'Sürüş sonlandırılıyor',
    [PHASES.COMPLETED]: 'Tamamlandı',
};

const HIDDEN_STATUSES = new Set(['reserved', 'in_use']);

const STATUS_MARKER_COLORS = {
    reserved: {
        badgeBg: '#f97316',
        badgeBorder: '#fed7aa',
        pointer: '#ea580c',
        icon: '#fff7ed',
    },
    in_use: {
        badgeBg: '#dc2626',
        badgeBorder: '#fecaca',
        pointer: '#b91c1c',
        icon: '#fee2e2',
    },
    default: {
        badgeBg: '#111827',
        badgeBorder: '#e2e8f0',
        pointer: '#111827',
        icon: '#ffffff',
    },
};

const phaseDrivenStatus = (phase) => {
    if ([PHASES.RESERVING, PHASES.RESERVED].includes(phase)) {
        return 'reserved';
    }
    if ([
        PHASES.SCANNING,
        PHASES.RIDE_STARTING,
        PHASES.RIDING,
        PHASES.FINDING,
        PHASES.ENDING,
    ].includes(phase)) {
        return 'in_use';
    }
    return null;
};

// Dynamically load react-native-maps only on native platforms
let MapViewComp = null;
let MarkerComp = null;
if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapViewComp = Maps.default;
    MarkerComp = Maps.Marker;
}

export default function Home({ navigation, route }) {
    const [location, setLocation] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(false);
    const [vehiclesError, setVehiclesError] = useState(null);
    const [selectedCarId, setSelectedCarId] = useState(null);
    const [slideAnim] = useState(new Animated.Value(0));
    const [markerTracking, setMarkerTracking] = useState({});
    const [iconsReady, setIconsReady] = useState(false);
    const prevSelectedIdRef = useRef(null);
    const pendingReserveCarIdRef = useRef(null);
    const activeCarRef = useRef(null);
    const mapRef = useRef(null);
    const [detailCardHeight, setDetailCardHeight] = useState(0);
    const windowHeight = Dimensions.get('window').height || 1;
    const {
        phase: rentalPhase,
        activeCar: rentalActiveCar,
        rideStats,
        flowInProgress,
        beginRental,
        reserveVehicle,
        scanVehicle,
        findVehicle,
        endRide,
        capabilities: rentalCapabilities,
    } = useRentalFlow();

    // Safe area insets to offset map controls away from the status bar
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const detailBottomPadding = Math.max(insets.bottom + Math.max(tabBarHeight - 60, 0), 12);

    // Helpers: distance and formatting
    const toRad = (x) => (x * Math.PI) / 180;
    const distanceMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371000; // meters
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };
    const formatDistance = (m) => {
        if (m === null || m === undefined) return 'Konum bekleniyor';
        return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
    };
    const batteryColor = (p) => (p > 60 ? '#22c55e' : p > 25 ? '#f59e0b' : '#ef4444');
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0');
        const secs = Math.floor(seconds % 60)
            .toString()
            .padStart(2, '0');
        return `${mins}:${secs}`;
    };
    const formatCurrency = (value) => `${value.toFixed(2)} ₺`;

    const parseWkbPoint = useCallback((hexString) => {
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
                offset += 4; // skip SRID
            }
            const x = view.getFloat64(offset, littleEndian);
            offset += 8;
            const y = view.getFloat64(offset, littleEndian);
            return { latitude: y, longitude: x };
        } catch (error) {
            console.warn('WKB parse failed', error);
            return null;
        }
    }, []);

    const parsePoint = useCallback((point) => {
        if (!point) return null;
        if (typeof point === 'string') {
            const clean = point.startsWith('\\x') ? point.slice(2) : point;
            if (/^[0-9a-fA-F]+$/.test(clean)) {
                return parseWkbPoint(point);
            }
            try {
                return parsePoint(JSON.parse(point));
            } catch (err) {
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
    }, [parseWkbPoint]);

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

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                await Font.loadAsync(FontAwesome5.font);
                if (mounted) setIconsReady(true);
            } catch (err) {
                console.warn('FontAwesome5 yüklenemedi', err);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const activePhaseStatus = phaseDrivenStatus(rentalPhase);

    const availableVehicles = useMemo(() => {
        if (!vehicles.length) return [];
        return vehicles
            .map((vehicle) => {
                const isUserVehicle = rentalActiveCar && rentalActiveCar.id === vehicle.id;
                const flowStatus = isUserVehicle ? activePhaseStatus : null;
                const effectiveStatus = flowStatus || vehicle.status;
                const shouldHideForStatus =
                    effectiveStatus && HIDDEN_STATUSES.has(effectiveStatus) && !isUserVehicle;
                if (shouldHideForStatus) {
                    return null;
                }
                const coords = parsePoint(vehicle.current_location);
                if (!coords) return null;
                const distance = location
                    ? distanceMeters(location.latitude, location.longitude, coords.latitude, coords.longitude)
                    : null;
                return {
                    id: vehicle.id,
                    title: formatVehicleTitle(vehicle),
                    code: vehicle.code,
                    model: vehicle.model || 'RentQuad One',
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    battery: Number(vehicle.battery_percent ?? 0),
                    distance,
                    status: effectiveStatus,
                    isUserVehicle,
                };
            })
            .filter(Boolean);
    }, [activePhaseStatus, location, parsePoint, rentalActiveCar, vehicles]);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Uyarı', 'Konum izni verilmedi.');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc.coords);
        })();
    }, []);

    const selectedCar = useMemo(
        () => availableVehicles.find((c) => c.id === selectedCarId) || null,
        [availableVehicles, selectedCarId]
    );

    useEffect(() => {
        if (selectedCarId && !availableVehicles.some((car) => car.id === selectedCarId)) {
            setSelectedCarId(null);
        }
    }, [availableVehicles, selectedCarId]);

    useEffect(() => {
        activeCarRef.current = rentalActiveCar;
    }, [rentalActiveCar]);

    useEffect(() => {
        if (!pendingReserveCarIdRef.current) return;
        if (!rentalActiveCar || rentalActiveCar.id !== pendingReserveCarIdRef.current) return;
        if (rentalPhase === PHASES.SELECTING) {
            reserveVehicle();
            pendingReserveCarIdRef.current = null;
            return;
        }
        if ([PHASES.RESERVING, PHASES.RESERVED].includes(rentalPhase)) {
            pendingReserveCarIdRef.current = null;
        }
    }, [rentalActiveCar, rentalPhase, reserveVehicle]);


    const displayCars = useMemo(() => {
        if (!availableVehicles.length) return [];
        const counts = {};
        const keyFor = (lat, lon) => `${lat.toFixed(5)}:${lon.toFixed(5)}`;

        availableVehicles.forEach((car) => {
            const key = keyFor(car.latitude, car.longitude);
            counts[key] = (counts[key] || 0) + 1;
        });

        return availableVehicles.map((car) => {
            const key = keyFor(car.latitude, car.longitude);
            return {
                ...car,
                overlapCount: counts[key] || 1,
            };
        });
    }, [availableVehicles]);

    useEffect(() => {
        if (!availableVehicles.length) return;
        setMarkerTracking((prev) => {
            const next = { ...prev };
            availableVehicles.forEach((car) => {
                next[car.id] = true;
            });
            return next;
        });

        if (!iconsReady) return;

        const timer = setTimeout(() => {
            setMarkerTracking((prev) => {
                const next = { ...prev };
                availableVehicles.forEach((car) => {
                    next[car.id] = false;
                });
                return next;
            });
        }, 400);

        return () => clearTimeout(timer);
    }, [availableVehicles, iconsReady]);

    useEffect(() => {
        const prevId = prevSelectedIdRef.current;
        const idsToTrack = [selectedCarId, prevId].filter((id) => id !== null && id !== undefined);
        if (!idsToTrack.length) {
            prevSelectedIdRef.current = selectedCarId;
            return;
        }

        setMarkerTracking((prev) => {
            const next = { ...prev };
            idsToTrack.forEach((id) => {
                next[id] = true;
            });
            return next;
        });

        if (!iconsReady) return;

        const timer = setTimeout(() => {
            setMarkerTracking((prev) => {
                const next = { ...prev };
                idsToTrack.forEach((id) => {
                    next[id] = false;
                });
                return next;
            });
        }, 350);

        prevSelectedIdRef.current = selectedCarId;
        return () => clearTimeout(timer);
    }, [iconsReady, selectedCarId]);


    const animateToVehicle = useCallback(
        (car) => {
            if (!mapRef.current || !car) return;
            const latitudeDelta = 0.03;
            const longitudeDelta = 0.03;
            const overlayFraction = Math.min(0.6, detailCardHeight / windowHeight);
            const latShift = latitudeDelta * (overlayFraction / 2 || 0);

            mapRef.current.animateToRegion(
                {
                    latitude: car.latitude - latShift,
                    longitude: car.longitude,
                    latitudeDelta,
                    longitudeDelta,
                },
                500
            );
        },
        [detailCardHeight, windowHeight]
    );

    const handleSelectCar = useCallback((car) => {
        if (!car) return;
        if (flowInProgress && rentalActiveCar && car.id !== rentalActiveCar.id) {
            Alert.alert('Sürüş devam ediyor', 'Aktif sürüş bitmeden başka bir araçla işlem yapamazsınız.');
            return;
        }
        setSelectedCarId(car.id);
        Animated.timing(slideAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
        }).start();
        animateToVehicle(car);
    }, [animateToVehicle, flowInProgress, rentalActiveCar, slideAnim]);

    const hideDetails = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setSelectedCarId(null));
    }, [slideAnim]);

    const prevPhaseRef = useRef(rentalPhase);

    useEffect(() => {
        const prevPhase = prevPhaseRef.current;
        prevPhaseRef.current = rentalPhase;
        if (!selectedCar || !rentalActiveCar) return;
        if (rentalActiveCar.id !== selectedCar.id) return;
        const autoHidePhases = new Set([
            PHASES.RESERVING,
            PHASES.RESERVED,
            PHASES.SCANNING,
            PHASES.RIDE_STARTING,
            PHASES.RIDING,
            PHASES.FINDING,
            PHASES.ENDING,
        ]);
        if (!autoHidePhases.has(rentalPhase) || autoHidePhases.has(prevPhase)) return;
        hideDetails();
    }, [hideDetails, rentalActiveCar, rentalPhase, selectedCar]);

    const isCurrentCarActive = selectedCar && rentalActiveCar && rentalActiveCar.id === selectedCar.id;
    const canSelectForFlow = selectedCar && (!rentalActiveCar || isCurrentCarActive);
    const showReserveButton = !!canSelectForFlow && [PHASES.IDLE, PHASES.SELECTING].includes(rentalPhase);
    const reserveDisabled =
        !canSelectForFlow ||
        (rentalPhase !== PHASES.IDLE && !(isCurrentCarActive && rentalCapabilities.canReserve));
    const rideStatsPhases = new Set([PHASES.RIDE_STARTING, PHASES.RIDING, PHASES.FINDING]);
    const showQrButton = isCurrentCarActive && rentalPhase === PHASES.RESERVED;
    const showFindButton = isCurrentCarActive && rentalCapabilities.canFind;
    const showEndRideButton = isCurrentCarActive && rentalCapabilities.canEnd;
    const showRideStats = isCurrentCarActive && rideStatsPhases.has(rentalPhase);
    const endActionLabel = [PHASES.RESERVING, PHASES.RESERVED].includes(rentalPhase) ? 'İptal Et' : 'Sürüşü Bitir';
    const selectedCarBattery = Math.max(0, Math.min(100, selectedCar?.battery ?? 0));

    const handleReservePress = () => {
        if (!selectedCar || !canSelectForFlow || reserveDisabled) return;
        const targetCarId = selectedCar.id;
        if (!activeCarRef.current) {
            pendingReserveCarIdRef.current = targetCarId;
            beginRental(selectedCar);
            return;
        }
        if (activeCarRef.current.id !== targetCarId) return;
        reserveVehicle();
    };

    const slideUp = {
        transform: [
            {
                translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0], // panel yukarı kayar
                }),
            },
        ],
    };

    useEffect(() => {
        if (selectedCar && detailCardHeight > 0) {
            animateToVehicle(selectedCar);
        }
    }, [animateToVehicle, detailCardHeight, selectedCar]);

    const targetVehicleId = route?.params?.targetVehicleId;

    useEffect(() => {
        if (!targetVehicleId) return;
        const targetId = targetVehicleId;
        const car = availableVehicles.find((c) => c.id === targetId);
        if (!car) return;
        handleSelectCar(car);
        navigation?.setParams?.({ targetVehicleId: undefined });
    }, [availableVehicles, handleSelectCar, navigation, targetVehicleId]);

    // Web fallback: avoid rendering native MapView
    if (Platform.OS === 'web') {
        return (
            <View style={styles.webFallback}>
                <Text style={styles.webMsg}>Harita web üzerinde desteklenmiyor. Lütfen mobil uygulamada deneyin.</Text>
            </View>
        );
    }

    if (!location) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Use dynamically loaded MapView/Marker on native */}
            <MapViewComp
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                // Move zoom/compass controls down from the status bar
                mapPadding={{ top: Math.max(insets.top, 24) + 12, right: 12, bottom: 12, left: 12 }}
                zoomControlEnabled={true}
            >
                {displayCars.map((car) => (
                    <MarkerComp
                        key={car.id}
                        coordinate={{ latitude: car.latitude, longitude: car.longitude }}
                        onPress={() => handleSelectCar(car)}
                        tracksViewChanges={iconsReady ? markerTracking[car.id] !== false : true}
                    >
                        <VehicleMarker
                            isSelected={selectedCarId === car.id}
                            overlapCount={car.overlapCount}
                            status={car.status}
                        />
                    </MarkerComp>
                ))}
            </MapViewComp>

            <View
                style={[
                    styles.vehicleStatusContainer,
                    { top: Math.max(insets.top, 16) + (flowInProgress ? 140 : 12) },
                ]}
            >
                <TouchableOpacity
                    style={[styles.vehicleStatusButton, vehiclesLoading && styles.vehicleStatusButtonDisabled]}
                    onPress={loadVehicles}
                    disabled={vehiclesLoading}
                    activeOpacity={0.7}
                >
                    <FontAwesome5
                        name="sync"
                        size={12}
                        color="#111827"
                        style={styles.vehicleStatusIcon}
                    />
                    <Text style={styles.vehicleStatusText}>
                        {vehiclesLoading ? 'Araçlar yenileniyor...' : 'Araç listesini güncelle'}
                    </Text>
                </TouchableOpacity>
                {vehiclesError ? (
                    <Text style={styles.vehicleStatusError} numberOfLines={2}>
                        Araçlar yüklenemedi: {vehiclesError}
                    </Text>
                ) : null}
            </View>

            {flowInProgress && rentalActiveCar && (
                <View style={[styles.rideOverlay, { top: Math.max(insets.top, 16) + 12 }]}>
                    <RideDetailsCard
                        carName={rentalActiveCar.title}
                        stats={rideStats}
                        phaseLabel={FLOW_LABELS[rentalPhase]}
                        onScanPress={scanVehicle}
                        onFindPress={findVehicle}
                        onEndPress={endRide}
                        showScanButton={rentalCapabilities.canScan}
                        showFindButton={rentalCapabilities.canFind}
                        showEndButton={rentalCapabilities.canEnd}
                        scanDisabled={!rentalCapabilities.canScan}
                        findDisabled={!rentalCapabilities.canFind}
                        endDisabled={!rentalCapabilities.canEnd}
                        endLabel={endActionLabel}
                        showStats={rideStatsPhases.has(rentalPhase)}
                        statusMessage={
                            rentalPhase === PHASES.RESERVED
                                ? 'Araç rezerve edildi. QR kodu tarayarak sürüşü başlat.'
                                : 'Rezervasyon isteği işleniyor...'
                        }
                    />
                </View>
            )}

            {selectedCar && (
                <Animated.View
                    style={[
                        styles.detailContainer,
                        slideUp,
                        { paddingBottom: detailBottomPadding },
                    ]}
                    onLayout={(event) => setDetailCardHeight(event.nativeEvent.layout.height)}
                >
                    <View style={styles.detailHeader}>
                        <Text style={styles.title}>{selectedCar.title}</Text>
                        <TouchableOpacity onPress={hideDetails}>
                            <Text style={styles.close}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.info}>Mesafe: {formatDistance(selectedCar.distance)}</Text>
                    <View style={styles.batteryRow}>
                        <Text style={styles.batteryLabel}>Pil</Text>
                        <View style={styles.batteryContainer}>
                            <View
                                style={[
                                    styles.batteryFill,
                                    {
                                        width: `${selectedCarBattery}%`,
                                        backgroundColor: batteryColor(selectedCarBattery),
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.batteryText}>{Math.round(selectedCarBattery)}%</Text>
                    </View>
                    <View style={styles.flowSection}>
                        {rentalActiveCar && rentalActiveCar.id !== selectedCar.id && (
                            <Text style={styles.flowWarning}>Başka bir araç için simülasyon sürüyor. Yeni akış başlatmak için önce mevcut akışı bitirin.</Text>
                        )}
                        <View style={styles.flowButtonsGrid}>
                            {showReserveButton && (
                                <FlowButton
                                    label="Rezerve Et"
                                    disabled={reserveDisabled}
                                    onPress={handleReservePress}
                                    fullWidth={!showQrButton && !showFindButton && !showEndRideButton}
                                />
                            )}
                            {showQrButton && (
                                <FlowButton
                                    label="QR Tara"
                                    disabled={!rentalCapabilities.canScan}
                                    onPress={scanVehicle}
                                />
                            )}
                            {showFindButton && (
                                <FlowButton
                                    label="Aracı Bul"
                                    disabled={!rentalCapabilities.canFind}
                                    onPress={findVehicle}
                                    iconName="search-location"
                                />
                            )}
                            {showEndRideButton && (
                                <FlowButton
                                    label={endActionLabel}
                                    disabled={!rentalCapabilities.canEnd}
                                    onPress={endRide}
                                    iconName="flag-checkered"
                                    iconColor="#ffffff"
                                />
                            )}
                        </View>
                        {showRideStats && (
                            <View style={styles.rideStatsCard}>
                                <Text style={styles.rideStatsTitle}>Sürüş Detayları</Text>
                                <View style={styles.rideStatsRow}>
                                    <RideStat label="Süre" value={formatDuration(rideStats.durationSeconds)} />
                                    <RideStat label="Mesafe" value={`${rideStats.distanceKm.toFixed(2)} km`} />
                                    <RideStat label="Tahmini Ücret" value={formatCurrency(rideStats.estimatedCost)} isLast />
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const VehicleMarker = ({ isSelected, overlapCount = 1, status }) => {
    const palette = STATUS_MARKER_COLORS[status] || STATUS_MARKER_COLORS.default;
    const badgeStyle = [
        markerStyles.badge,
        { backgroundColor: palette.badgeBg, borderColor: palette.badgeBorder },
    ];
    const pointerStyle = [markerStyles.pointer, { borderTopColor: palette.pointer }];

    if (isSelected) {
        badgeStyle.push(markerStyles.badgeSelected);
        pointerStyle.push(markerStyles.pointerSelected);
    }

    return (
        <View style={markerStyles.wrapper}>
            <View style={badgeStyle}>
                <FontAwesome5
                    name="car-alt"
                    size={isSelected ? 22 : 20}
                    color={palette.icon}
                    solid
                />
                {overlapCount > 1 && (
                    <View style={markerStyles.clusterBadge}>
                        <Text style={markerStyles.clusterText}>{overlapCount}</Text>
                    </View>
                )}
            </View>
            <View style={markerStyles.pointerSlot}>
                <View style={pointerStyle} />
            </View>
        </View>
    );
};

const FlowButton = ({ label, disabled, onPress, fullWidth, iconName, iconColor }) => (
    <TouchableOpacity
        style={[styles.flowButton, fullWidth && styles.flowButtonFullWidth, disabled && styles.flowButtonDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
    >
        <View style={styles.flowButtonContent}>
            {iconName && (
                <FontAwesome5
                    name={iconName}
                    size={14}
                    color={disabled ? '#475569' : iconColor || '#ffffff'}
                    style={styles.flowButtonIcon}
                />
            )}
            <Text style={[styles.flowButtonLabel, disabled && styles.flowButtonLabelDisabled]}>{label}</Text>
        </View>
    </TouchableOpacity>
);

const RideStat = ({ label, value, isLast }) => (
    <View style={[styles.rideStatItem, isLast && styles.rideStatItemLast]}>
        <Text style={styles.rideStatLabel}>{label}</Text>
        <Text style={styles.rideStatValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 'auto',
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: { fontSize: 20, fontWeight: 'bold' },
    close: { fontSize: 22, fontWeight: 'bold', color: '#888' },
    info: { marginTop: 10, fontSize: 16 },
    rideOverlay: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 20,
    },
    vehicleStatusContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 15,
    },
    vehicleStatusButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.92)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 4,
    },
    vehicleStatusButtonDisabled: {
        opacity: 0.6,
    },
    vehicleStatusIcon: {
        marginRight: 6,
    },
    vehicleStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#111827',
    },
    vehicleStatusError: {
        marginTop: 6,
        fontSize: 12,
        color: '#b91c1c',
        backgroundColor: 'rgba(248,113,113,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    webFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    webMsg: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    batteryRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
    batteryLabel: { fontSize: 16, color: '#111827' },
    batteryContainer: { flex: 1, height: 10, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden', marginHorizontal: 8 },
    batteryFill: { height: '100%', borderRadius: 6 },
    batteryText: { marginLeft: 8, fontSize: 14, color: '#333' },
    flowSection: {
        marginTop: 18,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    flowWarning: {
        fontSize: 13,
        color: '#b45309',
        marginBottom: 8,
    },
    flowButtonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    flowButton: {
        width: '48%',
        backgroundColor: '#1d4ed8',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    flowButtonFullWidth: {
        width: '100%',
    },
    flowButtonDisabled: {
        backgroundColor: '#c7d2fe',
    },
    flowButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flowButtonIcon: {
        marginRight: 4,
    },
    flowButtonLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    flowButtonLabelDisabled: {
        color: '#475569',
    },
    rideStatsCard: {
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
    },
    rideStatsTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    rideStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rideStatItem: {
        flex: 1,
        marginRight: 8,
    },
    rideStatItemLast: {
        marginRight: 0,
    },
    rideStatLabel: {
        fontSize: 12,
        color: '#4b5563',
        marginBottom: 2,
    },
    rideStatValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
});

const markerStyles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 1,
    },
    badge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2.5,
        elevation: 4,
        position: 'relative',
    },
    badgeSelected: {
        borderColor: '#facc15',
        borderWidth: 3,
        shadowColor: '#facc15',
        shadowOpacity: 0.45,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 6,
        transform: [{ scale: 1.06 }],
    },
    clusterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 2,
        borderRadius: 8,
        backgroundColor: '#1d4ed8',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    clusterText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    pointerSlot: {
        width: 16,
        height: 8,
        marginTop: -2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    pointer: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#111827',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 0.6,
    },
    pointerSelected: {
        borderTopColor: '#facc15',
        shadowColor: '#fbbf24',
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 0.5 },
        shadowRadius: 1,
    },
});