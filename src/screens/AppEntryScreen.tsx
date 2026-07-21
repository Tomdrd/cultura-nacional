import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { HomeTheme } from '../constants/colors';

/**
 * Tela de entrada reservada, mapeada para o path '/app' no linking config.
 *
 * Existe para dar um destino de URL seguro para links externos que querem
 * abrir "o app" (ex: botão "Jogar agora" da landing page em public/landing.html).
 * Sem uma rota explícita e reservada como esta, qualquer path não mapeado
 * cai no coletor de perfil público (PublicProfile, path ':slug'), tratando
 * o segmento da URL como nome de usuário — foi exatamente isso que causou
 * o bug de "Perfil não encontrado" investigado antes (com '/Home' e depois
 * com '/app.html').
 *
 * Ao montar, redireciona imediatamente para a Home de verdade.
 */
export function AppEntryScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;

  useEffect(() => {
    navigation.reset({ index: 0, routes: [{ name: 'HomeTabs' }] });
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator color={C.green} />
    </View>
  );
}
