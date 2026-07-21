import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { searchExercises, fetchTopExercises, ExerciseMatch } from '@/services/exercises';
import { useProfileStore } from '@/stores/profileStore';

interface ExercisePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (exercise: ExerciseMatch) => void;
}

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
    const theme = useTheme();
    const styles = createStyles(theme);
    const [search, setSearch] = useState('');
    const [exercises, setExercises] = useState<ExerciseMatch[]>([]);
    const [loading, setLoading] = useState(false);
    const { profile } = useProfileStore();

    const equipmentAccess = profile?.equipment_access || [];

    useEffect(() => {
        if (!visible) return;

        const loadInitial = async () => {
            setLoading(true);
            try {
                const results = await fetchTopExercises(30, equipmentAccess);
                setExercises(results);
            } catch (err) {
                console.error('[ExercisePicker] Load failed', err);
            } finally {
                setLoading(false);
            }
        };

        if (search.length === 0) {
            loadInitial();
        } else {
            const timer = setTimeout(async () => {
                setLoading(true);
                try {
                    const results = await searchExercises(search, equipmentAccess);
                    setExercises(results);
                } catch (err) {
                    console.error('[ExercisePicker] Search failed', err);
                } finally {
                    setLoading(false);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [search, visible, equipmentAccess]);

    const renderItem = ({ item }: { item: ExerciseMatch }) => (
        <TouchableOpacity 
            style={styles.exerciseRow} 
            onPress={() => {
                onSelect(item);
                onClose();
            }}
        >
            <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseSub}>
                    {item.muscle_groups.join(', ')} • {item.equipment.join(', ')}
                </Text>
            </View>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.modalContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Exercise</Text>
                    <View style={{ width: 28 }} />
                </View>

                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search exercises..."
                        placeholderTextColor={theme.colors.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                        autoFocus
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>

                {loading && exercises.length === 0 ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color={theme.colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={exercises}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No exercises found matching your search and equipment.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 60,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
        height: 48,
        borderRadius: 12,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    input: {
        flex: 1,
        color: '#FFF',
        marginLeft: theme.spacing.sm,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 40,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    exerciseSub: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
        textTransform: 'capitalize',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
