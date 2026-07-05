import React, { memo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface KeyboardAwareScrollProps extends ScrollViewProps {
  footer?: React.ReactNode;
  keyboardVerticalOffset?: number;
}

/** Keyboard-aware scroll with smooth footer lift. */
export const KeyboardAwareScroll = memo(function KeyboardAwareScroll({
  children,
  footer,
  keyboardVerticalOffset,
  contentContainerStyle,
  ...rest
}: KeyboardAwareScrollProps) {
  const insets = useSafeAreaInsets();
  const [footerH, setFooterH] = useState(0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset ?? insets.top + 8}
    >
      <ScrollView
        {...rest}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[contentContainerStyle, footer ? { paddingBottom: footerH + 16 } : null]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            scrollEnabled={false}
            onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
            style={styles.footer}
          >
            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexGrow: 0 },
});
