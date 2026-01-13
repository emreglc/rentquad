import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import supabase from '../lib/supabaseClient';

const PHASES = {
    IDLE: 'idle',
    SELECTING: 'selecting',
    RESERVING: 'reserving',
    RESERVED: 'reserved',
    SCANNING: 'scanning',
    RIDE_STARTING: 'rideStarting',
    RIDING: 'riding',
    FINDING: 'finding',
    ENDING: 'ending',
    COMPLETED: 'completed',
};

const LOG_LIMIT = 40;

const INITIAL_RIDE_STATS = {
    durationSeconds: 0,
    distanceKm: 0,
    estimatedCost: 0,
};

const useRentalFlow = () => {
    const [phase, setPhase] = useState(PHASES.IDLE);
    const [activeCar, setActiveCar] = useState(null);
    const [logs, setLogs] = useState([]);
    const [rideStats, setRideStats] = useState(INITIAL_RIDE_STATS);
    const gpsIntervalRef = useRef(null);
    const timersRef = useRef([]);
    const phaseBeforeFind = useRef(PHASES.IDLE);
    const rideMetricsIntervalRef = useRef(null);
    const rideStartedAtRef = useRef(null);

    const addLog = useCallback((source, message) => {
        setLogs((prev) => {
            const next = [{ id: `${Date.now()}-${Math.random()}`, source, message, timestamp: new Date() }, ...prev];
            return next.slice(0, LOG_LIMIT);
        });
    }, []);

    const updateVehicleStatus = useCallback(async (vehicleId, status) => {
        if (!vehicleId || !status) return;
        try {
            const { error } = await supabase
                .from('vehicles')
                .update({ status })
                .eq('id', vehicleId);
            if (error) {
                console.warn('Vehicle status update failed', error.message);
            }
        } catch (err) {
            console.warn('Vehicle status update error', err.message || err);
        }
    }, []);

    const registerTimer = useCallback((callback, delay) => {
        const id = setTimeout(() => {
            callback();
            timersRef.current = timersRef.current.filter((timerId) => timerId !== id);
        }, delay);
        timersRef.current.push(id);
        return id;
    }, []);

    const clearAllTimers = useCallback(() => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    }, []);

    const stopGps = useCallback(() => {
        if (gpsIntervalRef.current) {
            clearInterval(gpsIntervalRef.current);
            gpsIntervalRef.current = null;
        }
    }, []);

    const startGps = useCallback(() => {
        stopGps();
        gpsIntervalRef.current = setInterval(() => {
            addLog('Vehicle', 'GPS verisi gönderildi.');
        }, 4500);
    }, [addLog, stopGps]);

    const stopRideMetrics = useCallback(() => {
        if (rideMetricsIntervalRef.current) {
            clearInterval(rideMetricsIntervalRef.current);
            rideMetricsIntervalRef.current = null;
        }
    }, []);

    const resetRideStats = useCallback(() => {
        rideStartedAtRef.current = null;
        setRideStats(INITIAL_RIDE_STATS);
    }, []);

    const startRideMetrics = useCallback(() => {
        stopRideMetrics();
        resetRideStats();
        const startedAt = Date.now();
        rideStartedAtRef.current = startedAt;
        rideMetricsIntervalRef.current = setInterval(() => {
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
            const distanceKm = Number((elapsedSeconds * 0.012).toFixed(2));
            const estimatedCost = Math.max(29, Number((distanceKm * 4.2 + 29).toFixed(2)));
            setRideStats({ durationSeconds: elapsedSeconds, distanceKm, estimatedCost });
        }, 1000);
    }, [resetRideStats, stopRideMetrics]);

    const resetFlow = useCallback(() => {
        clearAllTimers();
        stopGps();
        stopRideMetrics();
        setPhase(PHASES.IDLE);
        setActiveCar(null);
        setLogs([]);
        resetRideStats();
    }, [clearAllTimers, resetRideStats, stopGps, stopRideMetrics]);

    const beginRental = useCallback((car) => {
        if (!car) return;
        clearAllTimers();
        stopGps();
        setActiveCar(car);
        setPhase(PHASES.SELECTING);
        setLogs([]);
        addLog('Client', `${car.title} için kiralama akışı başlatıldı.`);
        addLog('Server', 'GPS modülü aktif: araç konumu güncellenecek.');
        resetRideStats();
    }, [addLog, clearAllTimers, resetRideStats, stopGps]);

    const reserveVehicle = useCallback(() => {
        if (!activeCar) return;
        setPhase(PHASES.RESERVING);
        addLog('Client', 'Rezervasyon isteği gönderildi.');
        registerTimer(() => {
            addLog('Server', 'Reserve module: araç ayrıldı.');
            addLog('Vehicle', 'Rezervasyon bildirimi (ışık kapalı).');
            setPhase(PHASES.RESERVED);
            updateVehicleStatus(activeCar.id, 'reserved');
        }, 1300);
    }, [activeCar, addLog, registerTimer, updateVehicleStatus]);

    const scanVehicle = useCallback(() => {
        if (!activeCar) return;
        setPhase(PHASES.SCANNING);
        addLog('Client', 'QR tarandı, sürüş başlatma isteği gönderildi.');
        registerTimer(() => {
            addLog('Server', 'Start ride module isteği işliyor.');
            addLog('Vehicle', 'Araç kilidi açıldı, farlar & korna çalıştı.');
            setPhase(PHASES.RIDE_STARTING);
            registerTimer(() => {
                setPhase(PHASES.RIDING);
                addLog('Vehicle', 'Sürüş başladı, GPS verileri gönderiliyor.');
                updateVehicleStatus(activeCar.id, 'in_use');
                startGps();
                if (!rideMetricsIntervalRef.current) {
                    startRideMetrics();
                }
            }, 1200);
        }, 1100);
    }, [activeCar, addLog, registerTimer, startGps, startRideMetrics, updateVehicleStatus]);

    const findVehicle = useCallback(() => {
        if (!activeCar) return;
        phaseBeforeFind.current = phase;
        addLog('Client', 'Find isteği gönderildi.');
        setPhase(PHASES.FINDING);
        registerTimer(() => {
            addLog('Server', 'Find module: araç sinyalleri tetiklendi.');
            addLog('Vehicle', 'Korna ve sinyaller kısa süreli çalıştı.');
            const fallback = phaseBeforeFind.current;
            setPhase(fallback === PHASES.RESERVED ? PHASES.RESERVED : PHASES.RIDING);
        }, 1000);
    }, [activeCar, addLog, phase, registerTimer]);

    const endRide = useCallback(() => {
        if (!activeCar) return;
        setPhase(PHASES.ENDING);
        addLog('Client', 'Sürüş sonlandırma isteği gönderildi.');
        registerTimer(() => {
            addLog('Server', 'End ride module: kilitleme onaylandı.');
            addLog('Vehicle', 'Araç kilitlendi ve ışıklar kapandı.');
            addLog('Server', 'Payment module: tahsilat tamamlandı.');
            stopGps();
            stopRideMetrics();
            setPhase(PHASES.COMPLETED);
            updateVehicleStatus(activeCar.id, 'available');
            registerTimer(() => {
                addLog('Client', 'Ana sayfaya dönüldü.');
                setPhase(PHASES.IDLE);
                setActiveCar(null);
                resetRideStats();
            }, 3000);
        }, 1500);
    }, [activeCar, addLog, registerTimer, resetRideStats, stopGps, stopRideMetrics, updateVehicleStatus]);

    useEffect(() => () => {
        clearAllTimers();
        stopGps();
        stopRideMetrics();
    }, [clearAllTimers, stopGps, stopRideMetrics]);

    const flowInProgress = useMemo(() => (
        !!activeCar && [
            PHASES.SELECTING,
            PHASES.RESERVING,
            PHASES.RESERVED,
            PHASES.SCANNING,
            PHASES.RIDE_STARTING,
            PHASES.RIDING,
            PHASES.FINDING,
            PHASES.ENDING,
        ].includes(phase)
    ), [activeCar, phase]);

    const capabilities = useMemo(() => ({
        canStart: phase === PHASES.IDLE || phase === PHASES.COMPLETED,
        canReserve: phase === PHASES.SELECTING,
        canScan: phase === PHASES.RESERVED,
        canFind: [PHASES.RESERVED, PHASES.SCANNING, PHASES.RIDE_STARTING, PHASES.RIDING, PHASES.FINDING].includes(phase),
        canEnd: [PHASES.RESERVED, PHASES.SCANNING, PHASES.RIDE_STARTING, PHASES.RIDING, PHASES.FINDING].includes(phase),
    }), [phase]);

    // Direct QR rental - complete flow without reservation step
    const startDirectRental = useCallback((car) => {
        if (!car) return;
        clearAllTimers();
        stopGps();
        setActiveCar(car);
        setLogs([]);
        addLog('Client', `${car.title} için QR ile kiralama başlatıldı.`);
        
        // Skip to scanning phase directly
        setPhase(PHASES.SCANNING);
        addLog('Client', 'QR tarandı, sürüş başlatma isteği gönderildi.');
        
        registerTimer(() => {
            addLog('Server', 'Start ride module isteği işliyor.');
            addLog('Vehicle', 'Araç kilidi açıldı, farlar & korna çalıştı.');
            setPhase(PHASES.RIDE_STARTING);
            updateVehicleStatus(car.id, 'in_use');
            
            registerTimer(() => {
                setPhase(PHASES.RIDING);
                addLog('Vehicle', 'Sürüş başladı, GPS verileri gönderiliyor.');
                startGps();
                if (!rideMetricsIntervalRef.current) {
                    startRideMetrics();
                }
            }, 1200);
        }, 1100);
    }, [addLog, clearAllTimers, registerTimer, startGps, startRideMetrics, stopGps, updateVehicleStatus]);

    return {
        phase,
        activeCar,
        logs,
        rideStats,
        flowInProgress,
        beginRental,
        reserveVehicle,
        scanVehicle,
        startDirectRental,
        findVehicle,
        endRide,
        resetFlow,
        capabilities,
    };
};

export { PHASES };
export default useRentalFlow;
