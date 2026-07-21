import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { showAlert, showPrompt } from '@/lib/confirm';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { ExercisePicker } from '@/components/ExercisePicker';
import { ProgramHealthCheck, runHealthCheck } from '@/components/ProgramHealthCheck';
import { ExerciseMatch } from '@/services/exercises';
import { supabase } from '@/lib/supabase';
import { goBackOr } from '@/lib/navigation';

type BuildExercise = {
    id: string;
    name: string;
    muscle_groups: string[];
    sets: number;
    reps: string;
    rest: number;
};

type BuildDay = {
    title: string;
    exercises: BuildExercise[];
};

export default function BuildProgramScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();

    const [programName, setProgramName] = useState('');
    const [durationWeeks, setDurationWeeks] = useState(4);
    const [days, setDays] = useState<BuildDay[]>([
        { title: 'Day 1', exercises: [] },
    ]);
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showHealthCheck, setShowHealthCheck] = useState(false);

    // --- Day Management ---
    const addDay = () => {
        setDays([...days, { title: `Day ${days.length + 1}`, exercises: [] }]);
        setActiveDayIndex(days.length);
    };

    const removeDay = (idx: number) => {
        if (days.length <= 1) return;
        const newDays = days.filter((_, i) => i !== idx);
        setDays(newDays);
        setActiveDayIndex(Math.min(activeDayIndex, newDays.length - 1));
    };

    const updateDayTitle = (idx: number, title: string) => {
        const newDays = [...days];
        newDays[idx] = { ...newDays[idx], title };
        setDays(newDays);
    };

    // --- Exercise Management ---
    const addExercise = (exercise: ExerciseMatch) => {
        const newDays = [...days];
        newDays[activeDayIndex].exercises.push({
            id: exercise.id,
            name: exercise.name,
            muscle_groups: exercise.muscle_groups,
            sets: 3,
            reps: '10-12',
            rest: 90,
        });
        setDays(newDays);
    };

    const removeExercise = (dayIdx: number, exIdx: number) => {
        const newDays = [...days];
        newDays[dayIdx].exercises.splice(exIdx, 1);
        setDays(newDays);
    };

    const updateExercise = (dayIdx: number, exIdx: number, updates: Partial<BuildExercise>) => {
        const newDays = [...days];
        newDays[dayIdx].exercises[exIdx] = { ...newDays[dayIdx].exercises[exIdx], ...updates };
        setDays(newDays);
    };

    // --- Health Check ---
    const healthIssues = showHealthCheck ? runHealthCheck(days) : [];
    const hasErrors = healthIssues.some((i) => i.level === 'error');

    // --- Save Program ---
    const handleSave = useCallback(async () => {
        if (!user?.id) return;

        if (!programName.trim()) {
            showAlert('Missing Name', 'Give your program a name.');
            return;
        }

        // Run health check first
        setShowHealthCheck(true);
        const issues = runHealthCheck(days);
        const errors = issues.filter((i) => i.level === 'error');

        if (errors.length > 0) {
            showAlert('Cannot Save', 'Fix the errors in the health check before saving.');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Create Program
            const { data: program, error: pErr } = await supabase
                .from('programs')
                .insert({
                    name: programName.trim(),
                    program_type: 'custom',
                    owner_id: user.id,
                    is_active: true,
                    duration_weeks: durationWeeks,
                    difficulty: 'intermediate',
                    tier_required: 'elite',
                })
                .select()
                .single();

            if (pErr) throw pErr;

            // 2. Create weeks (duplicate the day structure across all weeks)
            for (let week = 1; week <= durationWeeks; week++) {
                const { data: weekRow, error: wErr } = await supabase
                    .from('program_weeks')
                    .insert({ program_id: program.id, week_number: week })
                    .select()
                    .single();

                if (wErr) throw wErr;

                // 3. Create days for each week
                for (let dIdx = 0; dIdx < days.length; dIdx++) {
                    const day = days[dIdx];

                    const { data: dayRow, error: dErr } = await supabase
                        .from('program_days')
                        .insert({
                            program_week_id: weekRow.id,
                            day_number: dIdx + 1,
                            title: day.title,
                        })
                        .select()
                        .single();

                    if (dErr) throw dErr;

                    // 4. Create exercises for each day
                    if (day.exercises.length > 0) {
                        const exercisePayload = day.exercises.map((ex, idx) => ({
                            program_day_id: dayRow.id,
                            exercise_name: ex.name,
                            order_index: idx,
                            sets_target: ex.sets,
                            reps_target: ex.reps,
                            rest_seconds: ex.rest,
                        }));

                        const { error: eErr } = await supabase
                            .from('program_day_exercises')
                            .insert(exercisePayload);
                        if (eErr) throw eErr;
                    }
                }
            }

            showAlert('Program Created!', `"${programName}" has been saved to My Programs.`, [
                { text: 'View Programs', onPress: () => router.replace('/(tabs)/programs') },
            ]);
        } catch (err) {
            console.error('[BuildProgram] Save failed', err);
            showAlert('Error', 'Failed to save program. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }, [user, programName, durationWeeks, days, router]);

    const activeDay = days[activeDayIndex];

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Stack.Screen
                options={{
                    title: 'Build Program',
                    headerShown: true,
                    headerTransparent: true,
                    headerTitleStyle: { color: '#FFF' },
                    headerTintColor: '#FFF',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)/programs')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Program Name */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PROGRAM NAME</Text>
                    <TextInput
                        style={styles.nameInput}
                        placeholder="e.g. My Summer Shred"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={programName}
                        onChangeText={setProgramName}
                    />
                </View>

                {/* Duration */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DURATION</Text>
                    <View style={styles.durationRow}>
                        {[4, 6, 8, 12].map((w) => (
                            <TouchableOpacity
                                key={w}
                                style={[styles.durationChip, durationWeeks === w && styles.durationChipActive]}
                                onPress={() => setDurationWeeks(w)}
                            >
                                <Text style={[styles.durationChipText, durationWeeks === w && styles.durationChipTextActive]}>
                                    {w}w
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Day Tabs */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>TRAINING DAYS</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
                        <View style={styles.dayTabs}>
                            {days.map((d, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[styles.dayTab, activeDayIndex === idx && styles.dayTabActive]}
                                    onPress={() => setActiveDayIndex(idx)}
                                    onLongPress={() => {
                                        if (days.length > 1) {
                                            showAlert('Remove Day', `Delete "${d.title}"?`, [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => removeDay(idx) },
                                            ]);
                                        }
                                    }}
                                >
                                    <Text style={[styles.dayTabText, activeDayIndex === idx && styles.dayTabTextActive]}>
                                        {d.title}
                                    </Text>
                                    <Text style={styles.dayTabCount}>{d.exercises.length} ex</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.addDayTab} onPress={addDay}>
                                <Ionicons name="add" size={18} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>

                {/* Active Day Editor */}
                <View style={styles.section}>
                    <View style={styles.dayHeader}>
                        <TextInput
                            style={styles.dayTitleInput}
                            value={activeDay.title}
                            onChangeText={(t) => updateDayTitle(activeDayIndex, t)}
                            placeholder="Day name (e.g. Push Day)"
                            placeholderTextColor={theme.colors.textTertiary}
                        />
                    </View>

                    {activeDay.exercises.length === 0 ? (
                        <View style={styles.emptyDay}>
                            <Ionicons name="barbell-outline" size={36} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyDayText}>No exercises yet</Text>
                        </View>
                    ) : (
                        activeDay.exercises.map((ex, exIdx) => (
                            <View key={`${ex.id}-${exIdx}`} style={styles.exerciseCard}>
                                <View style={styles.exHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.exName}>{ex.name}</Text>
                                        <Text style={styles.exMuscle}>{ex.muscle_groups.join(', ')}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeExercise(activeDayIndex, exIdx)}>
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.exControls}>
                                    <View style={styles.controlItem}>
                                        <Text style={styles.controlLabel}>SETS</Text>
                                        <View style={styles.counter}>
                                            <TouchableOpacity
                                                style={styles.counterBtn}
                                                onPress={() => updateExercise(activeDayIndex, exIdx, { sets: Math.max(1, ex.sets - 1) })}
                                            >
                                                <Ionicons name="remove" size={14} color="#FFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.counterVal}>{ex.sets}</Text>
                                            <TouchableOpacity
                                                style={styles.counterBtn}
                                                onPress={() => updateExercise(activeDayIndex, exIdx, { sets: ex.sets + 1 })}
                                            >
                                                <Ionicons name="add" size={14} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={styles.controlItem}>
                                        <Text style={styles.controlLabel}>REPS</Text>
                                        <TouchableOpacity
                                            style={styles.valueBtn}
                                            onPress={() => showPrompt('Target Reps', 'e.g. 10-12, 8, 15+', (t) => updateExercise(activeDayIndex, exIdx, { reps: t || '10-12' }), ex.reps)}
                                        >
                                            <Text style={styles.valueBtnText}>{ex.reps}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.controlItem}>
                                        <Text style={styles.controlLabel}>REST</Text>
                                        <TouchableOpacity
                                            style={styles.valueBtn}
                                            onPress={() => showPrompt('Rest (seconds)', '', (t) => { const v = parseInt(t); if (!isNaN(v)) updateExercise(activeDayIndex, exIdx, { rest: v }); }, ex.rest.toString())}
                                        >
                                            <Text style={styles.valueBtnText}>{ex.rest}s</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}

                    <TouchableOpacity style={styles.addExBtn} onPress={() => setPickerVisible(true)}>
                        <Ionicons name="add-circle" size={22} color={theme.colors.primary} />
                        <Text style={styles.addExText}>Add Exercise</Text>
                    </TouchableOpacity>
                </View>

                {/* Health Check */}
                <View style={styles.section}>
                    {!showHealthCheck ? (
                        <TouchableOpacity style={styles.healthCheckBtn} onPress={() => setShowHealthCheck(true)}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.primary} />
                            <Text style={styles.healthCheckBtnText}>Run Health Check</Text>
                        </TouchableOpacity>
                    ) : (
                        <ProgramHealthCheck issues={healthIssues} />
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="save" size={18} color="#000" />
                            <Text style={styles.saveButtonText}>SAVE PROGRAM</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <ExercisePicker
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={addExercise}
            />
        </KeyboardAvoidingView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingTop: 100,
        paddingBottom: 120,
    },
    section: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    sectionLabel: {
        color: theme.colors.textTertiary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: theme.spacing.sm,
    },
    nameInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        height: 48,
        paddingHorizontal: 16,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    durationRow: {
        flexDirection: 'row',
        gap: 10,
    },
    durationChip: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    durationChipActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(0,187,255,0.08)',
    },
    durationChipText: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        fontWeight: '700',
    },
    durationChipTextActive: {
        color: theme.colors.primary,
    },
    dayTabsScroll: {
        marginHorizontal: -theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
    },
    dayTabs: {
        flexDirection: 'row',
        gap: 8,
    },
    dayTab: {
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
        minWidth: 70,
    },
    dayTabActive: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(0,187,255,0.08)',
    },
    dayTabText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    dayTabTextActive: {
        color: theme.colors.primary,
    },
    dayTabCount: {
        color: theme.colors.textTertiary,
        fontSize: 10,
        marginTop: 2,
    },
    addDayTab: {
        backgroundColor: 'rgba(0,187,255,0.08)',
        borderRadius: 10,
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(0,187,255,0.3)',
    },
    dayHeader: {
        marginBottom: theme.spacing.md,
    },
    dayTitleInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        height: 44,
        paddingHorizontal: 14,
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    emptyDay: {
        alignItems: 'center',
        paddingVertical: 30,
        opacity: 0.6,
    },
    emptyDayText: {
        color: theme.colors.textTertiary,
        fontSize: 13,
        marginTop: 8,
    },
    exerciseCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    exHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    exName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    exMuscle: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    exControls: {
        flexDirection: 'row',
        gap: 10,
    },
    controlItem: {
        flex: 1,
    },
    controlLabel: {
        color: theme.colors.textTertiary,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        height: 34,
        justifyContent: 'space-between',
        paddingHorizontal: 3,
    },
    counterBtn: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterVal: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    valueBtn: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    addExBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
        marginTop: theme.spacing.sm,
    },
    addExText: {
        color: theme.colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    healthCheckBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.3)',
        backgroundColor: 'rgba(0,187,255,0.05)',
    },
    healthCheckBtnText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.lg,
        paddingBottom: 40,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    saveButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    saveButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
