import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity } from 'react-native';
import { useProfileStore, BecomingStage } from '@/stores/profileStore';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const STAGE_CONTENT: Record<BecomingStage, { title: string; copy: string; icon: any; color: string }> = {
    initiate: {
        title: 'The Journey Begins',
        copy: 'You have taken the first step. The path unfolds before you.',
        icon: 'footsteps',
        color: theme.colors.textSecondary,
    },
    practitioner: {
        title: 'A New Rhythm',
        copy: 'You are building the foundation. The practice is becoming part of who you are.',
        icon: 'flame',
        color: '#FF8800',
    },
    devoted: {
        title: 'Unwavering Focus',
        copy: 'Discipline has transformed into devotion. You are carving a new reality.',
        icon: 'star',
        color: '#FF3366',
    },
    embodied: {
        title: 'True Mastery',
        copy: 'You don\'t just do the work; you are the work. The transformation is embodied.',
        icon: 'diamond',
        color: '#aa00ff',
    }
};

export function LevelUpModal() {
    const { justLeveledUp, levelUpDetails, clearLevelUp } = useProfileStore();

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (justLeveledUp && levelUpDetails) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
        }
    }, [justLeveledUp, levelUpDetails]);

    if (!justLeveledUp || !levelUpDetails) return null;

    const currentStage = levelUpDetails.current;
    const content = STAGE_CONTENT[currentStage] || STAGE_CONTENT.initiate;

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            clearLevelUp();
        });
    };

    return (
        <Modal transparent visible={justLeveledUp} animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.badgeContainer}>
                        <View style={[styles.halo, { borderColor: content.color }]} />
                        <View style={[styles.iconBox, { backgroundColor: content.color }]}>
                            <Ionicons name={content.icon} size={48} color="#FFF" />
                        </View>
                    </View>

                    <Text style={styles.levelUpText}>LEVEL UP</Text>
                    <Text style={styles.titleText}>{content.title}</Text>

                    <View style={[styles.stagePill, { backgroundColor: content.color + '20', borderColor: content.color }]}>
                        <Text style={[styles.stagePillText, { color: content.color }]}>
                            {currentStage.toUpperCase()}
                        </Text>
                    </View>

                    <Text style={styles.copyText}>{content.copy}</Text>

                    <TouchableOpacity style={styles.button} onPress={handleClose}>
                        <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    modalContainer: {
        backgroundColor: theme.colors.surface,
        width: '100%',
        maxWidth: 400,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    badgeContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    halo: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        opacity: 0.3,
        transform: [{ scale: 1.1 }],
    },
    iconBox: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    levelUpText: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.primary,
        letterSpacing: 2,
        marginBottom: theme.spacing.xs,
    },
    titleText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    stagePill: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.xs,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: theme.spacing.lg,
    },
    stagePillText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    copyText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.xl,
    },
    button: {
        backgroundColor: theme.colors.primary,
        width: '100%',
        paddingVertical: 16,
        borderRadius: theme.radius.lg,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
