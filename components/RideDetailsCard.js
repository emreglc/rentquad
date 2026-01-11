import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

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

const RideDetailsCard = ({
    carName,
    stats,
    phaseLabel,
    onScanPress,
    onFindPress,
    onEndPress,
    showScanButton = false,
    showFindButton = true,
    showEndButton = true,
    scanDisabled = false,
    findDisabled = false,
    endDisabled = false,
    endLabel = 'Sürüşü Bitir',
    showStats = true,
    statusMessage,
}) => {
    const shouldShowStats = showStats && stats;
    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.cardLabel}>Aktif Sürüş</Text>
                    <Text style={styles.cardTitle}>{carName}</Text>
                </View>
                <View style={styles.badge}>
                    <FontAwesome5 name="bolt" size={12} color="#065f46" style={styles.badgeIcon} />
                    <Text style={styles.badgeText}>{phaseLabel || 'Aktif'}</Text>
                </View>
            </View>
            {shouldShowStats ? (
                <View style={styles.statsRow}>
                    <StatCell label="Süre" value={formatDuration(stats.durationSeconds)} />
                    <StatCell label="Mesafe" value={`${stats.distanceKm.toFixed(2)} km`} />
                    <StatCell label="Tahmini Ücret" value={formatCurrency(stats.estimatedCost)} last />
                </View>
            ) : (
                <View style={styles.placeholderBox}>
                    <Text style={styles.placeholderText}>{statusMessage || 'Rezervasyon bekleniyor...'}</Text>
                </View>
            )}
            {(showScanButton || showFindButton || showEndButton) && (
                <View style={styles.actionsRow}>
                    {showScanButton && (
                        <TouchableOpacity
                            style={[styles.secondaryButton, scanDisabled && styles.actionDisabled]}
                            onPress={onScanPress}
                            disabled={scanDisabled}
                        >
                            <FontAwesome5 name="qrcode" size={14} color={scanDisabled ? '#6b7280' : '#1f2937'} />
                            <Text style={styles.secondaryButtonText}>QR Tara</Text>
                        </TouchableOpacity>
                    )}
                    {showFindButton && (
                        <TouchableOpacity
                            style={[styles.secondaryButton, findDisabled && styles.actionDisabled]}
                            onPress={onFindPress}
                            disabled={findDisabled}
                        >
                            <FontAwesome5 name="search-location" size={14} color={findDisabled ? '#6b7280' : '#1f2937'} />
                            <Text style={styles.secondaryButtonText}>Aracı Bul</Text>
                        </TouchableOpacity>
                    )}
                    {showEndButton && (
                        <TouchableOpacity
                            style={[styles.primaryButton, endDisabled && styles.actionDisabledPrimary]}
                            onPress={onEndPress}
                            disabled={endDisabled}
                        >
                            <FontAwesome5 name="flag-checkered" size={14} color={endDisabled ? '#d1d5db' : '#fff'} />
                            <Text style={styles.primaryButtonText}>{endLabel}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
};

const StatCell = ({ label, value, last }) => (
    <View style={[styles.statCell, last && styles.statCellLast]}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#f0fdf4',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardLabel: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#064e3b',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeIcon: {
        marginRight: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#065f46',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    placeholderBox: {
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#fef9c3',
        marginBottom: 12,
    },
    placeholderText: {
        color: '#854d0e',
        fontSize: 14,
        fontWeight: '600',
    },
    statCell: {
        flex: 1,
        marginRight: 12,
    },
    statCellLast: {
        marginRight: 0,
    },
    statLabel: {
        fontSize: 12,
        color: '#065f46',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#022c22',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#e0f2fe',
        marginRight: 8,
        marginBottom: 8,
    },
    secondaryButtonText: {
        marginLeft: 6,
        color: '#1f2937',
        fontWeight: '600',
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#047857',
        marginBottom: 8,
    },
    actionDisabled: {
        opacity: 0.55,
    },
    actionDisabledPrimary: {
        opacity: 0.4,
        backgroundColor: '#065f46',
    },
    primaryButtonText: {
        marginLeft: 6,
        color: '#fff',
        fontWeight: '700',
    },
});

export default RideDetailsCard;
