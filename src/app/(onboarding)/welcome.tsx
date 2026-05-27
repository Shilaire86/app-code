import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
    const router = useRouter();
    const { colors, spacing, radius, typography, isDark } = useTheme();
    const styles = createStyles({ colors, spacing, radius, typography, isDark });

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
                <Text style={styles.eyebrow}>Welcome</Text>
                <Text style={styles.title}>You are{'\n'}already becoming.</Text>
                <Text style={styles.subtitle}>
                    This is your quiet start. We will set your path with a few guided steps.
                </Text>

                {/* Coach Audio Hint */}
                <TouchableOpacity style={styles.audioCard} activeOpacity={0.75}>
                    <View style={styles.audioIconWrap}>
                        <Ionicons name="headset-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.audioTextWrap}>
                        <Text style={styles.audioLabel}>Hear this</Text>
                        <Text style={styles.audioSubtext}>A message from your coach</Text>
                    </View>
                    <View style={styles.playBtn}>
                        <Ionicons name="play" size={14} color={colors.primary} />
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
