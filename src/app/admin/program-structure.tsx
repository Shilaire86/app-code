import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Platform } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';

type ProgramWeek = { id: string; program_id: string; week_number: number; title: string | null };
type ProgramDay = { id: string; program_week_id: string; day_number: number; title: string | null };
type ProgramDayExercise = {
    id: string;
    program_day_id: string;
    order_index: number;
    exercise_name: string;
    sets_target: number | null;
    reps_target: string | null;
    is_warmup?: boolean | null;
    is_cooldown?: boolean | null;
    created_at: string;
};

export default function AdminProgramStructureScreen() {
    const router = useRouter();
    const { profile } = useProfileStore();
    const isAdmin = profile?.role === 'admin';

    const params = useLocalSearchParams();
    const programIdRaw = params?.programId;
    const programId = useMemo(() => (Array.isArray(programIdRaw) ? programIdRaw[0] : programIdRaw) as string | undefined, [programIdRaw]);

    const [loadingWeeks, setLoadingWeeks] = useState(true);
    const [loadingDays, setLoadingDays] = useState(false);
    const [loadingExercises, setLoadingExercises] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
    const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

    const [days, setDays] = useState<ProgramDay[]>([]);
    const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

    const [exercises, setExercises] = useState<ProgramDayExercise[]>([]);
    const warmups = useMemo(
        () => [...exercises.filter(e => !!e.is_warmup)].sort((a, b) => (a.order_index - b.order_index) || (a.created_at > b.created_at ? 1 : -1)),
        [exercises]
    );
    const cooldowns = useMemo(
        () => [...exercises.filter(e => !!e.is_cooldown)].sort((a, b) => (a.order_index - b.order_index) || (a.created_at > b.created_at ? 1 : -1)),
        [exercises]
    );
    const mainWork = useMemo(
        () => [...exercises.filter(e => !e.is_warmup && !e.is_cooldown)].sort((a, b) => (a.order_index - b.order_index) || (a.created_at > b.created_at ? 1 : -1)),
        [exercises]
    );

    const [warmupName, setWarmupName] = useState('');
    const [warmupRepsTarget, setWarmupRepsTarget] = useState('');
    const [exerciseName, setExerciseName] = useState('');
    const [setsTarget, setSetsTarget] = useState('');
    const [repsTarget, setRepsTarget] = useState('');
    const [submittingExercise, setSubmittingExercise] = useState(false);
    const [submittingWarmup, setSubmittingWarmup] = useState(false);
    const [cooldownName, setCooldownName] = useState('');
    const [cooldownRepsTarget, setCooldownRepsTarget] = useState('');
    const [submittingCooldown, setSubmittingCooldown] = useState(false);
    const [deletingDayId, setDeletingDayId] = useState<string | null>(null);
    const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);
    const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin) return;
        if (!programId) {
            setLoadingWeeks(false);
            setErrorText('Missing programId.');
            return;
        }
        fetchWeeks(programId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, programId]);

    useEffect(() => {
        if (!isAdmin) return;
        if (!selectedWeekId) {
            setDays([]);
            setSelectedDayId(null);
            return;
        }
        fetchDays(selectedWeekId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, selectedWeekId]);

    useEffect(() => {
        if (!isAdmin) return;
        if (!selectedDayId) {
            setExercises([]);
            return;
        }
        fetchExercises(selectedDayId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, selectedDayId]);

    async function fetchWeeks(pid: string) {
        setLoadingWeeks(true);
        setErrorText(null);
        try {
            const { data, error } = await supabase
                .from('program_weeks')
                .select('id,program_id,week_number,title')
                .eq('program_id', pid)
                .order('week_number', { ascending: true });
            if (error) throw error;
            const rows = (data || []) as ProgramWeek[];
            setWeeks(rows);
            setSelectedWeekId(rows[0]?.id ?? null);
        } catch (e: any) {
            setWeeks([]);
            setSelectedWeekId(null);
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load weeks.');
        } finally {
            setLoadingWeeks(false);
        }
    }

    async function fetchDays(weekId: string) {
        setLoadingDays(true);
        setErrorText(null);
        try {
            const { data, error } = await supabase
                .from('program_days')
                .select('id,program_week_id,day_number,title')
                .eq('program_week_id', weekId)
                .order('day_number', { ascending: true });
            if (error) throw error;
            const rows = (data || []) as ProgramDay[];
            setDays(rows);
            setSelectedDayId(rows[0]?.id ?? null);
        } catch (e: any) {
            setDays([]);
            setSelectedDayId(null);
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load days.');
        } finally {
            setLoadingDays(false);
        }
    }

    async function fetchExercises(dayId: string) {
        setLoadingExercises(true);
        setErrorText(null);
        try {
            const { data, error } = await supabase
                .from('program_day_exercises')
                .select('id,program_day_id,order_index,exercise_name,sets_target,reps_target,is_warmup,is_cooldown,created_at')
                .eq('program_day_id', dayId)
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) throw error;
            setExercises((data || []) as ProgramDayExercise[]);
        } catch (e: any) {
            setExercises([]);
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load exercises.');
        } finally {
            setLoadingExercises(false);
        }
    }

    async function addWeek() {
        if (!programId) return;
        setErrorText(null);
        try {
            const nextWeekNumber = (weeks.reduce((m, w) => Math.max(m, w.week_number), 0) || 0) + 1;
            const sourceWeek =
                weeks.length > 0
                    ? weeks.reduce((prev, w) => (w.week_number > (prev?.week_number ?? -1) ? w : prev), weeks[0])
                    : null;

            // 1) Create the new week row
            const { data: newWeek, error: newWeekError } = await supabase
                .from('program_weeks')
                .insert({ program_id: programId, week_number: nextWeekNumber })
                .select('id,program_id,week_number,title')
                .single();

            if (newWeekError) throw newWeekError;

            // If there's nothing to clone, just refresh and select the new week.
            if (!sourceWeek?.id) {
                await fetchWeeks(programId);
                setSelectedWeekId(newWeek.id);
                return;
            }

            // 2) Clone days from source week into the new week
            const { data: sourceDays, error: sourceDaysError } = await supabase
                .from('program_days')
                .select('id,day_number,title,notes')
                .eq('program_week_id', sourceWeek.id)
                .order('day_number', { ascending: true });

            if (sourceDaysError) throw sourceDaysError;

            const dayRows = (sourceDays || []) as any[];
            if (dayRows.length === 0) {
                await fetchWeeks(programId);
                setSelectedWeekId(newWeek.id);
                await fetchDays(newWeek.id);
                return;
            }

            const dayInsertPayload = dayRows.map((d) => ({
                program_week_id: newWeek.id,
                day_number: d.day_number,
                title: d.title ?? null,
                notes: d.notes ?? null,
            }));

            const { data: newDays, error: newDaysError } = await supabase
                .from('program_days')
                .insert(dayInsertPayload)
                .select('id,day_number');

            if (newDaysError) throw newDaysError;

            const newDaysRows = (newDays || []) as { id: string; day_number: number }[];
            const newDaysByNumber = new Map<number, string>(newDaysRows.map((d) => [d.day_number, d.id]));
            const oldToNewDayId = new Map<string, string>();
            for (const d of dayRows) {
                const mapped = newDaysByNumber.get(d.day_number);
                if (mapped) oldToNewDayId.set(d.id, mapped);
            }

            // 3) Clone exercises from each source day into the corresponding new day.
            // `is_warmup` may not exist in some DBs yet; try selecting it, then fall back if needed.
            for (const d of dayRows) {
                const newDayId = oldToNewDayId.get(d.id);
                if (!newDayId) continue;

                let exRows: any[] | null = null;
                let exError: any = null;

                const attemptWithWarmup = await supabase
                    .from('program_day_exercises')
                    .select('order_index,exercise_name,sets_target,reps_target,rir_target,rest_seconds,notes,is_warmup,is_cooldown,created_at')
                    .eq('program_day_id', d.id)
                    .order('order_index', { ascending: true })
                    .order('created_at', { ascending: true });

                if (attemptWithWarmup.error && String(attemptWithWarmup.error.message || '').includes('is_warmup')) {
                    const attemptWithoutWarmup = await supabase
                        .from('program_day_exercises')
                        .select('order_index,exercise_name,sets_target,reps_target,rir_target,rest_seconds,notes,created_at')
                        .eq('program_day_id', d.id)
                        .order('order_index', { ascending: true })
                        .order('created_at', { ascending: true });

                    exRows = attemptWithoutWarmup.data as any[] | null;
                    exError = attemptWithoutWarmup.error;
                } else {
                    exRows = attemptWithWarmup.data as any[] | null;
                    exError = attemptWithWarmup.error;
                }

                if (exError) throw exError;
                const exList = (exRows || []) as any[];
                if (exList.length === 0) continue;

                const exInsert = exList.map((ex) => {
                    const base: any = {
                        program_day_id: newDayId,
                        order_index: ex.order_index ?? 0,
                        exercise_name: ex.exercise_name,
                        sets_target: ex.sets_target ?? null,
                        reps_target: ex.reps_target ?? null,
                        rir_target: ex.rir_target ?? null,
                        rest_seconds: ex.rest_seconds ?? null,
                        notes: ex.notes ?? null,
                    };
                    if (typeof ex.is_warmup === 'boolean') base.is_warmup = ex.is_warmup;
                    if (typeof ex.is_cooldown === 'boolean') base.is_cooldown = ex.is_cooldown;
                    return base;
                });

                const { error: exInsertError } = await supabase
                    .from('program_day_exercises')
                    .insert(exInsert);
                if (exInsertError) throw exInsertError;
            }

            // 4) Refresh UI and select the new week so it is immediately visible.
            await fetchWeeks(programId);
            setSelectedWeekId(newWeek.id);
            await fetchDays(newWeek.id);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to add week.');
        }
    }

    async function deleteWeek(weekId: string) {
        setDeletingWeekId(weekId);
        setErrorText(null);
        try {
            // Manual cascade safety: delete exercises -> days -> week.
            const { data: weekDays, error: weekDaysError } = await supabase
                .from('program_days')
                .select('id')
                .eq('program_week_id', weekId);
            if (weekDaysError) throw weekDaysError;

            const dayIds = (weekDays || []).map((d: any) => d.id).filter(Boolean) as string[];
            if (dayIds.length > 0) {
                // Delete exercises for each day (safe if DB cascade isn't present yet).
                for (const dayId of dayIds) {
                    const { error: exDelErr } = await supabase
                        .from('program_day_exercises')
                        .delete()
                        .eq('program_day_id', dayId);
                    if (exDelErr) throw exDelErr;
                }

                const { error: dayDelErr } = await supabase
                    .from('program_days')
                    .delete()
                    .eq('program_week_id', weekId);
                if (dayDelErr) throw dayDelErr;
            }

            const { error: weekDelErr } = await supabase
                .from('program_weeks')
                .delete()
                .eq('id', weekId);
            if (weekDelErr) throw weekDelErr;

            if (selectedWeekId === weekId) {
                setSelectedWeekId(null);
                setSelectedDayId(null);
                setDays([]);
                setExercises([]);
            }
            if (programId) await fetchWeeks(programId);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to delete week.');
        } finally {
            setDeletingWeekId(null);
        }
    }

    function confirmDeleteWeek(week: ProgramWeek) {
        const title = 'Delete Week';
        const message = `Delete Week ${week.week_number}? This will remove all days and exercises in this week.`;
        if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            const ok = globalThis.confirm?.(`${title}\n\n${message}`);
            if (ok) deleteWeek(week.id);
            return;
        }
        showAlert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteWeek(week.id) },
        ]);
    }

    async function addDay() {
        if (!selectedWeekId) return;
        setErrorText(null);
        try {
            const nextDay = (days.reduce((m, d) => Math.max(m, d.day_number), 0) || 0) + 1;
            const { error } = await supabase
                .from('program_days')
                .insert({ program_week_id: selectedWeekId, day_number: nextDay });
            if (error) throw error;
            await fetchDays(selectedWeekId);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to add day.');
        }
    }

    async function deleteDay(dayId: string) {
        setDeletingDayId(dayId);
        setErrorText(null);
        try {
            // FK in migrations is ON DELETE CASCADE from program_days -> program_day_exercises,
            // but if it isn't applied in the target DB yet, this manual cascade keeps it safe.
            await supabase.from('program_day_exercises').delete().eq('program_day_id', dayId);

            const { error } = await supabase
                .from('program_days')
                .delete()
                .eq('id', dayId);

            if (error) throw error;

            if (selectedDayId === dayId) {
                setSelectedDayId(null);
                setExercises([]);
            }
            if (selectedWeekId) await fetchDays(selectedWeekId);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to delete day.');
        } finally {
            setDeletingDayId(null);
        }
    }

    function confirmDeleteDay(day: ProgramDay) {
        const title = 'Delete Day';
        const message = `Delete Day ${day.day_number}? This will remove all exercises for this day.`;
        if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            const ok = globalThis.confirm?.(`${title}\n\n${message}`);
            if (ok) deleteDay(day.id);
            return;
        }
        showAlert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteDay(day.id) },
        ]);
    }

    async function deleteExercise(exerciseId: string) {
        setDeletingExerciseId(exerciseId);
        setErrorText(null);
        try {
            const { error } = await supabase
                .from('program_day_exercises')
                .delete()
                .eq('id', exerciseId);
            if (error) throw error;
            if (selectedDayId) await fetchExercises(selectedDayId);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to delete exercise.');
        } finally {
            setDeletingExerciseId(null);
        }
    }

    async function toggleWarmup(ex: ProgramDayExercise) {
        const next = !ex.is_warmup;
        setErrorText(null);
        setExercises(prev => prev.map(p => (p.id === ex.id ? { ...p, is_warmup: next } : p)));
        try {
            const { error } = await supabase
                .from('program_day_exercises')
                .update({ is_warmup: next })
                .eq('id', ex.id);
            if (error) throw error;
        } catch (e: any) {
            setExercises(prev => prev.map(p => (p.id === ex.id ? { ...p, is_warmup: ex.is_warmup } : p)));
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to toggle warm-up.');
        }
    }

    async function toggleCooldown(ex: ProgramDayExercise) {
        const next = !ex.is_cooldown;
        setErrorText(null);
        setExercises(prev => prev.map(p => (p.id === ex.id ? { ...p, is_cooldown: next } : p)));
        try {
            const { error } = await supabase
                .from('program_day_exercises')
                .update({ is_cooldown: next })
                .eq('id', ex.id);
            if (error) throw error;
        } catch (e: any) {
            setExercises(prev => prev.map(p => (p.id === ex.id ? { ...p, is_cooldown: ex.is_cooldown } : p)));
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to toggle post-workout.');
        }
    }

    async function addCooldownExercise() {
        if (!selectedDayId) return;
        const name = cooldownName.trim();
        if (!name) {
            setErrorText('Post-workout stretch name is required.');
            return;
        }
        setErrorText(null);
        setSubmittingCooldown(true);
        try {
            const reps = cooldownRepsTarget.trim() ? cooldownRepsTarget.trim() : null;
            const { error } = await supabase
                .from('program_day_exercises')
                .insert({
                    program_day_id: selectedDayId,
                    order_index: warmups.length + mainWork.length + cooldowns.length,
                    exercise_name: name,
                    sets_target: null,
                    reps_target: reps,
                    is_warmup: false,
                    is_cooldown: true,
                });
            if (error) throw error;
            setCooldownName('');
            setCooldownRepsTarget('');
            await fetchExercises(selectedDayId);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to add post-workout stretch.');
        } finally {
            setSubmittingCooldown(false);
        }
    }

    function confirmDeleteExercise(ex: ProgramDayExercise) {
        const title = 'Delete Exercise';
        const message = `Delete "${ex.exercise_name}"?`;
        if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            const ok = globalThis.confirm?.(`${title}\n\n${message}`);
            if (ok) deleteExercise(ex.id);
            return;
        }
        showAlert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteExercise(ex.id) },
        ]);
    }

    async function addWarmupExercise() {
        if (!selectedDayId) return;
        const name = warmupName.trim();
        if (!name) {
            setErrorText('Warm-up exercise name is required.');
            return;
        }
        setErrorText(null);
        setSubmittingWarmup(true);
        try {
            const warmupCount = warmups.length;
            const reps = warmupRepsTarget.trim() ? warmupRepsTarget.trim() : null;

            const { error } = await supabase
                .from('program_day_exercises')
                .insert({
                    program_day_id: selectedDayId,
                    order_index: warmupCount, // warmups come first
                    exercise_name: name,
                    sets_target: null,
                    reps_target: reps,
                    is_warmup: true,
                });
            if (error) throw error;

            setWarmupName('');
            setWarmupRepsTarget('');
            await fetchExercises(selectedDayId);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to add warm-up exercise.');
        } finally {
            setSubmittingWarmup(false);
        }
    }

    async function addExercise() {
        if (!selectedDayId) return;
        const name = exerciseName.trim();
        if (!name) {
            setErrorText('Exercise name is required.');
            return;
        }
        setErrorText(null);
        setSubmittingExercise(true);
        try {
            // Main work comes after warmups in order_index space.
            const nextOrder = (mainWork.reduce((m, ex) => Math.max(m, ex.order_index), warmups.length - 1) ?? warmups.length - 1) + 1;
            const sets = setsTarget.trim() ? Number(setsTarget) : null;
            const reps = repsTarget.trim() ? repsTarget.trim() : null;

            const { error } = await supabase
                .from('program_day_exercises')
                .insert({
                    program_day_id: selectedDayId,
                    order_index: Number.isFinite(nextOrder) ? nextOrder : 0,
                    exercise_name: name,
                    sets_target: Number.isFinite(sets as any) ? sets : null,
                    reps_target: reps,
                    is_warmup: false,
                });
            if (error) throw error;

            setExerciseName('');
            setSetsTarget('');
            setRepsTarget('');
            await fetchExercises(selectedDayId);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to add exercise.');
        } finally {
            setSubmittingExercise(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Program Structure',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            {!isAdmin ? (
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.title}>Not authorized</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : !programId ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.title}>Missing program</Text>
                    <Text style={styles.subtitle}>Open this screen with a programId.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {!!errorText && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>Error</Text>
                            <Text style={styles.errorBody}>{errorText}</Text>
                        </View>
                    )}

                    {/* Weeks */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Weeks</Text>
                            <TouchableOpacity style={styles.smallButton} onPress={addWeek}>
                                <Ionicons name="add" size={16} color={theme.colors.primary} />
                                <Text style={styles.smallButtonText}>Add Week</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingWeeks ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color={theme.colors.primary} />
                            </View>
                        ) : weeks.length === 0 ? (
                            <Text style={styles.emptyText}>No weeks yet.</Text>
                        ) : (
                            <View style={styles.pillRow}>
                                {weeks.map(w => (
                                    <View key={w.id} style={styles.weekPillWrap}>
                                        <TouchableOpacity
                                            style={[styles.pill, selectedWeekId === w.id && styles.pillActive]}
                                            onPress={() => setSelectedWeekId(w.id)}
                                        >
                                            <Text style={[styles.pillText, selectedWeekId === w.id && styles.pillTextActive]}>
                                                Week {w.week_number}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.weekDeleteButton, deletingWeekId === w.id && styles.weekDeleteButtonDisabled]}
                                            onPress={() => confirmDeleteWeek(w)}
                                            disabled={deletingWeekId === w.id}
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Days */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Days</Text>
                            <TouchableOpacity
                                style={[styles.smallButton, !selectedWeekId && styles.smallButtonDisabled]}
                                onPress={addDay}
                                disabled={!selectedWeekId}
                            >
                                <Ionicons name="add" size={16} color={theme.colors.primary} />
                                <Text style={styles.smallButtonText}>Add Day</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingDays ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color={theme.colors.primary} />
                            </View>
                        ) : !selectedWeekId ? (
                            <Text style={styles.emptyText}>Select a week to view days.</Text>
                        ) : days.length === 0 ? (
                            <Text style={styles.emptyText}>No days yet.</Text>
                        ) : (
                            <View style={styles.pillRow}>
                                {days.map(d => (
                                    <View key={d.id} style={styles.dayPillWrap}>
                                        <TouchableOpacity
                                            style={[styles.pill, selectedDayId === d.id && styles.pillActive]}
                                            onPress={() => setSelectedDayId(d.id)}
                                        >
                                            <Text style={[styles.pillText, selectedDayId === d.id && styles.pillTextActive]}>
                                                Day {d.day_number}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.dayDeleteButton, deletingDayId === d.id && styles.dayDeleteButtonDisabled]}
                                            onPress={() => confirmDeleteDay(d)}
                                            disabled={deletingDayId === d.id}
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Exercises */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Workout</Text>

                        {loadingExercises ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color={theme.colors.primary} />
                            </View>
                        ) : !selectedDayId ? (
                            <Text style={styles.emptyText}>Select a day to view exercises.</Text>
                        ) : (
                            <>
                                <View style={styles.subSection}>
                                    <Text style={styles.subSectionTitle}>Warm-Up</Text>
                                    {warmups.length === 0 ? (
                                        <Text style={styles.emptyText}>No warm-ups yet.</Text>
                                    ) : (
                                        <View style={styles.list}>
                                    {warmups.map(ex => (
                                        <View key={ex.id} style={styles.listRow}>
                                            <View style={styles.listLeft}>
                                                <Text style={styles.listTitle}>{ex.exercise_name}</Text>
                                                <Text style={styles.listSub}>{ex.reps_target || '—'}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.warmupChip}
                                                onPress={() => toggleWarmup(ex)}
                                            >
                                                <Text style={styles.warmupChipText}>Warm-up</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.smallIconButton, deletingExerciseId === ex.id && styles.smallIconButtonDisabled]}
                                                onPress={() => confirmDeleteExercise(ex)}
                                                disabled={deletingExerciseId === ex.id}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.form}>
                                        <Text style={styles.formTitle}>Add Warm-Up Exercise</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Warm-up exercise name (required)"
                                            placeholderTextColor="rgba(255,255,255,0.35)"
                                            value={warmupName}
                                            onChangeText={setWarmupName}
                                            editable={!!selectedDayId && !submittingWarmup}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Reps / time (e.g. 10 reps or 5 min)"
                                            placeholderTextColor="rgba(255,255,255,0.35)"
                                            value={warmupRepsTarget}
                                            onChangeText={setWarmupRepsTarget}
                                            editable={!!selectedDayId && !submittingWarmup}
                                        />
                                        <TouchableOpacity
                                            style={[styles.primaryButton, (!selectedDayId || submittingWarmup) && styles.primaryButtonDisabled]}
                                            onPress={addWarmupExercise}
                                            disabled={!selectedDayId || submittingWarmup}
                                        >
                                            <Text style={styles.primaryButtonText}>{submittingWarmup ? 'Adding...' : 'Add Warm-Up'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.subSection}>
                                    <Text style={styles.subSectionTitle}>Main Work</Text>
                                    {mainWork.length === 0 ? (
                                        <Text style={styles.emptyText}>No main exercises yet.</Text>
                                    ) : (
                                        <View style={styles.list}>
                                            {mainWork.map(ex => (
                                                <View key={ex.id} style={styles.listRow}>
                                                    <View style={styles.listLeft}>
                                                        <Text style={styles.listTitle}>{ex.exercise_name}</Text>
                                                        <Text style={styles.listSub}>
                                                            {ex.sets_target != null ? `${ex.sets_target} sets` : '—'} • {ex.reps_target || '— reps'}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[styles.warmupChip, styles.warmupChipOff]}
                                                        onPress={() => toggleWarmup(ex)}
                                                    >
                                                        <Text style={styles.warmupChipText}>Warm-up</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.smallIconButton, deletingExerciseId === ex.id && styles.smallIconButtonDisabled]}
                                                        onPress={() => confirmDeleteExercise(ex)}
                                                        disabled={deletingExerciseId === ex.id}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Add Main Exercise (inline) */}
                                    <View style={styles.form}>
                                        <Text style={styles.formTitle}>Add Main Exercise</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Exercise name (required)"
                                            placeholderTextColor="rgba(255,255,255,0.35)"
                                            value={exerciseName}
                                            onChangeText={setExerciseName}
                                            editable={!!selectedDayId && !submittingExercise}
                                        />
                                        <View style={styles.formRow}>
                                            <TextInput
                                                style={[styles.input, styles.inputHalf]}
                                                placeholder="Sets"
                                                placeholderTextColor="rgba(255,255,255,0.35)"
                                                keyboardType="number-pad"
                                                value={setsTarget}
                                                onChangeText={setSetsTarget}
                                                editable={!!selectedDayId && !submittingExercise}
                                            />
                                            <TextInput
                                                style={[styles.input, styles.inputHalf]}
                                                placeholder="Reps (e.g. 8-12)"
                                                placeholderTextColor="rgba(255,255,255,0.35)"
                                                value={repsTarget}
                                                onChangeText={setRepsTarget}
                                                editable={!!selectedDayId && !submittingExercise}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.primaryButton, (!selectedDayId || submittingExercise) && styles.primaryButtonDisabled]}
                                            onPress={addExercise}
                                            disabled={!selectedDayId || submittingExercise}
                                        >
                                            <Text style={styles.primaryButtonText}>{submittingExercise ? 'Adding...' : 'Add Main Exercise'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Post-Workout Stretches */}
                                <View style={styles.subSection}>
                                    <Text style={styles.subSectionTitle}>Post-Workout</Text>
                                    {cooldowns.length === 0 ? (
                                        <Text style={styles.emptyText}>No post-workout stretches yet.</Text>
                                    ) : (
                                        <View style={styles.list}>
                                            {cooldowns.map(ex => (
                                                <View key={ex.id} style={styles.listRow}>
                                                    <View style={styles.listLeft}>
                                                        <Text style={styles.listTitle}>{ex.exercise_name}</Text>
                                                        <Text style={styles.listSub}>{ex.reps_target || '—'}</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.cooldownChip}
                                                        onPress={() => toggleCooldown(ex)}
                                                    >
                                                        <Text style={styles.cooldownChipText}>Post-WO</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.smallIconButton, deletingExerciseId === ex.id && styles.smallIconButtonDisabled]}
                                                        onPress={() => confirmDeleteExercise(ex)}
                                                        disabled={deletingExerciseId === ex.id}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.form}>
                                        <Text style={styles.formTitle}>Add Post-Workout Stretch</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Stretch / movement name (required)"
                                            placeholderTextColor="rgba(255,255,255,0.35)"
                                            value={cooldownName}
                                            onChangeText={setCooldownName}
                                            editable={!!selectedDayId && !submittingCooldown}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Duration (e.g. 30 sec hold or 5 breaths)"
                                            placeholderTextColor="rgba(255,255,255,0.35)"
                                            value={cooldownRepsTarget}
                                            onChangeText={setCooldownRepsTarget}
                                            editable={!!selectedDayId && !submittingCooldown}
                                        />
                                        <TouchableOpacity
                                            style={[styles.cooldownButton, (!selectedDayId || submittingCooldown) && styles.primaryButtonDisabled]}
                                            onPress={addCooldownExercise}
                                            disabled={!selectedDayId || submittingCooldown}
                                        >
                                            <Text style={styles.primaryButtonText}>{submittingCooldown ? 'Adding...' : 'Add Post-Workout'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
        gap: 10,
    },
    title: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 6,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 10,
    },
    content: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.lg,
    },
    section: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: theme.spacing.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
    },
    smallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.12)',
        borderRadius: theme.radius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    smallButtonDisabled: {
        opacity: 0.5,
    },
    smallButtonText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '900',
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    weekPillWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    weekDeleteButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,107,107,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.25)',
    },
    weekDeleteButtonDisabled: {
        opacity: 0.6,
    },
    dayPillWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dayDeleteButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,107,107,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.25)',
    },
    dayDeleteButtonDisabled: {
        opacity: 0.6,
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(0,0,0,0.12)',
    },
    pillActive: {
        backgroundColor: 'rgba(0,187,255,0.18)',
        borderColor: 'rgba(0,187,255,0.35)',
    },
    pillText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: '800',
    },
    pillTextActive: {
        color: '#FFF',
    },
    loadingRow: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    list: {
        gap: 10,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        backgroundColor: 'rgba(0,0,0,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    listLeft: {
        flex: 1,
        minWidth: 0,
    },
    listTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
    },
    listSub: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    listOrder: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '800',
    },
    smallIconButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,107,107,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.25)',
    },
    smallIconButtonDisabled: {
        opacity: 0.6,
    },
    warmupChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(0,187,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.35)',
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warmupChipOff: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.10)',
    },
    warmupChipText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
    },
    cooldownChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,152,0,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,152,0,0.35)',
        minHeight: 36,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    cooldownChipText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900' as const,
    },
    cooldownButton: {
        backgroundColor: 'rgba(255,152,0,0.85)',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        minHeight: 44,
    },
    subSection: {
        gap: theme.spacing.md,
        paddingTop: theme.spacing.sm,
    },
    subSectionTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
    },
    form: {
        marginTop: theme.spacing.sm,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: theme.spacing.md,
    },
    formTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
    },
    formRow: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFF',
        fontSize: 13,
    },
    inputHalf: {
        flex: 1,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: '#FFF',
        fontWeight: '900',
    },
    errorBox: {
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderColor: 'rgba(255,107,107,0.28)',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
    },
    errorTitle: {
        color: '#FFB3B3',
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 4,
    },
    errorBody: {
        color: '#FFB3B3',
        fontSize: 12,
        lineHeight: 16,
    },
});
