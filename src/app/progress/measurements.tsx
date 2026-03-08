import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function MeasurementLogScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [weight, setWeight] = useState('');
    const [bodyFat, setBodyFat] = useState('');
    const [waist, setWaist] = useState('');
    const [chest, setChest] = useState('');
    const [hips, setHips] = useState('');
    const [arms, setArms] = useState('');
    const [thighs, setThighs] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit() {
        if (!weight) {
            Alert.alert("Required", "Please enter your weight at minimum.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('progress_entries')
                .insert({
                    user_id: user?.id,
                    weight_lbs: parseFloat(weight),
                    body_fat_percent: bodyFat ? parseFloat(bodyFat) : null,
                    waist_inches: waist ? parseFloat(waist) : null,
                    chest_inches: chest ? parseFloat(chest) : null,
                    hips_inches: hips ? parseFloat(hips) : null,
                    arms_inches: arms ? parseFloat(arms) : null,
                    thighs_inches: thighs ? parseFloat(thighs) : null,
                    entry_date: new Date().toISOString().split('T')[0],
                });

            if (error) throw error;

            // Refresh profile to ensure data consistency (points/stats)
            if (user) {
                useProfileStore.getState().fetchProfile(user.id);
            }

            Alert.alert("Recorded", "Your measurements have been updated. Your evolution is being tracked.");
            router.back();
        } catch (error) {
            console.error('Error saving measurements:', error);
            Alert.alert('Error', 'Failed to save measurements');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Body Metrics',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoBox}>
                    <Ionicons name="stats-chart" size={24} color={theme.colors.primary} />
                    <Text style={styles.infoTitle}>Track your transformation</Text>
                    <Text style={styles.infoText}>The scale is just one data point. Your consistency is the real win.</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current Weight (lbs)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="0.0"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={weight}
                            onChangeText={setWeight}
                        />
                        <Text style={styles.unitText}>LBS</Text>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Body Fat % (Optional)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="0.0"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={bodyFat}
                            onChangeText={setBodyFat}
                        />
                        <Text style={styles.unitText}>%</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Body Measurements (Optional)</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Chest (Inches)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="0.0"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={chest}
                            onChangeText={setChest}
                        />
                        <Text style={styles.unitText}>IN</Text>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Waist (Inches)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="0.0"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={waist}
                            onChangeText={setWaist}
                        />
                        <Text style={styles.unitText}>IN</Text>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Hips (Inches)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="0.0"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={hips}
                            onChangeText={setHips}
                        />
                        <Text style={styles.unitText}>IN</Text>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Arms (Inches)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="0.0"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={arms}
                            onChangeText={setArms}
                        />
                        <Text style={styles.unitText}>IN</Text>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Thighs (Inches)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="0.0"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            value={thighs}
                            onChangeText={setThighs}
                        />
                        <Text style={styles.unitText}>IN</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, (!weight || isSubmitting) && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={!weight || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>Save Metrics</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.lg,
    },
    infoBox: {
        backgroundColor: 'rgba(255,102,0,0.05)',
        padding: theme.spacing.xl,
        borderRadius: theme.radius.xl,
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
        borderWidth: 1,
        borderColor: 'rgba(255,102,0,0.1)',
    },
    infoTitle: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginTop: theme.spacing.md,
    },
    infoText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: theme.spacing.xl,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.md,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    input: {
        flex: 1,
        height: 56,
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    unitText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '800',
        marginLeft: theme.spacing.md,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    disabledButton: {
        opacity: 0.5,
    },
    submitText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
