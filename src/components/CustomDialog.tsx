import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';

const { width } = Dimensions.get('window');

interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: DialogButton[];
  onClose: () => void;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons,
  onClose,
}) => {
  const { colors: themeColors } = useThemeStore();

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'check-circle', color: '#22c55e' };
      case 'error':
        return { name: 'x-circle', color: '#ef4444' };
      case 'warning':
        return { name: 'alert-triangle', color: '#f59e0b' };
      case 'confirm':
        return { name: 'help-circle', color: themeColors.primary };
      default:
        return { name: 'info', color: themeColors.primary };
    }
  };

  const icon = getIcon();

  const defaultButtons: DialogButton[] = buttons || [
    { text: 'OK', onPress: onClose },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
            <Icon name={icon.name} size={32} color={icon.color} />
          </View>

          {/* Title */}
          {title && <Text style={styles.title}>{title}</Text>}

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {defaultButtons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isCancel && styles.cancelButton,
                    isDestructive && styles.destructiveButton,
                    !isCancel && !isDestructive && { backgroundColor: themeColors.primary },
                    defaultButtons.length === 1 && styles.fullWidthButton,
                  ]}
                  onPress={() => {
                    button.onPress?.();
                    if (!button.onPress) onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.cancelButtonText,
                      isDestructive && styles.destructiveButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Hook for easier dialog usage
interface DialogState {
  visible: boolean;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: DialogButton[];
}

export const useDialog = () => {
  const [state, setState] = React.useState<DialogState>({
    visible: false,
    message: '',
  });

  const showDialog = (options: Omit<DialogState, 'visible'>) => {
    setState({ ...options, visible: true });
  };

  const hideDialog = () => {
    setState(prev => ({ ...prev, visible: false }));
  };

  const showSuccess = (title: string, message: string, onOk?: () => void) => {
    showDialog({
      title,
      message,
      type: 'success',
      buttons: [{ text: 'OK', onPress: onOk || hideDialog }],
    });
  };

  const showError = (title: string, message: string) => {
    showDialog({
      title,
      message,
      type: 'error',
      buttons: [{ text: 'OK', onPress: hideDialog }],
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Confirm',
    isDestructive = false
  ) => {
    showDialog({
      title,
      message,
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: hideDialog },
        { 
          text: confirmText, 
          style: isDestructive ? 'destructive' : 'default',
          onPress: () => {
            hideDialog();
            onConfirm();
          },
        },
      ],
    });
  };

  return {
    dialogState: state,
    showDialog,
    hideDialog,
    showSuccess,
    showError,
    showConfirm,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: width - SPACING.xl * 2,
    maxWidth: 340,
    backgroundColor: COLORS.zinc900,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: COLORS.zinc800,
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
  },
  destructiveButtonText: {
    color: '#fff',
  },
});

export default CustomDialog;
