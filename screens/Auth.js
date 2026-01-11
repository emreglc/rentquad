import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const AuthScreen = () => {
    const { signIn, signUp, rememberMeEnabled, rememberedEmail, setRememberMePreference } = useAuth();
    const [mode, setMode] = useState('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [busy, setBusy] = useState(false);
    const [rememberMe, setRememberMe] = useState(!!rememberMeEnabled);

    useEffect(() => {
        if (rememberedEmail && !email) {
            setEmail(rememberedEmail);
        }
    }, [rememberedEmail, email]);

    useEffect(() => {
        setRememberMe(!!rememberMeEnabled);
    }, [rememberMeEnabled]);

    const handleRememberToggle = () => {
        const next = !rememberMe;
        setRememberMe(next);
        setRememberMePreference(next);
    };

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('Eksik bilgi', 'E-posta ve şifre alanlarını doldurun.');
            return;
        }
        if (mode === 'signUp' && (!firstName || !lastName)) {
            Alert.alert('Eksik bilgi', 'İsim ve soyisim alanlarını doldurun.');
            return;
        }

        setBusy(true);
        try {
            if (mode === 'signIn') {
                const { error } = await signIn(email.trim(), password, { remember: rememberMe });
                if (error) {
                    Alert.alert('Hata', error.message);
                }
            } else {
                const { error } = await signUp(email.trim(), password, {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phoneNumber: phoneNumber.trim() || null,
                });
                if (error) {
                    Alert.alert('Hata', error.message);
                } else {
                    Alert.alert('Başarılı', 'Hesap oluşturuldu. Şimdi giriş yapabilirsiniz.');
                    setMode('signIn');
                    setPassword('');
                    setEmail(email.trim());
                    setFirstName('');
                    setLastName('');
                    setPhoneNumber('');
                }
            }
        } catch (err) {
            Alert.alert('Beklenmedik hata', err.message);
        } finally {
            setBusy(false);
        }
    };

    const RememberMeToggle = () => (
        <TouchableOpacity style={styles.rememberRow} activeOpacity={0.8} onPress={handleRememberToggle}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Beni hatırla</Text>
        </TouchableOpacity>
    );

    const toggleMode = () => {
        setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="flash" size={42} color="#0A84FF" />
                </View>
                <Text style={styles.title}>{mode === 'signIn' ? 'Tekrar Hoş Geldin' : 'Hesap Oluştur'}</Text>
                <Text style={styles.subtitle}>
                    {mode === 'signIn'
                        ? 'Araçları görmek için hesabınla giriş yap.'
                        : 'Saniyeler içinde sürüş hesabı oluştur.'}
                </Text>

                <View style={styles.form}>
                    <Text style={styles.label}>E-posta</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="ornek@rentquad.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Şifre</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    {mode === 'signIn' && <RememberMeToggle />}

                    {mode === 'signUp' && (
                        <>
                            <Text style={[styles.label, { marginTop: 12 }]}>İsim</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ad"
                                value={firstName}
                                onChangeText={setFirstName}
                            />

                            <Text style={[styles.label, { marginTop: 12 }]}>Soyisim</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Soyad"
                                value={lastName}
                                onChangeText={setLastName}
                            />

                            <Text style={[styles.label, { marginTop: 12 }]}>Telefon (Opsiyonel)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="05xx xxx xx xx"
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                            />
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.primaryBtn, busy && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={busy}
                        activeOpacity={0.8}
                    >
                        {busy ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryBtnText}>
                                {mode === 'signIn' ? 'Giriş Yap' : 'Kayıt Ol'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleMode} style={styles.secondaryBtn}>
                        <Text style={styles.secondaryText}>
                            {mode === 'signIn'
                                ? 'Hesabın yok mu? Kayıt ol'
                                : 'Hesabın var mı? Giriş yap'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc' },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    headerIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#E0ECFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0f172a',
    },
    subtitle: {
        marginTop: 6,
        fontSize: 15,
        textAlign: 'center',
        color: '#475569',
    },
    form: {
        width: '100%',
        marginTop: 28,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0f172a',
        backgroundColor: '#f9fafb',
    },
    rememberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#cbd5f5',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxActive: {
        backgroundColor: '#0A84FF',
        borderColor: '#0A84FF',
    },
    rememberText: {
        marginLeft: 10,
        color: '#0f172a',
        fontWeight: '600',
    },
    primaryBtn: {
        marginTop: 20,
        backgroundColor: '#0A84FF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledBtn: {
        opacity: 0.6,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryBtn: {
        marginTop: 14,
        alignItems: 'center',
    },
    secondaryText: {
        color: '#0A84FF',
        fontWeight: '600',
    },
});

export default AuthScreen;
