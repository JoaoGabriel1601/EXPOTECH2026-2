import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useBiometric } from "../hooks/useBiometric";
import { useTheme } from "../contexts/ThemeContext";
import { Logo } from "../components/Logo";
import { spacing, radius, typography } from "../utils/theme";

const FRIENDLY_ERRORS = {
  "auth/invalid-credential": "Email ou senha incorretos.",
  "auth/invalid-login-credentials": "Email ou senha incorretos.",
  "auth/wrong-password": "Email ou senha incorretos.",
  "auth/user-not-found": "Email ou senha incorretos.",
  "auth/invalid-email": "Email inválido.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/too-many-requests":
    "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed":
    "Falha de rede. Verifique sua conexão e tente novamente.",
};

function friendlyError(err) {
  if (!err) return null;
  if (FRIENDLY_ERRORS[err.code]) return FRIENDLY_ERRORS[err.code];
  if (err.code) return `${err.code}: ${err.message ?? ""}`.trim();
  return err.message || "Erro ao fazer login.";
}

export function LoginScreen() {
  const { theme } = useTheme();
  const { signIn } = useAuth();
  const biometric = useBiometric();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [askBiometric, setAskBiometric] = useState(false);

  useEffect(() => {
    if (biometric.available && biometric.enabled) {
      handleBiometric();
    }
  }, [biometric.available, biometric.enabled]);

  const handleBiometric = async () => {
    const result = await biometric.authenticate();
    if (result.ok) {
      const { email: e, password: p } = result.credentials;
      setSubmitting(true);
      const r = await signIn(e, p);
      setSubmitting(false);
      if (!r.ok) setErrorMsg(friendlyError(r.error));
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg(friendlyError(result.error));
      return;
    }
    if (biometric.available && !biometric.enabled) {
      setAskBiometric(true);
    }
  };

  const enableBio = async () => {
    await biometric.enable(email.trim(), password);
    setAskBiometric(false);
  };

  const styles = makeStyles(theme);

  return (
    <LinearGradient colors={theme.bgGradient} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <Logo size={160} withBackground />
          </View>

          <View style={styles.card}>
            <Text style={styles.subtitle}>
              Acesse o dashboard de climatização autônoma
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={theme.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  placeholderTextColor={theme.textDim}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!submitting}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textDim}
                  secureTextEntry={!showPwd}
                  autoComplete="current-password"
                  editable={!submitting}
                />
                <Pressable
                  onPress={() => setShowPwd((s) => !s)}
                  hitSlop={10}
                  style={styles.eye}
                >
                  <Ionicons
                    name={showPwd ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting || !email || !password}
              style={({ pressed }) => [
                styles.submit,
                (submitting || !email || !password) && styles.submitDisabled,
                pressed && styles.submitPressed,
              ]}
            >
              <Text style={styles.submitText}>
                {submitting ? "Entrando..." : "Entrar"}
              </Text>
            </Pressable>

            {biometric.available && biometric.enabled && (
              <Pressable
                onPress={handleBiometric}
                style={({ pressed }) => [
                  styles.bioBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name="finger-print"
                  size={22}
                  color={theme.accent}
                />
                <Text style={styles.bioText}>Entrar com {biometric.type}</Text>
              </Pressable>
            )}

            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={theme.danger}
                />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {askBiometric && (
              <View style={styles.bioPrompt}>
                <Text style={styles.bioPromptTitle}>
                  Habilitar entrada com {biometric.type}?
                </Text>
                <Text style={styles.bioPromptSub}>
                  Suas credenciais serão guardadas com segurança no dispositivo.
                </Text>
                <View style={styles.bioPromptRow}>
                  <Pressable
                    onPress={() => setAskBiometric(false)}
                    style={[styles.bioPromptBtn, styles.bioPromptBtnGhost]}
                  >
                    <Text style={styles.bioPromptBtnGhostText}>Agora não</Text>
                  </Pressable>
                  <Pressable
                    onPress={enableBio}
                    style={[styles.bioPromptBtn, styles.bioPromptBtnPrimary]}
                  >
                    <Text style={styles.bioPromptBtnPrimaryText}>Habilitar</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.hint}>
              Esqueceu a senha? Procure o administrador do sistema.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    logoWrap: { alignItems: "center", marginBottom: spacing.lg },
    card: {
      backgroundColor: theme.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    subtitle: {
      ...typography.body,
      color: theme.textMuted,
      textAlign: "center",
      marginBottom: spacing.xl,
    },
    field: { marginBottom: spacing.md },
    label: {
      ...typography.caption,
      color: theme.textMuted,
      marginBottom: spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: spacing.md,
    },
    inputIcon: { marginRight: spacing.sm },
    input: {
      flex: 1,
      paddingVertical: 14,
      color: theme.text,
      fontSize: 15,
    },
    eye: { padding: spacing.xs },
    submit: {
      backgroundColor: theme.accent,
      paddingVertical: 14,
      borderRadius: radius.md,
      alignItems: "center",
      marginTop: spacing.md,
    },
    submitDisabled: { opacity: 0.5 },
    submitPressed: { opacity: 0.85 },
    submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    bioBtn: {
      flexDirection: "row",
      gap: spacing.sm,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 12,
      marginTop: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: theme.accentSoft,
    },
    bioText: { color: theme.accent, fontWeight: "600", fontSize: 14 },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      padding: spacing.sm,
      backgroundColor: theme.dangerSoft,
      borderRadius: radius.sm,
    },
    errorText: { color: theme.danger, flex: 1, fontSize: 13 },
    hint: {
      ...typography.caption,
      color: theme.textDim,
      textAlign: "center",
      marginTop: spacing.lg,
    },
    bioPrompt: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: theme.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    bioPromptTitle: {
      ...typography.bodyStrong,
      color: theme.text,
      marginBottom: spacing.xs,
    },
    bioPromptSub: {
      ...typography.caption,
      color: theme.textMuted,
      marginBottom: spacing.md,
    },
    bioPromptRow: { flexDirection: "row", gap: spacing.sm },
    bioPromptBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.sm,
      alignItems: "center",
    },
    bioPromptBtnGhost: { backgroundColor: theme.surface },
    bioPromptBtnGhostText: { color: theme.textMuted, fontWeight: "600" },
    bioPromptBtnPrimary: { backgroundColor: theme.accent },
    bioPromptBtnPrimaryText: { color: "#fff", fontWeight: "700" },
  });
