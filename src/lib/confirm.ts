import { Alert, Platform } from 'react-native';

type AlertButton = {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
};

/**
 * react-native-web's Alert.alert() is a no-op — it silently does nothing on
 * web. This wraps it with a window.confirm/alert fallback so confirm dialogs
 * and error/success messages actually appear on web, while staying on the
 * real native Alert on iOS/Android.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') {
        Alert.alert(title, message, buttons);
        return;
    }

    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons && buttons.length > 0 ? buttons : undefined;

    if (!list || list.length <= 1) {
        window.alert(text);
        list?.[0]?.onPress?.();
        return;
    }

    const cancelBtn = list.find((b) => b.style === 'cancel');
    const confirmBtn = list.find((b) => b !== cancelBtn) ?? list[list.length - 1];

    if (window.confirm(text)) {
        confirmBtn?.onPress?.();
    } else {
        cancelBtn?.onPress?.();
    }
}

/**
 * react-native-web's Alert class has no prompt() method at all (not even a
 * no-op) — calling Alert.prompt() on web throws. This wraps it with
 * window.prompt on web, real Alert.prompt on native. Mirrors the
 * 'plain-text' single-callback form of Alert.prompt used throughout this
 * app: (title, message, callback, 'plain-text', defaultValue).
 */
export function showPrompt(
    title: string,
    message: string | undefined,
    callback: (text: string) => void,
    defaultValue?: string,
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad',
) {
    if (Platform.OS !== 'web') {
        Alert.prompt(title, message, callback, 'plain-text', defaultValue, keyboardType);
        return;
    }

    const result = window.prompt([title, message].filter(Boolean).join('\n'), defaultValue ?? '');
    if (result !== null) {
        callback(result);
    }
}
