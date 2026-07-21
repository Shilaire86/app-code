import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Switch, TextInput, Platform } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { goBackOr } from '@/lib/navigation';

type TemplateKey = 'ul4' | 'ppl5' | 'fb3';
type Tier = 'free' | 'standard' | 'vip' | 'elite';

const TEMPLATES: {
    key: TemplateKey;
    title: string;
    days: { title: string; exercises: { name: string; sets?: number; reps?: string }[] }[];
    defaults: { durationWeeks: number; difficulty: 'beginner' | 'intermediate' };
}[] = [
    {
        key: 'ul4',
        title: '4-Day Upper/Lower Hypertrophy',
        defaults: { durationWeeks: 8, difficulty: 'intermediate' },
        days: [
            {
                title: 'Upper 1',
                exercises: [
                    { name: 'Chest Press (machine)', sets: 3, reps: '6-10' },
                    { name: 'Row (cable)', sets: 3, reps: '8-12' },
                    { name: 'Shoulder Press (dumbbells)', sets: 3, reps: '8-12' },
                    { name: 'Lat Pulldown', sets: 3, reps: '8-12' },
                    { name: 'Lateral Raise', sets: 3, reps: '12-20' },
                    { name: 'Triceps Pressdown', sets: 2, reps: '12-20' },
                    { name: 'Biceps Curl (cable)', sets: 2, reps: '12-20' },
                ],
            },
            {
                title: 'Lower 1',
                exercises: [
                    { name: 'Squat (variation)', sets: 3, reps: '6-10' },
                    { name: 'Romanian Deadlift', sets: 3, reps: '6-10' },
                    { name: 'Leg Press', sets: 3, reps: '10-15' },
                    { name: 'Leg Curl (machine)', sets: 3, reps: '10-15' },
                    { name: 'Calf Raise', sets: 3, reps: '12-20' },
                    { name: 'Abdominal Crunch (cable)', sets: 2, reps: '12-20' },
                ],
            },
            {
                title: 'Upper 2',
                exercises: [
                    { name: 'Incline Press (dumbbells)', sets: 3, reps: '8-12' },
                    { name: 'Pull-Up / Assisted Pull-Up', sets: 3, reps: '6-10' },
                    { name: 'Chest Fly (cable)', sets: 2, reps: '12-20' },
                    { name: 'Row (machine)', sets: 3, reps: '8-12' },
                    { name: 'Rear Delt Raise', sets: 3, reps: '12-20' },
                    { name: 'Overhead Triceps Extension (cable)', sets: 2, reps: '12-20' },
                    { name: 'Hammer Curl', sets: 2, reps: '12-20' },
                ],
            },
            {
                title: 'Lower 2',
                exercises: [
                    { name: 'Hip Hinge (variation)', sets: 3, reps: '6-10' },
                    { name: 'Split Squat', sets: 3, reps: '8-12' },
                    { name: 'Leg Extension (machine)', sets: 3, reps: '12-20' },
                    { name: 'Glute Bridge / Hip Thrust', sets: 3, reps: '8-12' },
                    { name: 'Calf Raise', sets: 3, reps: '12-20' },
                    { name: 'Plank (timed)', sets: 2, reps: '30-60s' },
                ],
            },
        ],
    },
    {
        key: 'ppl5',
        title: '5-Day PPL Hypertrophy',
        defaults: { durationWeeks: 8, difficulty: 'intermediate' },
        days: [
            {
                title: 'Push',
                exercises: [
                    { name: 'Bench Press (variation)', sets: 3, reps: '6-10' },
                    { name: 'Incline Press (machine)', sets: 3, reps: '8-12' },
                    { name: 'Shoulder Press (machine)', sets: 3, reps: '8-12' },
                    { name: 'Lateral Raise', sets: 3, reps: '12-20' },
                    { name: 'Triceps Pressdown', sets: 2, reps: '12-20' },
                ],
            },
            {
                title: 'Pull',
                exercises: [
                    { name: 'Row (machine)', sets: 3, reps: '6-10' },
                    { name: 'Lat Pulldown', sets: 3, reps: '8-12' },
                    { name: 'Chest-Supported Row', sets: 3, reps: '8-12' },
                    { name: 'Rear Delt Fly', sets: 3, reps: '12-20' },
                    { name: 'Biceps Curl (dumbbells)', sets: 2, reps: '12-20' },
                ],
            },
            {
                title: 'Legs',
                exercises: [
                    { name: 'Squat (variation)', sets: 3, reps: '6-10' },
                    { name: 'Leg Press', sets: 3, reps: '10-15' },
                    { name: 'Romanian Deadlift', sets: 3, reps: '8-12' },
                    { name: 'Leg Curl (machine)', sets: 3, reps: '10-15' },
                    { name: 'Calf Raise', sets: 3, reps: '12-20' },
                ],
            },
            {
                title: 'Upper',
                exercises: [
                    { name: 'Chest Press (dumbbells)', sets: 3, reps: '8-12' },
                    { name: 'Row (cable)', sets: 3, reps: '8-12' },
                    { name: 'Lat Pulldown (wide or neutral)', sets: 2, reps: '10-15' },
                    { name: 'Lateral Raise', sets: 3, reps: '12-20' },
                    { name: 'Arms Superset (curl + extension)', sets: 2, reps: '12-20' },
                ],
            },
            {
                title: 'Lower',
                exercises: [
                    { name: 'Hip Hinge (variation)', sets: 3, reps: '6-10' },
                    { name: 'Split Squat', sets: 3, reps: '8-12' },
                    { name: 'Leg Extension (machine)', sets: 3, reps: '12-20' },
                    { name: 'Glute Bridge / Hip Thrust', sets: 3, reps: '8-12' },
                    { name: 'Core (choice)', sets: 2, reps: '12-20' },
                ],
            },
        ],
    },
    {
        key: 'fb3',
        title: '3-Day Full Body Hypertrophy (Beginner)',
        defaults: { durationWeeks: 6, difficulty: 'beginner' },
        days: [
            {
                title: 'Full Body 1',
                exercises: [
                    { name: 'Leg Press', sets: 3, reps: '10-15' },
                    { name: 'Chest Press (machine)', sets: 3, reps: '8-12' },
                    { name: 'Lat Pulldown', sets: 3, reps: '8-12' },
                    { name: 'Romanian Deadlift (light)', sets: 2, reps: '10-15' },
                    { name: 'Lateral Raise', sets: 2, reps: '12-20' },
                    { name: 'Plank (timed)', sets: 2, reps: '20-45s' },
                ],
            },
            {
                title: 'Full Body 2',
                exercises: [
                    { name: 'Goblet Squat', sets: 3, reps: '10-15' },
                    { name: 'Row (cable)', sets: 3, reps: '8-12' },
                    { name: 'Incline Press (dumbbells)', sets: 3, reps: '8-12' },
                    { name: 'Leg Curl (machine)', sets: 2, reps: '10-15' },
                    { name: 'Biceps Curl (cable)', sets: 2, reps: '12-20' },
                    { name: 'Triceps Pressdown', sets: 2, reps: '12-20' },
                ],
            },
            {
                title: 'Full Body 3',
                exercises: [
                    { name: 'Hip Hinge (variation)', sets: 3, reps: '8-12' },
                    { name: 'Chest Fly (cable)', sets: 2, reps: '12-20' },
                    { name: 'Row (machine)', sets: 3, reps: '8-12' },
                    { name: 'Leg Extension (machine)', sets: 2, reps: '12-20' },
                    { name: 'Rear Delt Raise', sets: 2, reps: '12-20' },
                    { name: 'Core (choice)', sets: 2, reps: '12-20' },
                ],
            },
        ],
    },
];

export default function AdminProgramsScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();

    const isAdmin = profile?.role === 'admin';

    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [programs, setPrograms] = useState<any[]>([]);
    const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
    const [showTemplateCreator, setShowTemplateCreator] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('ul4');
    const [newProgramName, setNewProgramName] = useState('');
    const [newProgramTier, setNewProgramTier] = useState<Tier>('free');
    const [newProgramPublished, setNewProgramPublished] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editTier, setEditTier] = useState<Tier>('free');
    const [editActive, setEditActive] = useState(false);
    const [editDescription, setEditDescription] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin) return;
        fetchPrograms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    async function fetchPrograms() {
        setLoading(true);
        setErrorText(null);
        try {
            const { data, error } = await supabase
                .from('programs')
                .select('id,name,description,is_active,created_at,updated_at,tier_required')
                .eq('program_type', 'coach')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPrograms(data ?? []);
        } catch (e: any) {
            setPrograms([]);
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load programs.');
        } finally {
            setLoading(false);
        }
    }

    async function toggleProgram(programId: string, nextIsActive: boolean) {
        setErrorText(null);
        setUpdatingIds(prev => ({ ...prev, [programId]: true }));
        try {
            const { error } = await supabase
                .from('programs')
                .update({ is_active: nextIsActive })
                .eq('id', programId);

            if (error) throw error;
            await fetchPrograms();
        } catch (e: any) {
            // Important: show the exact error so we can adjust RLS/policies if needed.
            setErrorText(typeof e?.message === 'string' ? e.message : 'Update failed.');
        } finally {
            setUpdatingIds(prev => ({ ...prev, [programId]: false }));
        }
    }

    function startEdit(p: any) {
        setErrorText(null);
        setEditingId(p.id);
        setEditName(String(p.name ?? ''));
        setEditTier((p.tier_required as Tier) || 'free');
        setEditActive(!!p.is_active);
        setEditDescription(typeof p.description === 'string' ? p.description : '');
    }

    function cancelEdit() {
        setEditingId(null);
        setEditName('');
        setEditTier('free');
        setEditActive(false);
        setEditDescription('');
    }

    async function saveEdit(programId: string) {
        const name = editName.trim();
        if (!name) {
            setErrorText('Program name is required.');
            return;
        }
        setSavingId(programId);
        setErrorText(null);
        try {
            const updates: any = {
                name,
                tier_required: editTier,
                is_active: editActive,
            };
            if (editDescription.trim().length > 0 || editDescription === '') {
                // description exists in schema; keep editable (can be blank).
                updates.description = editDescription;
            }

            const { error } = await supabase
                .from('programs')
                .update(updates)
                .eq('id', programId);

            if (error) throw error;
            await fetchPrograms();
            cancelEdit();
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Update failed.');
        } finally {
            setSavingId(null);
        }
    }

    async function deleteProgram(programId: string) {
        setDeletingId(programId);
        setErrorText(null);
        try {
            const { error } = await supabase
                .from('programs')
                .delete()
                .eq('id', programId);

            if (error) throw error;
            await fetchPrograms();
            if (editingId === programId) cancelEdit();
        } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : 'Delete failed.';
            setErrorText(`${msg}\n\nIf this program has linked weeks/days/exercises, delete may fail due to foreign key constraints. Consider unpublishing instead, or delete the structure first.`);
        } finally {
            setDeletingId(null);
        }
    }

    function confirmDelete(programId: string, programName: string) {
        const title = 'Delete Program';
        const message = `Delete "${programName}"? This cannot be undone.`;

        // Prefer native confirm dialog where available; otherwise fall back to "type DELETE" prompt.
        if (Platform.OS !== 'web') {
            showAlert(title, message, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteProgram(programId) },
            ]);
            return;
        }

        // eslint-disable-next-line no-alert
        const typed = globalThis.prompt?.(`${title}\n\n${message}\n\nType DELETE to confirm:`);
        if (typed === 'DELETE') {
            deleteProgram(programId);
        }
    }

    async function createFromTemplate() {
        const name = newProgramName.trim();
        if (!name) {
            setErrorText('Program name is required.');
            return;
        }

        const template = TEMPLATES.find(t => t.key === selectedTemplate);
        if (!template) {
            setErrorText('Template not found.');
            return;
        }

        setCreating(true);
        setErrorText(null);
        try {
            const { data: programRow, error: programError } = await supabase
                .from('programs')
                .insert({
                    name,
                    description: 'Created from a generic hypertrophy template. Edit structure as needed.',
                    duration_weeks: template.defaults.durationWeeks,
                    difficulty: template.defaults.difficulty,
                    tier_required: newProgramTier,
                    is_active: newProgramPublished,
                    created_by: profile?.id ?? null,
                    goals: ['Hypertrophy'],
                })
                .select('id')
                .single();

            if (programError) throw programError;
            const programId = programRow?.id as string | undefined;
            if (!programId) throw new Error('Failed to create program (missing id).');

            const { data: weekRow, error: weekError } = await supabase
                .from('program_weeks')
                .insert({
                    program_id: programId,
                    week_number: 1,
                    title: 'Week 1',
                })
                .select('id')
                .single();

            if (weekError) throw weekError;
            const weekId = weekRow?.id as string | undefined;
            if (!weekId) throw new Error('Failed to create program week (missing id).');

            const dayInserts = template.days.map((d, idx) => ({
                program_week_id: weekId,
                day_number: idx + 1,
                title: d.title,
            }));

            const { data: dayRows, error: dayError } = await supabase
                .from('program_days')
                .insert(dayInserts)
                .select('id,day_number');

            if (dayError) throw dayError;
            const createdDays = (dayRows || []) as { id: string; day_number: number }[];

            for (const createdDay of createdDays) {
                const dayTemplate = template.days[createdDay.day_number - 1];
                if (!dayTemplate) continue;
                const exInserts = dayTemplate.exercises.map((ex, i) => ({
                    program_day_id: createdDay.id,
                    order_index: i,
                    exercise_name: ex.name,
                    sets_target: ex.sets ?? null,
                    reps_target: ex.reps ?? null,
                    is_warmup: false,
                }));

                if (exInserts.length > 0) {
                    const { error: exError } = await supabase
                        .from('program_day_exercises')
                        .insert(exInserts);
                    if (exError) throw exError;
                }
            }

            setNewProgramName('');
            setNewProgramTier('free');
            setNewProgramPublished(false);
            setShowTemplateCreator(false);
            await fetchPrograms();

            router.push({ pathname: '/admin/program-structure', params: { programId } });
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to create program from template.');
        } finally {
            setCreating(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Admin',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/admin')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            {!isAdmin ? (
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.title}>Not authorized</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <Text style={styles.header}>Programs Admin</Text>
                        <View style={styles.topRowButtons}>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={() => setShowTemplateCreator(v => !v)}
                            >
                                <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
                                <Text style={styles.refreshText}>Create From Template</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.refreshButton} onPress={fetchPrograms}>
                                <Ionicons name="refresh" size={18} color={theme.colors.primary} />
                                <Text style={styles.refreshText}>Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showTemplateCreator && (
                        <View style={styles.creatorCard}>
                            <Text style={styles.creatorTitle}>Create Program From Template</Text>
                            <Text style={styles.creatorSubtitle}>
                                Generic hypertrophy templates (editable). Does not copy any proprietary programming.
                            </Text>

                            <Text style={styles.fieldLabel}>Template</Text>
                            <View style={styles.templateRow}>
                                {TEMPLATES.map(t => (
                                    <TouchableOpacity
                                        key={t.key}
                                        style={[styles.templatePill, selectedTemplate === t.key && styles.templatePillActive]}
                                        onPress={() => setSelectedTemplate(t.key)}
                                        disabled={creating}
                                    >
                                        <Text style={[styles.templatePillText, selectedTemplate === t.key && styles.templatePillTextActive]}>
                                            {t.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Program name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 8-Week Hypertrophy Builder"
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                value={newProgramName}
                                onChangeText={setNewProgramName}
                                editable={!creating}
                            />

                            <Text style={styles.fieldLabel}>Tier required</Text>
                            <View style={styles.tierRow}>
                                {(['free', 'standard', 'vip', 'elite'] as Tier[]).map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.tierPill, newProgramTier === t && styles.tierPillActive]}
                                        onPress={() => setNewProgramTier(t)}
                                        disabled={creating}
                                    >
                                        <Text style={[styles.tierPillText, newProgramTier === t && styles.tierPillTextActive]}>
                                            {t}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.publishRow}>
                                <View style={styles.publishLeft}>
                                    <Text style={styles.fieldLabel}>Published</Text>
                                    <Text style={styles.publishHint}>Controls user visibility (programs.is_active).</Text>
                                </View>
                                <Switch
                                    value={newProgramPublished}
                                    onValueChange={setNewProgramPublished}
                                    disabled={creating}
                                    trackColor={{ false: 'rgba(255,255,255,0.18)', true: 'rgba(0,187,255,0.5)' }}
                                    thumbColor={newProgramPublished ? theme.colors.primary : '#999'}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryButton, creating && styles.primaryButtonDisabled]}
                                onPress={createFromTemplate}
                                disabled={creating}
                            >
                                <Text style={styles.primaryButtonText}>{creating ? 'Creating...' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!!errorText && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>Error</Text>
                            <Text style={styles.errorBody}>{errorText}</Text>
                        </View>
                    )}

                    {loading ? (
                        <View style={styles.centerLoading}>
                            <ActivityIndicator color={theme.colors.primary} size="large" />
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.list}>
                            {programs.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <Ionicons name="list-outline" size={46} color="rgba(255,255,255,0.12)" />
                                    <Text style={styles.emptyTitle}>No programs found</Text>
                                    <Text style={styles.emptyBody}>Create or seed programs to manage publishing.</Text>
                                </View>
                            ) : (
                                programs.map((p) => {
                                    const isActive = !!p.is_active;
                                    const isUpdating = !!updatingIds[p.id];
                                    const isEditing = editingId === p.id;
                                    const isSaving = savingId === p.id;
                                    const isDeleting = deletingId === p.id;
                                    return (
                                        <View key={p.id} style={styles.programRow}>
                                            <View style={styles.programLeft}>
                                                {!isEditing ? (
                                                    <>
                                                        <Text style={styles.programName}>{p.name}</Text>
                                                        <Text style={styles.programMeta}>
                                                            {isActive ? 'Published' : 'Draft'}
                                                            {p.tier_required ? ` • ${String(p.tier_required)}` : ''}
                                                        </Text>
                                                        {!!p.description && (
                                                            <Text style={styles.programDesc} numberOfLines={2}>
                                                                {String(p.description)}
                                                            </Text>
                                                        )}
                                                    </>
                                                ) : (
                                                    <View style={styles.editBox}>
                                                        <Text style={styles.editTitle}>Edit Program</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            placeholder="Program name"
                                                            placeholderTextColor="rgba(255,255,255,0.35)"
                                                            value={editName}
                                                            onChangeText={setEditName}
                                                            editable={!isSaving && !isDeleting}
                                                        />
                                                        <Text style={styles.fieldLabel}>Tier required</Text>
                                                        <View style={styles.tierRow}>
                                                            {(['free', 'standard', 'vip', 'elite'] as Tier[]).map(t => (
                                                                <TouchableOpacity
                                                                    key={t}
                                                                    style={[styles.tierPill, editTier === t && styles.tierPillActive]}
                                                                    onPress={() => setEditTier(t)}
                                                                    disabled={isSaving || isDeleting}
                                                                >
                                                                    <Text style={[styles.tierPillText, editTier === t && styles.tierPillTextActive]}>
                                                                        {t}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                        <View style={styles.publishRow}>
                                                            <View style={styles.publishLeft}>
                                                                <Text style={styles.fieldLabel}>Published</Text>
                                                                <Text style={styles.publishHint}>Controls user visibility (programs.is_active).</Text>
                                                            </View>
                                                            <Switch
                                                                value={editActive}
                                                                onValueChange={setEditActive}
                                                                disabled={isSaving || isDeleting}
                                                                trackColor={{ false: 'rgba(255,255,255,0.18)', true: 'rgba(0,187,255,0.5)' }}
                                                                thumbColor={editActive ? theme.colors.primary : '#999'}
                                                            />
                                                        </View>
                                                        <Text style={styles.fieldLabel}>Description</Text>
                                                        <TextInput
                                                            style={[styles.input, styles.textArea]}
                                                            placeholder="Description"
                                                            placeholderTextColor="rgba(255,255,255,0.35)"
                                                            value={editDescription}
                                                            onChangeText={setEditDescription}
                                                            editable={!isSaving && !isDeleting}
                                                            multiline
                                                        />

                                                        <View style={styles.editActionsRow}>
                                                            <TouchableOpacity
                                                                style={[styles.editButton, styles.editButtonSecondary]}
                                                                onPress={cancelEdit}
                                                                disabled={isSaving || isDeleting}
                                                            >
                                                                <Text style={styles.editButtonSecondaryText}>Cancel</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={[styles.editButton, (isSaving || isDeleting) && styles.primaryButtonDisabled]}
                                                                onPress={() => saveEdit(p.id)}
                                                                disabled={isSaving || isDeleting}
                                                            >
                                                                <Text style={styles.editButtonPrimaryText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                )}
                                                <TouchableOpacity
                                                    style={styles.structureLink}
                                                    onPress={() => router.push({ pathname: '/admin/program-structure', params: { programId: p.id } })}
                                                    disabled={isSaving || isDeleting}
                                                >
                                                    <Text style={styles.structureLinkText}>Edit Structure</Text>
                                                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.programRight}>
                                                {!isEditing && (
                                                    <>
                                                        <Text style={[styles.statusPill, isActive ? styles.statusOn : styles.statusOff]}>
                                                            {isActive ? 'ON' : 'OFF'}
                                                        </Text>
                                                        <Switch
                                                            value={isActive}
                                                            onValueChange={(next) => toggleProgram(p.id, next)}
                                                            disabled={isUpdating || isDeleting}
                                                            trackColor={{ false: 'rgba(255,255,255,0.18)', true: 'rgba(0,187,255,0.5)' }}
                                                            thumbColor={isActive ? theme.colors.primary : '#999'}
                                                        />
                                                        <TouchableOpacity
                                                            style={styles.iconButton}
                                                            onPress={() => startEdit(p)}
                                                            disabled={isDeleting}
                                                        >
                                                            <Ionicons name="create-outline" size={18} color="#FFF" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[styles.iconButton, styles.iconButtonDanger]}
                                                            onPress={() => confirmDelete(p.id, String(p.name ?? 'Program'))}
                                                            disabled={isDeleting}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color="#FFF" />
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    title: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 6,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
        marginTop: 6,
    },
    primaryButtonText: {
        color: '#FFF',
        fontWeight: '800',
    },
    content: {
        flex: 1,
        paddingTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    topRowButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    header: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    refreshText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '800',
    },
    creatorCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.sm,
        gap: 10,
    },
    creatorTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
    },
    creatorSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    fieldLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '800',
    },
    templateRow: {
        gap: 8,
    },
    templatePill: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(0,0,0,0.12)',
    },
    templatePillActive: {
        backgroundColor: 'rgba(0,187,255,0.18)',
        borderColor: 'rgba(0,187,255,0.35)',
    },
    templatePillText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '800',
    },
    templatePillTextActive: {
        color: '#FFF',
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
    tierRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tierPill: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(0,0,0,0.12)',
    },
    tierPillActive: {
        backgroundColor: 'rgba(0,187,255,0.18)',
        borderColor: 'rgba(0,187,255,0.35)',
    },
    tierPillText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    tierPillTextActive: {
        color: '#FFF',
    },
    publishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
    },
    publishLeft: {
        flex: 1,
        minWidth: 0,
    },
    publishHint: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    primaryButtonDisabled: {
        opacity: 0.65,
    },
    centerLoading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 24,
    },
    list: {
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.sm,
    },
    programRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        minHeight: 56,
    },
    programLeft: {
        flex: 1,
        minWidth: 0,
    },
    programName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
    },
    programMeta: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    programDesc: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        lineHeight: 16,
        marginTop: 6,
        maxWidth: 520,
    },
    editBox: {
        marginTop: 6,
        gap: 10,
        backgroundColor: 'rgba(0,0,0,0.12)',
        borderRadius: theme.radius.md,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    editTitle: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top' as any,
    },
    editActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
    },
    editButton: {
        minHeight: 44,
        borderRadius: theme.radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButtonSecondary: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    editButtonSecondaryText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
    },
    editButtonPrimaryText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
    },
    structureLink: {
        marginTop: 10,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.12)',
        borderRadius: theme.radius.md,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    structureLinkText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '900',
        textDecorationLine: 'underline',
    },
    programRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
    },
    iconButtonDanger: {
        backgroundColor: 'rgba(255,107,107,0.15)',
        borderColor: 'rgba(255,107,107,0.25)',
    },
    statusPill: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    statusOn: {
        backgroundColor: 'rgba(0,187,255,0.25)',
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.35)',
    },
    statusOff: {
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    errorBox: {
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderColor: 'rgba(255,107,107,0.28)',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
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
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 26,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    emptyTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        marginTop: 10,
    },
    emptyBody: {
        color: theme.colors.textSecondary,
        marginTop: 6,
        textAlign: 'center',
        paddingHorizontal: 18,
    },
});
