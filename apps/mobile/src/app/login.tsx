import { useState } from 'react';
import {
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

import logoUCN from '../../../../apps/shared/assets/logoUCN.png';
import logoFAMED from '../../../shared/assets/logoFAMED.png';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  function handleSubmit() {
    // Aquí conectaremos el formulario con el backend.
    // No iniciar sesión ni navegar sin validar las credenciales.
    console.log('Formulario de login preparado', {
      usuario,
      contrasenaIngresada: contrasena.length > 0,
    });
  }

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.logos}>
                <View style={styles.imageSlot}>
                  <Image
                    source={logoUCN}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel="Logo institucional UCN"
                  />
                </View>

                <View style={styles.imageSlot}>
                  <Image
                    source={logoFAMED}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel="Logo de ResiBreak"
                  />
                </View>
              </View>

              <Text style={styles.title}>ResiBreak</Text>

              <Text style={styles.subtitle}>
                Sistema de gestión y administración de alimentación
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Usuario</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Ingresa tu RUT o correo"
                  placeholderTextColor="#999999"
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  accessibilityLabel="Usuario"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>

                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor="#999999"
                    value={contrasena}
                    onChangeText={setContrasena}
                    secureTextEntry={!mostrarContrasena}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    accessibilityLabel="Contraseña"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
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

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                ]}
                onPress={handleSubmit}
                accessibilityRole="button"
              >
                <Text style={styles.submitText}>Iniciar sesión</Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Universidad Católica del Norte
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: 'rgba(172, 109, 51, 0.2)',
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 20,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
    elevation: 3,
  },
  header: {
    alignItems: 'center',
  },
  logos: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 26,
  },
  imageSlot: {
    width: 108,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#292629',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    color: '#777777',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E2E2',
    marginVertical: 26,
  },
  form: {
    gap: 22,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#292629',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    color: '#292629',
    fontSize: 14,
  },
  passwordWrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingLeft: 14,
    paddingRight: 4,
    color: '#292629',
    fontSize: 14,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  toggleText: {
    color: '#AC6D33',
    fontSize: 11,
    fontWeight: '700',
  },
  submitButton: {
    minHeight: 48,
    marginTop: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#AC6D33',
    borderRadius: 6,
    backgroundColor: '#AC6D33',
  },
  submitButtonPressed: {
    backgroundColor: '#925A2A',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2E2E2',
    alignItems: 'center',
  },
  footerText: {
    color: '#888888',
    fontSize: 11,
    textAlign: 'center',
  },
});
