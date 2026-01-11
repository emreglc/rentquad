import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import supabase from '../lib/supabaseClient';

const REMEMBER_ME_PREF_KEY = 'rentquad:rememberMeEnabled';
const REMEMBERED_EMAIL_KEY = 'rentquad:rememberedEmail';
const REMEMBERED_SESSION_KEY = 'rentquad:rememberedSession';

const AuthContext = createContext({
    session: null,
    user: null,
    loading: true,
    rememberMeEnabled: false,
    rememberedEmail: '',
    setRememberMePreference: async () => {},
    signIn: async () => ({}),
    signUp: async () => ({}),
    signOut: async () => ({}),
});

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rememberMeEnabled, setRememberMeEnabled] = useState(false);
    const [rememberedEmail, setRememberedEmail] = useState('');
    const redirectTo = useMemo(() => Linking.createURL('/auth-callback'), []);

    const ensureProfile = useCallback(async (user) => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();
        if (!data) {
            const metadata = user.user_metadata || {};
            await supabase.from('profiles').insert({
                id: user.id,
                full_name:
                    metadata.full_name ||
                    [metadata.first_name, metadata.last_name].filter(Boolean).join(' ').trim() ||
                    user.email,
                phone_number: metadata.phone_number || null,
                license_number: null,
            });
        }
    }, []);

    const persistRememberMeState = useCallback(
        async (enabled, { email, session: nextSession } = {}) => {
            setRememberMeEnabled(enabled);
            await AsyncStorage.setItem(REMEMBER_ME_PREF_KEY, enabled ? 'true' : 'false');

            if (enabled) {
                if (email) {
                    setRememberedEmail(email);
                    await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
                }
                if (nextSession?.refresh_token) {
                    await AsyncStorage.setItem(
                        REMEMBERED_SESSION_KEY,
                        JSON.stringify({
                            refresh_token: nextSession.refresh_token,
                            access_token: nextSession.access_token,
                        })
                    );
                }
            } else {
                setRememberedEmail('');
                await AsyncStorage.multiRemove([REMEMBERED_EMAIL_KEY, REMEMBERED_SESSION_KEY]);
            }
        },
        []
    );

    useEffect(() => {
        let mounted = true;
        const bootstrap = async () => {
            try {
                const storedPreference = await AsyncStorage.getItem(REMEMBER_ME_PREF_KEY);
                const storedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);

                if (mounted) {
                    setRememberMeEnabled(storedPreference === 'true');
                    if (storedEmail) {
                        setRememberedEmail(storedEmail);
                    }
                }

                const { data } = await supabase.auth.getSession();
                if (!mounted) return;

                let nextSession = data.session ?? null;

                if (!nextSession && storedPreference === 'true') {
                    const rawStoredSession = await AsyncStorage.getItem(REMEMBERED_SESSION_KEY);
                    if (rawStoredSession) {
                        try {
                            const parsed = JSON.parse(rawStoredSession);
                            if (parsed?.refresh_token) {
                                const { data: restored, error } = await supabase.auth.setSession({
                                    refresh_token: parsed.refresh_token,
                                    access_token: parsed.access_token ?? parsed.refresh_token,
                                });
                                if (!error) {
                                    nextSession = restored?.session ?? null;
                                } else {
                                    await AsyncStorage.removeItem(REMEMBERED_SESSION_KEY);
                                }
                            }
                        } catch (err) {
                            await AsyncStorage.removeItem(REMEMBERED_SESSION_KEY);
                        }
                    }
                }

                setSession(nextSession);
                setLoading(false);
                if (nextSession?.user) {
                    ensureProfile(nextSession.user);
                }
            } catch (error) {
                setLoading(false);
                console.warn('Auth bootstrap failed', error);
            }
        };

        bootstrap();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession ?? null);
            setLoading(false);
            if (newSession?.user) {
                ensureProfile(newSession.user);
            }
        });

        return () => {
            mounted = false;
            authListener?.subscription?.unsubscribe?.();
        };
    }, [ensureProfile]);

    const value = useMemo(() => ({
        session,
        user: session?.user ?? null,
        loading,
        rememberMeEnabled,
        rememberedEmail,
        setRememberMePreference: (enabled) => persistRememberMeState(enabled),
        signIn: async (email, password, options = {}) => {
            const response = await supabase.auth.signInWithPassword({ email, password });
            if (!response.error) {
                const shouldRemember = !!options.remember;
                await persistRememberMeState(shouldRemember, {
                    email: shouldRemember ? email : undefined,
                    session: shouldRemember ? response.data.session : undefined,
                });
            }
            return response;
        },
        signUp: async (email, password, profileData = {}) => {
            const { firstName, lastName, phoneNumber } = profileData;
            return supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectTo,
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        phone_number: phoneNumber,
                    },
                },
            });
        },
        signOut: async () => {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem(REMEMBERED_SESSION_KEY);
        },
    }), [ensureProfile, loading, persistRememberMeState, redirectTo, rememberedEmail, rememberMeEnabled, session]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
