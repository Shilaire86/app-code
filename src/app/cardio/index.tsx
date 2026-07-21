import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { hasEntitlement } from '@/lib/entitlements';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import {
    CardioProtocol,
    fetchProtocols,
    generateCardioRecommendations,
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
    const { profile, tier } = useProfileStore();
    const [protocols, setProtocols] = useState<CardioProtocol[]>([]);
    const [recommended, setRecommended] = useState<CardioProtocol[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

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
                    </View>
                )}
            </TouchableOpacity>
        );
    }
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
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
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
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
        color: 'rgba(255,255,255,0.5)',
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
        color: '#FFF',
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
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        textTransform: 'capitalize',
    },
    protocolDesc: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        lineHeight: 20,
    },
    instructionsBox: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
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
        backgroundColor: 'rgba(255,255,255,0.08)',
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
        color: 'rgba(255,255,255,0.7)',
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
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 8,
    },
    upgradeText: {
        color: 'rgba(255,255,255,0.6)',
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
});
