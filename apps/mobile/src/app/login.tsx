import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { Colors, Radios, Spacing } from '../constants/theme';
import { iniciarSesionConRut, mensajeDeLogin } from '../services/auth.service';

// Con require, como en AppHeader (TypeScript no tiene tipos para importar .png).
const logoUCN = require('../../../shared/assets/logoUCN.png');
const logoFAMED = require('../../../shared/assets/logoFAMED.png');

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [enfocado, setEnfocado] = useState<'rut' | 'contrasena' | null>(null);

  async function handleSubmit() {
    if (entrando) return;

    if (!usuario.trim() || !contrasena) {
      setError('Ingresa tu RUT y contraseña.');
      return;
    }

    setError('');
    setEntrando(true);
    try {
      const ruta = await iniciarSesionConRut(usuario, contrasena);
      setContrasena('');
      router.replace(ruta);
    } catch (e) {
      setError(mensajeDeLogin(e));
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />

      {/* Franja blanca con los logos, igual que el encabezado del resto de las pantallas */}
      <View style={styles.franjaLogos}>
        <Image
          source={logoFAMED}
          style={styles.logoFamed}
          resizeMode="contain"
          accessibilityLabel="Logo FAMED"
        />
        <View style={styles.separadorLogos} />
        <Image
          source={logoUCN}
          style={styles.logoUcn}
          resizeMode="contain"
          accessibilityLabel="Logo institucional UCN"
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              ResiBreak
            </Text>
            <View style={styles.acento} />
            <Text style={styles.subtitle}>
              Sistema de gestión y administración de alimentación
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>
            <Text style={styles.cardSubtitle}>Ingresa con tu RUT y contraseña.</Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>RUT</Text>

                <TextInput
                  style={[styles.input, enfocado === 'rut' && styles.inputEnfocado]}
                  placeholder="Ej: 12.345.678-5"
                  placeholderTextColor={Colors.admin.textoSuave}
                  onFocus={() => setEnfocado('rut')}
                  onBlur={() => setEnfocado(null)}
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  accessibilityLabel="RUT"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>

                <View
                  style={[
                    styles.passwordWrapper,
                    enfocado === 'contrasena' && styles.inputEnfocado,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor={Colors.admin.textoSuave}
                    onFocus={() => setEnfocado('contrasena')}
                    onBlur={() => setEnfocado(null)}
                    value={contrasena}
                    onChangeText={setContrasena}
                    secureTextEntry={!mostrarContrasena}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    accessibilityLabel="Contraseña"
                    returnKeyType="done"
                    onSubmitEditing={() => void handleSubmit()}
                  />

                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() =>
                      setMostrarContrasena(!mostrarContrasena)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarContrasena
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    <Text style={styles.toggleText}>
                      {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {error !== '' && (
                <View style={styles.error} accessibilityRole="alert">
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  entrando && styles.submitButtonDisabled,
                ]}
                onPress={() => void handleSubmit()}
                disabled={entrando}
                accessibilityRole="button"
                accessibilityState={{ disabled: entrando, busy: entrando }}
              >
                {entrando ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitText}>Entrar</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Text style={styles.footerText}>
            Universidad Católica del Norte · Facultad de Medicina
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Mismos colores que las demás pantallas: encabezado blanco con logos, fondo azul institucional,
// tarjetas translúcidas, campos oscuros y botón naranjo.
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.admin.fondo,
  },

  /* Franja de logos */
  franjaLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: 44,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: Colors.ucnOrange,
  },
  logoFamed: {
    width: 84,
    height: 62,
  },
  logoUcn: {
    width: 62,
    height: 62,
  },
  separadorLogos: {
    width: 1,
    height: 44,
    backgroundColor: Colors.border,
  },

  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },

  /* Título */
  header: {
    alignItems: 'center',
    maxWidth: 460,
  },
  title: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  acento: {
    width: 44,
    height: 3,
    marginTop: 10,
    borderRadius: 2,
    backgroundColor: Colors.ucnOrange,
  },
  subtitle: {
    marginTop: 12,
    color: Colors.admin.textoSuave,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  /* Tarjeta del formulario */
  card: {
    width: '100%',
    maxWidth: 460,
    padding: 22,
    borderRadius: Radios.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: Colors.admin.tarjeta,
  },
  cardTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: 4,
    color: Colors.admin.textoSuave,
    fontSize: 13,
  },
  form: {
    gap: 18,
    marginTop: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    color: Colors.admin.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.tarjetaHover,
    color: Colors.white,
    fontSize: 15,
  },
  inputEnfocado: {
    borderColor: Colors.admin.celeste,
  },
  passwordWrapper: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: Radios.md,
    backgroundColor: Colors.admin.tarjetaHover,
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingLeft: 14,
    paddingRight: 4,
    color: Colors.white,
    fontSize: 15,
  },
  passwordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleText: {
    color: Colors.admin.celeste,
    fontSize: 12,
    fontWeight: '700',
  },

  /* Error y botón */
  error: {
    padding: 12,
    borderRadius: Radios.md,
    borderWidth: 1,
    borderColor: Colors.admin.rojo,
    backgroundColor: 'rgba(228, 29, 59, 0.12)',
  },
  errorText: {
    color: Colors.white,
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    minHeight: 52,
    marginTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radios.md,
    backgroundColor: Colors.ucnOrange,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  footerText: {
    color: Colors.admin.textoSuave,
    fontSize: 11,
    textAlign: 'center',
  },
});
