export const formatVehicleTitle = (vehicle) => {
    if (!vehicle) {
        return 'Araç';
    }

    const rawName = (vehicle.display_name || '').trim();
    const rawModel = (vehicle.model || '').trim();
    const code = (vehicle.code || '').trim();
    const fallback = vehicle.id ? `Araç #${vehicle.id}` : 'Araç';

    const isGenericName = !rawName.length || (!!rawModel.length && rawName.toLowerCase() === rawModel.toLowerCase());
    const usableName = isGenericName ? '' : rawName;

    if (usableName && code && usableName.toLowerCase() !== code.toLowerCase()) {
        return `${usableName} (${code})`;
    }

    if (usableName) {
        return usableName;
    }

    if (code) {
        return code;
    }

    if (rawModel) {
        return rawModel;
    }

    return fallback;
};

export default formatVehicleTitle;
