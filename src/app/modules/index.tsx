import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { 
    fetchAllModules, 
    fetchUserActiveModules, 
    activateModule, 
    deactivateModule, 
    canActivateModule,
    TrainingModule,
    ModuleRoutine
} from '@/services/modules';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, SubscriptionTier } from '@/stores/profileStore';

export default function ModuleLibraryScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { tier } = useProfileStore();

    const [modules, setModules] = useState<TrainingModule[]>([]);
    const [activeModuleIds, setActiveModuleIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [user?.id]);

    async function loadData() {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [allMods, activeMods] = await Promise.all([
                fetchAllModules(),
                fetchUserActiveModules(user.id)
            ]);
            setModules(allMods);
            setActiveModuleIds(new Set(activeMods.map(m => m.id)));
        } catch (error) {
            console.error('Failed to load modules:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleModule(mod: TrainingModule) {
        if (!user?.id) return;
        
        try {
            setTogglingId(mod.id);
            const isActive = activeModuleIds.has(mod.id);

            if (isActive) {
                // Deactivate
                await deactivateModule(user.id, mod.slug);
                const updated = new Set(activeModuleIds);
                updated.delete(mod.id);
                setActiveModuleIds(updated);
            } else {
                // Check if allowed to activate
                const { allowed, reason } = await canActivateModule(user.id, mod.slug, tier || 'free');
                
                if (!allowed) {
                    if (reason?.includes('Requires')) {
                        showAlert(
                            'Premium Module',
                            reason + ' Upgrade to unlock this module.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Upgrade', onPress: () => router.push('/subscribe') }
                            ]
                        );
                    } else {
                        showAlert('Cannot Activate Module', reason);
                    }
                    return;
                }

                // Activate
                await activateModule(user.id, mod.slug);
                const updated = new Set(activeModuleIds);
                updated.add(mod.id);
                setActiveModuleIds(updated);
            }
        } catch (error) {
            showAlert('Error', 'Failed to update module status.');
        } finally {
            setTogglingId(null);
        }
    }

    const renderPlacementBadge = (placement: string) => {
        let text = 'Anytime';
        let color = '#FFF';

        switch (placement) {
            case 'pre_workout': text = 'Pre-Workout'; color = '#00b894'; break;
            case 'post_workout': text = 'Post-Workout'; color = '#0984e3'; break;
            case 'rest_day': text = 'Rest Day'; color = '#fdcb6e'; break;
        }

        return (
            <View style={styles.placementBadge}>
                <Text style={[styles.placementText, { color }]}>{text}</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <Stack.Screen options={{ headerTitle: 'Supplemental Modules' }} />
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{
                    headerTitle: 'Modules',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }} 
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Supplemental Modules</Text>
                    <Text style={styles.subtitle}>
                        Optional layers you can add to your main training program. Max 2 active at a time.
                    </Text>
                </View>

                {modules.map((mod) => {
                    const isActive = activeModuleIds.has(mod.id);
                    const isPremium = mod.tier_required !== 'standard' && mod.tier_required !== 'free';
                    const hasAccess = ['free', 'standard', 'vip', 'elite'].indexOf(tier || 'free') >= ['free', 'standard', 'vip', 'elite'].indexOf(mod.tier_required);

                    return (
                        <View key={mod.id} style={[styles.moduleCard, isActive && styles.moduleCardActive]}>
                            <View style={styles.moduleHeaderRow}>
                                <View style={styles.moduleTitles}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.moduleName}>{mod.name}</Text>
                                        {!hasAccess && (
                                            <View style={styles.lockBadge}>
                                                <Ionicons name="lock-closed" size={12} color="#000" />
                                                <Text style={styles.lockText}>{mod.tier_required.toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.moduleDesc}>{mod.description}</Text>
                                </View>
                                
                                <TouchableOpacity 
                                    style={[styles.toggleBtn, isActive && styles.toggleBtnActive, togglingId === mod.id && { opacity: 0.5 }]}
                                    disabled={togglingId === mod.id}
                                    onPress={() => handleToggleModule(mod)}
                                >
                                    {togglingId === mod.id ? (
                                        <ActivityIndicator size="small" color={isActive ? theme.colors.background : '#FFF'} />
                                    ) : (
                                        <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
                                            {isActive ? 'ACTIVE' : 'ACTIVATE'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.routinesList}>
                                {mod.routines?.map((routine) => (
                                    <TouchableOpacity 
                                        key={routine.id} 
                                        style={styles.routineRow}
                                        onPress={() => {
                                            router.push(`/modules/${routine.id}`);
                                        }}
                                    >
                                        <View style={styles.routineLeft}>
                                            <Ionicons name="play-circle" size={24} color={theme.colors.primary} />
                                            <View>
                                                <Text style={styles.routineName}>{routine.name}</Text>
                                                <View style={styles.routineMeta}>
                                                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
                                                    <Text style={styles.routineTime}>{routine.duration_minutes} min</Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.3)' }}>•</Text>
                                                    {renderPlacementBadge(routine.placement)}
                                                </View>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: 24,
        paddingBottom: 40,
        gap: 20,
    },
    header: {
        marginBottom: 8,
    },
    title: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 8,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        lineHeight: 22,
    },
    moduleCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    moduleCardActive: {
        borderColor: 'rgba(0, 255, 128, 0.3)',
        backgroundColor: 'rgba(0, 255, 128, 0.03)',
    },
    moduleHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    moduleTitles: {
        flex: 1,
        paddingRight: 16,
    },
    moduleName: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    moduleDesc: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        lineHeight: 18,
    },
    lockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    lockText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
    },
    toggleBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    toggleBtnActive: {
        backgroundColor: '#00FF80',
    },
    toggleText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    toggleTextActive: {
        color: '#000',
    },
    routinesList: {
        gap: 12,
    },
    routineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 12,
    },
    routineLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    routineName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    routineMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    routineTime: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    },
    placementBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    placementText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
