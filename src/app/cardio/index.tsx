import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Modal,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { hasEntitlement } from '@/lib/entitlements';
import { showAlert } from '@/lib/confirm';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
    CardioProtocol,
    fetchProtocols,
    generateCardioRecommendations,
    logCardioSession,
    CardioGoal,
} from '@/services/cardio';

const INTENSITY_COLORS: Record<string, string> = {
    low: '#4CAF50',
    moderate: '#FF9800',
    high: '#F44336',
};

const INTENSITY_LABELS: Record<string, string> = {
    low: 'LOW',
    moderate: 'MOD',
    high: 'HIGH',
};

export default function CardioIndexScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();
    const { profile, tier } = useProfileStore();
    const [protocols, setProtocols] = useState<CardioProtocol[]>([]);
    const [recommended, setRecommended] = useState<CardioProtocol[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

    const [logModalVisible, setLogModalVisible] = useState(false);
    const [logTitle, setLogTitle] = useState('');
    const [logDuration, setLogDuration] = useState('');
    const [logDate, setLogDate] = useState(new Date());
    const [showLogDatePicker, setShowLogDatePicker] = useState(false);
    const [savingLog, setSavingLog] = useState(false);

    const canSeeRecommendations = hasEntitlement(tier, 'cardioRecommendationsEnabled');
    const userGoal: CardioGoal = profile?.fitness_goal || 'maintain';
    const userEquipment: string[] = profile?.equipment_access || [];

    useEffect(() => {
        loadProtocols();
    }, []);

    const loadProtocols = async () => {
        try {
            setLoading(true);
            const all = await fetchProtocols();
            setProtocols(all);

            if (canSeeRecommendations) {
                const { protocols: recs } = generateCardioRecommendations(
                    userGoal,
                    userEquipment,
                    all
                );
                setRecommended(recs.slice(0, 3));
            }
        } catch (e) {
            console.error('[Cardio] Error loading protocols:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (slug: string) => {
        setExpandedSlug(prev => (prev === slug ? null : slug));
    };

    function openLogModal(protocol?: CardioProtocol) {
        setLogTitle(protocol?.name || '');
        setLogDuration(protocol ? String(protocol.duration_minutes) : '');
        setLogDate(new Date());
        setLogModalVisible(true);
    }

    function handleLogDateChange(event: DateTimePickerEvent, selected?: Date) {
        if (Platform.OS === 'android') setShowLogDatePicker(false);
        if (selected) setLogDate(selected);
    }

    async function saveLoggedSession() {
        if (!user?.id) return;
        const minutes = Number(logDuration);
        if (!logTitle.trim()) {
            showAlert('Missing Info', 'Give this session a name (e.g. "Treadmill" or "TBM Incline Walk").');
            return;
        }
        if (!minutes || minutes <= 0) {
            showAlert('Missing Info', 'Enter how many minutes you did.');
            return;
        }
        setSavingLog(true);
        try {
            await logCardioSession(user.id, {
                title: logTitle.trim(),
                durationMinutes: minutes,
                completedAt: logDate,
            });
            setLogModalVisible(false);
            showAlert('Logged', `${logTitle.trim()} added to your history.`);
        } catch (e) {
            console.error('[Cardio] Failed to log session:', e);
            showAlert('Error', 'Failed to log this session. Please try again.');
        } finally {
            setSavingLog(false);
        }
    }

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
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cardio</Text>
                {canSeeRecommendations && (
                    <TouchableOpacity onPress={() => router.push('/cardio/plan')}>
                        <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                )}
                {!canSeeRecommendations && <View style={{ width: 24 }} />}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity style={styles.outdoorRunButton} onPress={() => router.push('/cardio/run')} activeOpacity={0.8}>
                    <Ionicons name="navigate-outline" size={20} color="#FFF" />
                    <Text style={styles.outdoorRunButtonText}>Start Outdoor Run</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logSessionButton} onPress={() => openLogModal()} activeOpacity={0.8}>
                    <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.logSessionButtonText}>Log a Cardio Session</Text>
                </TouchableOpacity>

                {/* VIP Recommended Section */}
                {canSeeRecommendations && recommended.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                            <Text style={styles.sectionTitle}>RECOMMENDED FOR YOU</Text>
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            Based on your {userGoal === 'lose' ? 'fat loss' : userGoal === 'gain' ? 'muscle gain' : 'maintenance'} goal
                        </Text>
                        {recommended.map(p => renderProtocolCard(p, true))}
                    </View>
                )}

                {/* Upgrade Prompt for Standard users */}
                {!canSeeRecommendations && (
                    <View style={styles.upgradeBox}>
                        <Ionicons name="sparkles" size={28} color={theme.colors.primary} />
                        <Text style={styles.upgradeTitle}>Smart Cardio Recommendations</Text>
                        <Text style={styles.upgradeText}>
                            Upgrade to VIP to get personalized cardio recommendations based on your goal and equipment.
                        </Text>
                        <TouchableOpacity
                            style={styles.upgradeBtn}
                            onPress={() => router.push('/subscribe')}
                        >
                            <Text style={styles.upgradeBtnText}>UPGRADE TO VIP</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Full Protocol Library */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ALL PROTOCOLS</Text>
                    {protocols.map(p => renderProtocolCard(p, false))}
                </View>
            </ScrollView>

            <Modal visible={logModalVisible} transparent animationType="fade" onRequestClose={() => setLogModalVisible(false)}>
                <View style={styles.logOverlay}>
                    <View style={styles.logSheet}>
                        <View style={styles.logHeaderRow}>
                            <Text style={styles.logHeaderTitle}>Log Cardio Session</Text>
                            <TouchableOpacity onPress={() => setLogModalVisible(false)}>
                                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.logFieldLabel}>What did you do?</Text>
                        <TextInput
                            style={styles.logInput}
                            placeholder="e.g. Treadmill, TBM Incline Walk"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={logTitle}
                            onChangeText={setLogTitle}
                        />

                        <Text style={styles.logFieldLabel}>Duration (minutes)</Text>
                        <TextInput
                            style={styles.logInput}
                            placeholder="30"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={logDuration}
                            onChangeText={setLogDuration}
                            keyboardType="number-pad"
                        />

                        <Text style={styles.logFieldLabel}>When</Text>
                        {Platform.OS === 'android' ? (
                            <TouchableOpacity style={styles.logInput} onPress={() => setShowLogDatePicker(true)}>
                                <Text style={{ color: theme.colors.text }}>
                                    {logDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <DateTimePicker
                                value={logDate}
                                mode="date"
                                display="compact"
                                maximumDate={new Date()}
                                themeVariant={theme.isDark ? 'dark' : 'light'}
                                onChange={handleLogDateChange}
                                style={{ alignSelf: 'flex-start', marginBottom: 8 }}
                            />
                        )}
                        {showLogDatePicker && Platform.OS === 'android' && (
                            <DateTimePicker
                                value={logDate}
                                mode="date"
                                display="default"
                                maximumDate={new Date()}
                                onChange={handleLogDateChange}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.logSaveButton, savingLog && { opacity: 0.6 }]}
                            onPress={saveLoggedSession}
                            disabled={savingLog}
                        >
                            {savingLog ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.logSaveButtonText}>Save to History</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );

    function renderProtocolCard(protocol: CardioProtocol, isRecommended: boolean) {
        const isExpanded = expandedSlug === protocol.slug;
        const intensityColor = INTENSITY_COLORS[protocol.intensity] || '#FFF';

        return (
            <TouchableOpacity
                key={protocol.slug + (isRecommended ? '-rec' : '')}
                style={[styles.protocolCard, protocol.is_signature && styles.signatureCard]}
                onPress={() => toggleExpand(protocol.slug)}
                activeOpacity={0.8}
            >
                {/* Signature Badge */}
                {protocol.is_signature && (
                    <View style={styles.signatureBadge}>
                        <Ionicons name="star" size={12} color="#000" />
                        <Text style={styles.signatureBadgeText}>SIGNATURE</Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.protocolName}>{protocol.name}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.intensityTag, { backgroundColor: intensityColor + '20', borderColor: intensityColor + '40' }]}>
                                <Text style={[styles.intensityText, { color: intensityColor }]}>
                                    {INTENSITY_LABELS[protocol.intensity]}
                                </Text>
                            </View>
                            <Text style={styles.durationText}>{protocol.duration_minutes} min</Text>
                            {protocol.equipment_required?.map(eq => (
                                <Text key={eq} style={styles.equipmentTag}>
                                    {eq === 'none' ? 'No Equipment' : eq.replace('_', ' ')}
                                </Text>
                            ))}
                        </View>
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                </View>

                <Text style={styles.protocolDesc}>{protocol.description}</Text>

                {/* Expanded Instructions */}
                {isExpanded && protocol.instructions && (
                    <View style={styles.instructionsBox}>
                        <Text style={styles.instructionsTitle}>HOW TO DO IT</Text>
                        {protocol.instructions.map((inst: any) => (
                            <View key={inst.step} style={styles.instructionRow}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>{inst.step}</Text>
                                </View>
                                <Text style={styles.instructionText}>{inst.instruction}</Text>
                            </View>
                        ))}
                        <TouchableOpacity
                            style={styles.logThisButton}
                            onPress={() => openLogModal(protocol)}
                        >
                            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} />
                            <Text style={styles.logThisButtonText}>Log This Session</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    }
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    sectionSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        marginBottom: 16,
        marginTop: -8,
    },
    protocolCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    signatureCard: {
        borderColor: 'rgba(212, 175, 55, 0.3)',
        backgroundColor: 'rgba(212, 175, 55, 0.06)',
    },
    signatureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFD700',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 12,
    },
    signatureBadgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    protocolName: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    intensityTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    intensityText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    durationText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    equipmentTag: {
        color: theme.colors.textTertiary,
        fontSize: 12,
        textTransform: 'capitalize',
    },
    protocolDesc: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    instructionsBox: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    instructionsTitle: {
        color: theme.colors.primary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 10,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumberText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '800',
    },
    instructionText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    upgradeBox: {
        backgroundColor: 'rgba(0, 187, 255, 0.05)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(0, 187, 255, 0.15)',
    },
    upgradeTitle: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 8,
    },
    upgradeText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    upgradeBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    upgradeBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    outdoorRunButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 12,
    },
    outdoorRunButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
    logSessionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primarySoft,
        borderWidth: 1,
        borderColor: theme.colors.primary + '40',
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 24,
    },
    logSessionButtonText: {
        color: theme.colors.primary,
        fontSize: 15,
        fontWeight: '800',
    },
    logThisButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: theme.colors.primarySoft,
    },
    logThisButtonText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '800',
    },
    logOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    logSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    logHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    logHeaderTitle: {
        color: theme.colors.text,
        fontSize: 17,
        fontWeight: '800',
    },
    logFieldLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 8,
        marginTop: 12,
    },
    logInput: {
        backgroundColor: theme.colors.surfaceElevated,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: theme.colors.text,
        fontSize: 15,
    },
    logSaveButton: {
        marginTop: 24,
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    logSaveButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
