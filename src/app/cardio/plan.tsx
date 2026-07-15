import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import {
    UserCardioPlanEntry,
    getUserCardioPlan,
    generateWeeklyCardioPlan,
    markCardioComplete,
    CardioGoal,
} from '@/services/cardio';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const INTENSITY_COLORS: Record<string, string> = {
    low: '#4CAF50',
    moderate: '#FF9800',
    high: '#F44336',
};

export default function CardioPlanScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { profile } = useProfileStore();
    const [plan, setPlan] = useState<UserCardioPlanEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const userGoal: CardioGoal = profile?.fitness_goal || 'maintain';
    const userEquipment: string[] = profile?.equipment_access || [];

    useFocusEffect(
        useCallback(() => {
            loadPlan();
        }, [user])
    );

    const loadPlan = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await getUserCardioPlan(user.id);
            setPlan(data);
        } catch (e) {
            console.error('[CardioPlan] Error loading plan:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!user?.id) return;
        try {
            setGenerating(true);
            // Assume training days from profile or default to 4 weekdays
            const trainingDays = profile?.training_days || [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
            const data = await generateWeeklyCardioPlan(user.id, userGoal, userEquipment, trainingDays);
            setPlan(data);
        } catch (e) {
            console.error('[CardioPlan] Error generating plan:', e);
            showAlert('Error', 'Failed to generate cardio plan. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handleComplete = async (entry: UserCardioPlanEntry) => {
        try {
            await markCardioComplete(entry.id);
            setPlan(prev =>
                prev.map(p => (p.id === entry.id ? { ...p, is_completed: true } : p))
            );
        } catch (e) {
            showAlert('Error', 'Failed to mark as complete.');
        }
    };

    const getDayOfWeek = (): number => {
        const d = new Date().getDay();
        return d === 0 ? 7 : d;
    };

    const todayDay = getDayOfWeek();

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weekly Cardio Plan</Text>
                <TouchableOpacity onPress={handleGenerate} disabled={generating}>
                    <Ionicons
                        name="refresh"
                        size={22}
                        color={generating ? theme.colors.textSecondary : theme.colors.primary}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Goal Banner */}
                <View style={styles.goalBanner}>
                    <Text style={styles.goalLabel}>YOUR GOAL</Text>
                    <Text style={styles.goalValue}>
                        {userGoal === 'lose' ? '🔥 Fat Loss' : userGoal === 'gain' ? '💪 Muscle Gain' : '⚖️ Maintain'}
                    </Text>
                    <Text style={styles.goalHint}>
                        {userGoal === 'lose'
                            ? '4 sessions/week · Moderate intensity focus'
                            : userGoal === 'gain'
                            ? '2 sessions/week · Low impact, recovery focus'
                            : '3 sessions/week · Balanced mix'}
                    </Text>
                </View>

                {/* Empty State */}
                {plan.length === 0 && (
                    <View style={styles.emptyBox}>
                        <Ionicons name="fitness-outline" size={48} color={theme.colors.textSecondary} />
                        <Text style={styles.emptyTitle}>No Cardio Plan Yet</Text>
                        <Text style={styles.emptyText}>
                            Generate a personalized weekly cardio plan based on your goal and available equipment.
                        </Text>
                        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
                            {generating ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                <>
                                    <Ionicons name="sparkles" size={18} color="#000" />
                                    <Text style={styles.generateBtnText}>GENERATE MY PLAN</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Weekly Plan Grid */}
                {plan.length > 0 && (
                    <View style={styles.weekGrid}>
                        {[1, 2, 3, 4, 5, 6, 7].map(day => {
                            const entry = plan.find(p => p.scheduled_day === day);
                            const isToday = day === todayDay;
                            const protocol = entry?.protocol as any;

                            return (
                                <View
                                    key={day}
                                    style={[
                                        styles.dayCard,
                                        isToday && styles.dayCardToday,
                                        entry?.is_completed && styles.dayCardComplete,
                                    ]}
                                >
                                    <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                                        {DAY_LABELS[day - 1]}
                                    </Text>

                                    {entry && protocol ? (
                                        <>
                                            {protocol.is_signature && (
                                                <Ionicons name="star" size={14} color="#FFD700" style={{ marginBottom: 4 }} />
                                            )}
                                            <Text style={styles.dayProtocolName} numberOfLines={2}>
                                                {protocol.name}
                                            </Text>
                                            <View style={styles.dayMeta}>
                                                <Text style={styles.dayDuration}>{protocol.duration_minutes}m</Text>
                                                <View
                                                    style={[
                                                        styles.dayIntensityDot,
                                                        { backgroundColor: INTENSITY_COLORS[protocol.intensity] || '#FFF' },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.dayPlacement}>
                                                {entry.placement === 'rest_day' ? 'Rest Day' : 'Post-Workout'}
                                            </Text>

                                            {!entry.is_completed && isToday ? (
                                                <TouchableOpacity
                                                    style={styles.completeBtn}
                                                    onPress={() => handleComplete(entry)}
                                                >
                                                    <Ionicons name="checkmark" size={16} color="#000" />
                                                </TouchableOpacity>
                                            ) : entry.is_completed ? (
                                                <View style={styles.completedBadge}>
                                                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                                </View>
                                            ) : null}
                                        </>
                                    ) : (
                                        <Text style={styles.restText}>—</Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Regenerate Footer */}
                {plan.length > 0 && (
                    <TouchableOpacity style={styles.regenBtn} onPress={handleGenerate} disabled={generating}>
                        <Ionicons name="refresh" size={16} color={theme.colors.primary} />
                        <Text style={styles.regenBtnText}>
                            {generating ? 'Generating...' : 'Regenerate Plan'}
                        </Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    goalBanner: {
        backgroundColor: 'rgba(0,187,255,0.06)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.15)',
    },
    goalLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    goalValue: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 4,
    },
    goalHint: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
    },
    emptyBox: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
    },
    emptyTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    generateBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
    },
    generateBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    weekGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 12,
        width: '31%',
        minHeight: 130,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dayCardToday: {
        borderColor: theme.colors.primary + '60',
        backgroundColor: 'rgba(0,187,255,0.06)',
    },
    dayCardComplete: {
        opacity: 0.7,
    },
    dayLabel: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 8,
    },
    dayLabelToday: {
        color: theme.colors.primary,
    },
    dayProtocolName: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 6,
    },
    dayMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    dayDuration: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    dayIntensityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dayPlacement: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 9,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    restText: {
        color: 'rgba(255,255,255,0.15)',
        fontSize: 24,
        marginTop: 20,
    },
    completeBtn: {
        backgroundColor: theme.colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedBadge: {
        marginTop: 2,
    },
    regenBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        marginTop: 16,
    },
    regenBtnText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});
