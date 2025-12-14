import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import axiosInstance from '../api/axios';
import { CustomDialog, useDialog } from '../components/CustomDialog';
import { Todo, TodoStats } from '../types';

// Priority colors
const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  general: 'layers',
  music: 'music',
  backend: 'server',
  frontend: 'monitor',
  bug: 'alert-circle',
  feature: 'star',
};

export const TodoScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors } = useThemeStore();
  const { dialogState, hideDialog, showSuccess, showError, showConfirm } = useDialog();
  
  // State
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState<Todo['category']>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch todos
  const fetchTodos = async () => {
    try {
      const params: any = {};
      if (filter === 'completed') params.completed = 'true';
      if (filter === 'pending') params.completed = 'false';
      if (priorityFilter) params.priority = priorityFilter;
      
      const response = await axiosInstance.get('/todos', { params });
      setTodos(response.data.todos || []);
    } catch (error: any) {
      console.error('Error fetching todos:', error?.response?.data || error.message);
      // Don't show error dialog on initial load - just log it
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/todos/stats');
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching todo stats:', error?.response?.data || error.message);
    }
  };

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchTodos(), fetchStats()]);
    setIsLoading(false);
  };

  // Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTodos(), fetchStats()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchTodos();
    }
  }, [filter, priorityFilter]);

  // Toggle completion
  const handleToggleComplete = async (todo: Todo) => {
    try {
      await axiosInstance.patch(`/todos/${todo._id}/toggle`);
      await Promise.all([fetchTodos(), fetchStats()]);
    } catch (error: any) {
      showError('Error', 'Failed to update todo');
    }
  };

  // Delete todo
  const handleDelete = (todo: Todo) => {
    showConfirm(
      'Delete Todo',
      `Are you sure you want to delete "${todo.title}"?`,
      async () => {
        try {
          await axiosInstance.delete(`/todos/${todo._id}`);
          await Promise.all([fetchTodos(), fetchStats()]);
          showSuccess('Deleted', 'Todo deleted successfully');
        } catch (error: any) {
          showError('Error', 'Failed to delete todo');
        }
      },
      'Delete',
      true
    );
  };

  // Open modal for new/edit
  const openModal = (todo?: Todo) => {
    if (todo) {
      setEditingTodo(todo);
      setTitle(todo.title);
      setDescription(todo.description || '');
      setPriority(todo.priority);
      setCategory(todo.category);
    } else {
      setEditingTodo(null);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('general');
    }
    setIsModalOpen(true);
  };

  // Save todo
  const handleSave = async () => {
    if (!title.trim()) {
      showError('Error', 'Title is required');
      return;
    }

    setIsSaving(true);
    try {
      const data = { title: title.trim(), description: description.trim(), priority, category };
      
      if (editingTodo) {
        await axiosInstance.put(`/todos/${editingTodo._id}`, data);
        showSuccess('Updated', 'Todo updated successfully');
      } else {
        await axiosInstance.post('/todos', data);
        showSuccess('Created', 'Todo created successfully');
      }
      
      setIsModalOpen(false);
      await Promise.all([fetchTodos(), fetchStats()]);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to save todo');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to get creator name
  const getCreatorName = (createdBy: Todo['createdBy']) => {
    if (typeof createdBy === 'string') {
      return 'Unknown';
    }
    return createdBy.fullName || createdBy.email || 'Unknown';
  };

  // Render todo item
  const renderTodoItem = ({ item }: { item: Todo }) => (
    <View style={[styles.todoItem, item.completed && styles.todoItemCompleted]}>
      <TouchableOpacity 
        style={styles.todoCheckbox}
        onPress={() => handleToggleComplete(item)}
      >
        <View style={[
          styles.checkbox, 
          item.completed && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
        ]}>
          {item.completed && <Icon name="check" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.todoContent} onPress={() => openModal(item)}>
        <View style={styles.todoHeader}>
          <Text 
            style={[styles.todoTitle, item.completed && styles.todoTitleCompleted]} 
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.todoDescription} numberOfLines={2}>{item.description}</Text>
        )}
        
        <View style={styles.todoMeta}>
          <View style={styles.categoryTag}>
            <Icon name={CATEGORY_ICONS[item.category] || 'tag'} size={12} color={COLORS.textMuted} />
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.todoDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        {/* Creator Info */}
        <View style={styles.creatorInfo}>
          <Icon name="user" size={11} color={themeColors.primary} />
          <Text style={[styles.creatorText, { color: themeColors.primary }]}>
            {getCreatorName(item.createdBy)}
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
      >
        <Icon name="trash-2" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Todo List</Text>
        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
          <Icon name="plus" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <>
          {/* Stats Section */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: themeColors.primaryMuted }]}>
                <Text style={[styles.statNumber, { color: themeColors.primary }]}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Done</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.highPriority}</Text>
                <Text style={styles.statLabel}>Urgent</Text>
              </View>
            </View>
          )}

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            {(['all', 'pending', 'completed'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && { backgroundColor: themeColors.primary }]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Todo List */}
          <FlatList
            data={todos}
            keyExtractor={(item) => item._id}
            renderItem={renderTodoItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={themeColors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="check-square" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No todos found</Text>
                <TouchableOpacity 
                  style={[styles.emptyButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => openModal()}
                >
                  <Icon name="plus" size={18} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add Todo</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal
          visible={true}
          animationType="slide"
          transparent
          onRequestClose={() => setIsModalOpen(false)}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTodo ? 'Edit Todo' : 'New Todo'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Icon name="x" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter todo title"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter description (optional)"
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={1000}
              />

              {/* Priority */}
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.optionRow}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.optionButton,
                      priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.optionText, priority === p && styles.optionTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {(['general', 'music', 'backend', 'frontend', 'bug', 'feature'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.categoryButton,
                      category === c && { backgroundColor: themeColors.primaryMuted, borderColor: themeColors.primary }
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Icon 
                      name={CATEGORY_ICONS[c]} 
                      size={16} 
                      color={category === c ? themeColors.primary : COLORS.textMuted} 
                    />
                    <Text style={[
                      styles.categoryButtonText, 
                      category === c && { color: themeColors.primary }
                    ]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingTodo ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

      {/* Dialog */}
      <CustomDialog
        visible={dialogState.visible}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        buttons={dialogState.buttons}
        onClose={hideDialog}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.zinc800,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addButton: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.zinc800,
    alignItems: 'center',
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.zinc800,
  },
  todoItemCompleted: {
    opacity: 0.7,
  },
  todoCheckbox: {
    paddingTop: 2,
    paddingRight: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.zinc600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoContent: {
    flex: 1,
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  todoTitle: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  todoDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  todoDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textDim,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  creatorText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  deleteButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  emptyButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.zinc900,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '85%',
    minHeight: 300,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.zinc800,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
    alignItems: 'center',
  },
  optionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  optionTextActive: {
    color: '#fff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.zinc700,
    gap: SPACING.xs,
  },
  categoryButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.zinc800,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.zinc800,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TodoScreen;
