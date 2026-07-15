import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import {
    fetchTemplates,
    generateProgram,
    countActiveGuidedPrograms,
    ProgramTemplate,
    GeneratorPreferences,
    suggestTemplate
} from '@/services/programGenerator';
import { isVip } from '@/lib/entitlements';
import { ENTITLEMENTS } from '@/lib/entitlements';

const DURATION_OPTIONS = [4, 6, 8, 12];
const GOAL_OPTIONS: { key: 'strength' | 'hypertrophy' | 'general'; label: string; icon: string; desc: string }[] = [
    { key: 'strength', label: 'Strength', icon: 'barbell', desc: 'Heavy loads, lower reps, longer rest' },
    { key: 'hypertrophy', label: 'Hypertrophy', icon: 'body', desc: 'Moderate loads, higher volume for growth' },
    { key: 'general', label: 'General Fitness', icon: 'fitness', desc: 'Balanced approach for overall health' },
];

type WizardStep = 'template' | 'goal' | 'duration' | 'generating' | 'done';

export default function CreateProgramScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { profile, tier } = useProfileStore();

    const [step, setStep] = useState<WizardStep>('template');
    const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<'strength' | 'hypertrophy' | 'general'>('hypertrophy');
    const [selectedDuration, setSelectedDuration] = useState(4);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProgramId, setGeneratedProgramId] = useState<string | null>(null);
    const [recommendedId, setRecommendedId] = useState<string | null>(null);
    const [recommendationRationale, setRecommendationRationale] = useState<string | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await fetchTemplates();
            setTemplates(data);
            
            // Run recommendation engine for VIP/Elite users
            if (isVip(tier || 'free')) {
                const rec = suggestTemplate(data, profile);
                if (rec.recommendedTemplateId) {
                    setRecommendedId(rec.recommendedTemplateId);
                    setRecommendationRationale(rec.rationale);
                }
            }
        } catch (err) {
            console.error('[CreateProgram] Failed to load templates', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!user?.id || !selectedTemplate) return;

        // Check active program limit
        const entitlements = ENTITLEMENTS[tier || 'free'];
        const maxActive = entitlements.maxActiveGuidedPrograms;
        const currentActive = await countActiveGuidedPrograms(user.id);

        if (currentActive >= maxActive) {
            showAlert(
                'Program Limit Reached',
                `You can have up to ${maxActive} active guided programs. Delete one to create a new one.`,
            );
            return;
        }

        setStep('generating');
        setIsGenerating(true);

        try {
            const prefs: GeneratorPreferences = {
                templateId: selectedTemplate.id,
                durationWeeks: selectedDuration,
                goal: selectedGoal,
                equipmentAccess: profile?.equipment_access || [],
            };

            const programId = await generateProgram(user.id, prefs);
            setGeneratedProgramId(programId);
            setStep('done');
        } catch (err) {
            console.error('[CreateProgram] Generation failed', err);
            showAlert('Error', 'Failed to generate program. Please try again.');
            setStep('duration');
        } finally {
            setIsGenerating(false);
        }
    };

    const renderTemplateStep = () => (
        <>
            <Text style={styles.stepTitle}>Choose Your Split</Text>
            <Text style={styles.stepSub}>Pick a training structure that fits your schedule.</Text>
            <View style={styles.optionList}>
                {templates.map((t) => (
                    <TouchableOpacity
                        key={t.id}
                        style={[styles.optionCard, selectedTemplate?.id === t.id && styles.selectedCard]}
                        onPress={() => setSelectedTemplate(t)}
                    >
                        <View style={styles.optionHeader}>
                            <Text style={styles.optionTitle}>{t.name}</Text>
                            <View style={styles.daysBadge}>
                                <Text style={styles.daysBadgeText}>{t.days_per_week} days/wk</Text>
                            </View>
                        </View>
                        {recommendedId === t.id && (
                            <View style={styles.recommendationBadge}>
                                <Ionicons name="sparkles" size={14} color="#000" style={{ marginRight: 6 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.recommendedTitle}>RECOMMENDED FOR YOU</Text>
                                    <Text style={styles.recommendedReason}>{recommendationRationale}</Text>
                                </View>
                            </View>
                        )}
                        <Text style={styles.optionDesc}>{t.description}</Text>
                        <View style={styles.slotPreview}>
                            {t.day_slots.slice(0, 4).map((slot: any, idx: number) => (
                                <View key={idx} style={styles.slotChip}>
                                    <Text style={styles.slotText}>{slot.focus}</Text>
                                </View>
                            ))}
                            {t.day_slots.length > 4 && (
                                <View style={styles.slotChip}>
                                    <Text style={styles.slotText}>+{t.day_slots.length - 4}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.nextButton, !selectedTemplate && styles.disabledButton]}
                disabled={!selectedTemplate}
                onPress={() => setStep('goal')}
            >
                <Text style={styles.nextButtonText}>NEXT: CHOOSE GOAL</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>
        </>
    );

    const renderGoalStep = () => (
        <>
            <Text style={styles.stepTitle}>Training Goal</Text>
            <Text style={styles.stepSub}>This shapes your sets, reps, and rest periods.</Text>
            <View style={styles.optionList}>
                {GOAL_OPTIONS.map((g) => (
                    <TouchableOpacity
                        key={g.key}
                        style={[styles.goalCard, selectedGoal === g.key && styles.selectedCard]}
                        onPress={() => setSelectedGoal(g.key)}
                    >
                        <View style={styles.goalIcon}>
                            <Ionicons name={g.icon as any} size={24} color={selectedGoal === g.key ? theme.colors.primary : '#FFF'} />
                        </View>
                        <View style={styles.goalContent}>
                            <Text style={styles.goalTitle}>{g.label}</Text>
                            <Text style={styles.goalDesc}>{g.desc}</Text>
                        </View>
                        {selectedGoal === g.key && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.navRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('template')}>
                    <Ionicons name="arrow-back" size={18} color="#FFF" />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={() => setStep('duration')}>
                    <Text style={styles.nextButtonText}>NEXT: DURATION</Text>
                    <Ionicons name="arrow-forward" size={18} color="#000" />
                </TouchableOpacity>
            </View>
        </>
    );

    const renderDurationStep = () => (
        <>
            <Text style={styles.stepTitle}>Program Length</Text>
            <Text style={styles.stepSub}>How many weeks should this program run?</Text>
            <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((d) => (
                    <TouchableOpacity
                        key={d}
                        style={[styles.durationCard, selectedDuration === d && styles.selectedCard]}
                        onPress={() => setSelectedDuration(d)}
                    >
                        <Text style={styles.durationNum}>{d}</Text>
                        <Text style={styles.durationLabel}>weeks</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Your Program</Text>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Split</Text>
                    <Text style={styles.summaryVal}>{selectedTemplate?.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Goal</Text>
                    <Text style={styles.summaryVal}>{selectedGoal.charAt(0).toUpperCase() + selectedGoal.slice(1)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryVal}>{selectedDuration} Weeks</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Days/Week</Text>
                    <Text style={styles.summaryVal}>{selectedTemplate?.days_per_week}</Text>
                </View>
            </View>

            <View style={styles.navRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep('goal')}>
                    <Ionicons name="arrow-back" size={18} color="#FFF" />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
                    <Ionicons name="sparkles" size={18} color="#000" />
                    <Text style={styles.generateButtonText}>GENERATE PROGRAM</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderGeneratingStep = () => (
        <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.generatingTitle}>Building Your Program...</Text>
            <Text style={styles.generatingSub}>
                Selecting exercises, balancing muscle groups, and building {selectedDuration} weeks of training.
            </Text>
        </View>
    );

    const renderDoneStep = () => (
        <View style={styles.doneContainer}>
            <View style={styles.doneIcon}>
                <Ionicons name="checkmark-circle" size={64} color={theme.colors.primary} />
            </View>
            <Text style={styles.doneTitle}>Program Created!</Text>
            <Text style={styles.doneSub}>
                Your {selectedTemplate?.name} program is ready. {selectedDuration} weeks of {selectedGoal}-focused training.
            </Text>
            <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                    if (generatedProgramId) {
                        router.replace({
                            pathname: '/(tabs)/programs/[id]',
                            params: { id: generatedProgramId },
                        });
                    }
                }}
            >
                <Text style={styles.viewButtonText}>VIEW PROGRAM</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(tabs)/programs')}>
                <Text style={styles.homeButtonText}>Back to Programs</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Stack.Screen options={{ title: 'Create Program', headerShown: true, headerTransparent: true, headerTitleStyle: { color: '#FFF' }, headerTintColor: '#FFF' }} />
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: step === 'done' ? 'Success!' : 'Create Program',
                    headerShown: true,
                    headerTransparent: true,
                    headerTitleStyle: { color: '#FFF' },
                    headerTintColor: '#FFF',
                }}
            />

            {/* Progress bar */}
            {step !== 'generating' && step !== 'done' && (
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, {
                        width: step === 'template' ? '33%' : step === 'goal' ? '66%' : '100%'
                    }]} />
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {step === 'template' && renderTemplateStep()}
                {step === 'goal' && renderGoalStep()}
                {step === 'duration' && renderDurationStep()}
                {step === 'generating' && renderGeneratingStep()}
                {step === 'done' && renderDoneStep()}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingTop: 110,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 60,
    },
    progressBar: {
        position: 'absolute',
        top: 100,
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        zIndex: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    stepTitle: {
        color: '#FFF',
        fontSize: 26,
        fontWeight: '900',
        marginTop: 16,
    },
    stepSub: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 6,
        marginBottom: 24,
    },
    optionList: {
        gap: 16,
    },
    optionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    selectedCard: {
        borderColor: theme.colors.primary,
        backgroundColor: 'rgba(0,187,255,0.08)',
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    optionTitle: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
    daysBadge: {
        backgroundColor: 'rgba(0,187,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    daysBadgeText: {
        color: theme.colors.primary,
        fontSize: 11,
        fontWeight: '700',
    },
    optionDesc: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
    },
    recommendationBadge: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    recommendedTitle: {
        color: '#000',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    recommendedReason: {
        color: 'rgba(0,0,0,0.7)',
        fontSize: 11,
        fontWeight: '600',
    },
    slotPreview: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    slotChip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    slotText: {
        color: theme.colors.textTertiary,
        fontSize: 10,
        fontWeight: '600',
    },
    goalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    goalIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    goalContent: {
        flex: 1,
    },
    goalTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    goalDesc: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    durationGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    durationCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        paddingVertical: 20,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    durationNum: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
    },
    durationLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    summaryCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    summaryTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    summaryLabel: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    summaryVal: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    navRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    nextButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 24,
    },
    disabledButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    nextButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 20,
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    backButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    generateButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    generateButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    generatingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    generatingTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '800',
        marginTop: 24,
    },
    generatingSub: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 10,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    doneContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    doneIcon: {
        marginBottom: 16,
    },
    doneTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: '900',
    },
    doneSub: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    viewButton: {
        backgroundColor: theme.colors.primary,
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
        marginTop: 32,
    },
    viewButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    homeButton: {
        marginTop: 16,
        padding: 12,
    },
    homeButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
});
