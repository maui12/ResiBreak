import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { Segmentos } from '@/components/admin/usuarios/Controles';
import { e } from '@/components/admin/usuarios/estilos';
import FormularioAlta from '@/components/admin/usuarios/FormularioAlta';
import ImportarExcel from '@/components/admin/usuarios/ImportarExcel';
import ScreenLayout from '@/components/ScreenLayout';
import { MENU_ADMIN } from '@/constants/menus';
import { esTipoUsuario, TIPOS } from '@/services/usuarios.service';

const MODOS = [
  ['excel', 'Cargar desde Excel'],
  ['manual', 'Agregar manualmente'],
] as const;

/**
 * Agregar residente / administrador / proveedor.
 * Residentes: selector entre cargar desde Excel o agregar uno manualmente.
 */
export default function AgregarUsuarioScreen() {
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  const [modo, setModo] = useState<(typeof MODOS)[number][0]>('excel');
  if (!esTipoUsuario(tipo)) return <Redirect href="/admin/usuarios" />;

  return (
    <ScreenLayout titulo={`Agregar ${TIPOS[tipo].singular}`} subtitulo="Administrar usuarios" menu={MENU_ADMIN}>
      <View style={e.contenido}>
        {tipo === 'residentes' ? (
          <>
            <Segmentos opciones={MODOS} valor={modo} onCambiar={setModo} />
            {modo === 'excel' ? <ImportarExcel /> : <FormularioAlta tipo="residentes" />}
          </>
        ) : (
          <FormularioAlta tipo={tipo} />
        )}
      </View>
    </ScreenLayout>
  );
}
