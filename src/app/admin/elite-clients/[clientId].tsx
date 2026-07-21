import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';
import { findThreadForUser, createThreadForUser } from '@/services/messaging';

type EliteProgram = { id: string; name: string; is_active: boolean };
type SetLogRow = {
    id: string;
    set_number: number;
    reps: number;
    weight_lbs: number | null;
    rpe: number | null;
    created_at: string;
    exercises: { name: string } | null;
};
type WorkoutNote = { id: string; completed_at: string | null; notes: string };

export default function AdminEliteClientDashboard() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();
    const isCoachOrAdmin = profile?.role === 'admin' || profile?.role === 'coach';

    const params = useLocalSearchParams();
    const clientIdRaw = params?.clientId;
    const clientId = useMemo(() => (Array.isArray(clientIdRaw) ? clientIdRaw[0] : clientIdRaw) as string | undefined, [clientIdRaw]);

    const [loading, setLoading] = useState(true);
    const [clientLabel, setClientLabel] = useState('');
    const [program, setProgram] = useState<EliteProgram | null>(null);
    const [creatingProgram, setCreatingProgram] = useState(false);
    const [workoutCount, setWorkoutCount] = useState(0);
    const [lastWorkoutAt, setLastWorkoutAt] = useState<string | null>(null);
    const [setLogs, setSetLogs] = useState<SetLogRow[]>([]);
    const [workoutNotes, setWorkoutNotes] = useState<WorkoutNote[]>([]);
    const [coachNotes, setCoachNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [replying, setReplying] = useState(false);

    const load = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        try {
            const [profileRes, programRes, countRes, lastRes, setLogsRes, notesRes, coachNotesRes] = await Promise.all([
                supabase.from('profiles').select('email, full_name').eq('id', clientId).single(),
                supabase.from('programs').select('id, name, is_active').eq('owner_id', clientId).eq('program_type', 'elite').maybeSingle(),
                supabase.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', clientId).not('completed_at', 'is', null),
                supabase.from('workout_logs').select('completed_at').eq('user_id', clientId).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('set_logs').select('id,set_number,reps,weight_lbs,rpe,created_at,exercises(name),workout_logs!inner(user_id)').eq('workout_logs.user_id', clientId).order('created_at', { ascending: false }).limit(50),
                supabase.from('workout_logs').select('id,completed_at,notes').eq('user_id', clientId).not('notes', 'is', null).order('completed_at', { ascending: false }),
                supabase.from('elite_coach_notes').select('notes').eq('client_id', clientId).maybeSingle(),
            ]);

            const p = profileRes.data as any;
            setClientLabel(p?.full_name || p?.email || 'Client');
            setProgram((programRes.data as EliteProgram) ?? null);
            setWorkoutCount(countRes.count ?? 0);
            setLastWorkoutAt((lastRes.data as any)?.completed_at ?? null);
            setSetLogs((setLogsRes.data as any) ?? []);
            setWorkoutNotes((notesRes.data as any) ?? []);
            setCoachNotes((coachNotesRes.data as any)?.notes ?? '');
        } catch (error) {
            console.error('Error loading elite client dashboard:', error);
            showAlert('Error', 'Failed to load client data.');
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        if (isCoachOrAdmin) load();
    }, [isCoachOrAdmin, load]);

    async function handleBuildProgram() {
        if (!clientId) return;
        setCreatingProgram(true);
        try {
            const { data: programRow, error } = await supabase
                .from('programs')
                .insert({
                    name: `${clientLabel}'s Program`,
                    program_type: 'elite',
                    owner_id: clientId,
                    tier_required: 'elite',
                    is_active: true,
                    duration_weeks: 4,
                    difficulty: 'intermediate',
                    created_by: profile?.id ?? null,
                })
                .select('id, name, is_active')
                .single();

            if (error) throw error;
            router.push({ pathname: '/admin/program-structure', params: { programId: programRow.id } });
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to create program.');
        } finally {
            setCreatingProgram(false);
        }
    }

    async function handleSaveNotes() {
        if (!clientId) return;
        setSavingNotes(true);
        try {
            const { error } = await supabase
                .from('elite_coach_notes')
                .upsert({
                    client_id: clientId,
                    notes: coachNotes,
                    updated_by: profile?.id ?? null,
                    updated_at: new Date().toISOString(),
                });
            if (error) throw error;
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to save notes.');
        } finally {
            setSavingNotes(false);
        }
    }

    async function handleReply() {
        if (!clientId) return;
        setReplying(true);
        try {
            const existing = await findThreadForUser(clientId);
            if (existing) {
                router.push(`/admin/inbox/${existing.id}`);
                return;
            }
            const { threadId } = await createThreadForUser(clientId, 'training', 'Workout notes');
            router.push(`/admin/inbox/${threadId}`);
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to open conversation.');
        } finally {
            setReplying(false);
        }
    }

    if (!isCoachOrAdmin) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: true, headerTitle: 'Client' }} />
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.lockedTitle}>Not authorized</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: clientLabel || 'Client',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Program */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Program</Text>
                        {program ? (
                            <>
                                <Text style={styles.programName}>{program.name}</Text>
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => router.push({ pathname: '/admin/program-structure', params: { programId: program.id } })}
                                >
                                    <Text style={styles.primaryButtonText}>Edit Program</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.emptyText}>No bespoke program yet.</Text>
                                <TouchableOpacity style={styles.primaryButton} onPress={handleBuildProgram} disabled={creatingProgram}>
                                    {creatingProgram ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Build Program</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* Activity */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Activity</Text>
                        <Text style={styles.statLine}>{workoutCount} workouts logged</Text>
                        <Text style={styles.statLine}>
                            Last workout: {lastWorkoutAt ? new Date(lastWorkoutAt).toLocaleDateString() : 'Never'}
                        </Text>
                    </View>

                    {/* Progress */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Progress</Text>
                        {setLogs.length === 0 ? (
                            <Text style={styles.emptyText}>No logged sets yet.</Text>
                        ) : (
                            setLogs.map(s => (
                                <View key={s.id} style={styles.logRow}>
                                    <Text style={styles.logExercise}>{s.exercises?.name || 'Unknown exercise'}</Text>
                                    <Text style={styles.logDetail}>
                                        {s.weight_lbs ?? '-'} lbs × {s.reps} reps{s.rpe ? ` @ RPE ${s.rpe}` : ''} — {new Date(s.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Coach notes (private) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Notes (private)</Text>
                        <TextInput
                            style={styles.notesInput}
                            value={coachNotes}
                            onChangeText={setCoachNotes}
                            placeholder="e.g. shoulder is cranky, avoid overhead press"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            multiline
                        />
                        <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveNotes} disabled={savingNotes}>
                            {savingNotes ? (
                                <ActivityIndicator color={theme.colors.primary} size="small" />
                            ) : (
                                <Text style={styles.secondaryButtonText}>Save Notes</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Client's post-workout notes */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Client's Workout Notes</Text>
                        {workoutNotes.length === 0 ? (
                            <Text style={styles.emptyText}>No notes from client yet.</Text>
                        ) : (
                            <>
                                {workoutNotes.map(n => (
                                    <View key={n.id} style={styles.logRow}>
                                        <Text style={styles.logDetail}>
                                            {n.completed_at ? new Date(n.completed_at).toLocaleDateString() : ''}
                                        </Text>
                                        <Text style={styles.noteBody}>{n.notes}</Text>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.secondaryButton} onPress={handleReply} disabled={replying}>
                                    {replying ? (
                                        <ActivityIndicator color={theme.colors.primary} size="small" />
                                    ) : (
                                        <Text style={styles.secondaryButtonText}>Reply</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lockedTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
    scrollContent: { padding: theme.spacing.lg, paddingBottom: 40, gap: 16 },
    section: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    sectionTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    programName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
    emptyText: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 12 },
    statLine: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 4 },
    logRow: { marginBottom: 10 },
    logExercise: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    logDetail: { color: theme.colors.textSecondary, fontSize: 12 },
    noteBody: { color: '#FFF', fontSize: 14, marginTop: 2 },
    notesInput: {
        color: '#FFF',
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: theme.radius.md,
        padding: 12,
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 12,
        alignItems: 'center',
    },
    primaryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        alignItems: 'center',
    },
    secondaryButtonText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
});
