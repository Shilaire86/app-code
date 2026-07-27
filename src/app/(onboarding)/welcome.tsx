import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { supabase } from '@/lib/supabase';

// Fixed path in the public 'coach_audio' Storage bucket (migration 074).
// Re-recording means uploading a new file to this same path in the Supabase
// dashboard, THEN bumping COACH_AUDIO_VERSION below — the CDN in front of
// Storage caches the object by URL and does not reliably purge on overwrite,
// so without a version bump listeners can keep getting the stale file for a
// while. Only the playback mechanism itself required an app rebuild.
const COACH_AUDIO_VERSION = '2';
const { data: coachAudioUrl } = supabase.storage.from('coach_audio').getPublicUrl('welcome.m4a');
const coachAudioUri = `${coachAudioUrl.publicUrl}?v=${COACH_AUDIO_VERSION}`;

export default function WelcomeScreen() {
    const router = useRouter();
    const { colors, spacing, radius, typography, isDark } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography, isDark });
    const { profile } = useProfileStore();
    const isFounder = ['active', 'graduated'].includes(profile?.founder_status);

    const player = useAudioPlayer(coachAudioUri);
    const playerStatus = useAudioPlayerStatus(player);

    const handleAudioPress = () => {
        if (playerStatus.playing) {
            player.pause();
        } else {
            if (playerStatus.didJustFinish) player.seekTo(0);
            player.play();
        }
    };

    return (
        <View style={styles.container}>
            {/* Top spacer with subtle brand mark */}
            <View style={styles.top}>
                <View style={styles.brandMark}>
                    <View style={styles.brandDot} />
                    <Text style={styles.brandLabel}>The Becoming Method</Text>
                </View>
            </View>

            {/* Main content */}
            <View style={styles.content}>
                {isFounder ? (
                    <>
                        {/* PLACEHOLDER COPY — replace with real voice before shipping */}
                        <Text style={styles.eyebrow}>Founding Member{profile?.founder_number ? ` No. ${profile.founder_number}` : ''}</Text>
                        <Text style={styles.title}>You're helping{'\n'}build this.</Text>
                        <Text style={styles.subtitle}>
                            You're one of a small group shaping The Becoming Method before anyone else sees it. What you notice and say back to us becomes the app. Thank you for being early.
                        </Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.eyebrow}>Welcome</Text>
                        <Text style={styles.title}>You are{'\n'}already becoming.</Text>
                        <Text style={styles.subtitle}>
                            This is your quiet start. We will set your path with a few guided steps.
                        </Text>
                    </>
                )}

                {/* Coach Audio Hint */}
                <TouchableOpacity style={styles.audioCard} activeOpacity={0.75} onPress={handleAudioPress}>
                    <View style={styles.audioIconWrap}>
                        <Ionicons name="headset-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.audioTextWrap}>
                        <Text style={styles.audioLabel}>Hear this</Text>
                        <Text style={styles.audioSubtext}>A message from your coach</Text>
                    </View>
                    <View style={styles.playBtn}>
                        <Ionicons name={playerStatus.playing ? 'pause' : 'play'} size={14} color={colors.primary} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* CTA */}
            <View style={styles.footer}>
                <Button
                    title="Begin Your Journey"
                    onPress={() => router.push('/(onboarding)/identity')}
                />
                <Text style={styles.footerNote}>
                    No hype. No noise. Just you and the work.
                </Text>
            </View>
        </View>
    );
}

const createStyles = ({ colors, spacing, radius, typography, isDark }: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xxl,
            paddingBottom: spacing.xl,
            justifyContent: 'space-between',
        },
        top: {
            alignItems: 'flex-start',
        },
        brandMark: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        brandDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary,
        },
        brandLabel: {
            ...typography.label,
            color: colors.textTertiary,
        },
        content: {
            flex: 1,
            justifyContent: 'center',
            paddingBottom: spacing.xxl,
        },
        eyebrow: {
            ...typography.label,
            color: colors.primary,
            marginBottom: spacing.sm,
        },
        title: {
            ...typography.display,
            color: colors.text,
            marginBottom: spacing.md,
            lineHeight: 46,
        },
        subtitle: {
            ...typography.body,
            color: colors.textSecondary,
            lineHeight: 28,
            marginBottom: spacing.xl,
            maxWidth: 320,
        },
        // Coach audio player card
        audioCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: colors.borderMid,
            gap: spacing.sm,
            alignSelf: 'flex-start',
        },
        audioIconWrap: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primarySoft,
            justifyContent: 'center',
            alignItems: 'center',
        },
        audioTextWrap: {
            gap: 2,
        },
        audioLabel: {
            ...typography.bodySmallMedium,
            color: colors.text,
        },
        audioSubtext: {
            ...typography.caption,
            color: colors.textTertiary,
        },
        playBtn: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primarySoft,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: spacing.xs,
        },
        footer: {
            gap: spacing.md,
            alignItems: 'center',
        },
        footerNote: {
            ...typography.caption,
            color: colors.textTertiary,
            textAlign: 'center',
            letterSpacing: 0.2,
        },
    });
