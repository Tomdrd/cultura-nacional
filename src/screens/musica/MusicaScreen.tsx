import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, StatusBar } from 'react-native';
import { ArrowLeft, Guitar, Leaf, Mic2 } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';

const GENEROS = [
  { name: 'MPB',    Icon: Guitar, desc: 'Música Popular Brasileira' },
  { name: 'Reggae', Icon: Leaf,   desc: 'Ritmo e cultura rastafári' },
  { name: 'RAP',    Icon: Mic2,   desc: 'Rimas e batidas urbanas' },
];

export function MusicaScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const { width } = useWindowDimensions();

  const numColumns = width >= 600 ? 3 : 2;
  const cardWidth = (Math.min(width, 480) - Spacing.xl * 2 - 12 * (numColumns - 1)) / numColumns;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>
            Quiz <Text style={{ color: C.green }}>Musical</Text>
          </Text>
          <Text style={[styles.headerSub, { color: C.muted }]}>Teste seus conhecimentos sobre a música brasileira</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Section Label */}
        <View style={[styles.sectionLabel, { paddingHorizontal: Spacing.xl }]}>
          <Text style={[styles.sectionText, { color: C.muted }]}>GÊNEROS</Text>
          <Text style={[styles.sectionCount, { color: C.green }]}> {GENEROS.length}</Text>
        </View>

        {/* Grid */}
        <View style={[styles.grid, { paddingHorizontal: Spacing.xl, gap: 12 }]}>
          {GENEROS.map(({ name, Icon, desc }) => (
            <TouchableOpacity
              key={name}
              onPress={() => navigation.navigate('Quiz', { subcategory: name })}
              style={[
                styles.card,
                {
                  backgroundColor: C.card,
                  borderColor: C.border,
                  width: cardWidth,
                },
              ]}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBox, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                <Icon size={20} color={C.text} />
              </View>
              <Text style={[styles.cardName, { color: C.text }]}>{name}</Text>
              <Text style={[styles.cardDesc, { color: C.muted }]}>{desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  backBtn:         { width: 20, paddingTop: 2 },
  headerTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, lineHeight: 24 },
  headerSub:       { fontSize: FontSize.xs, marginTop: 2 },
  sectionLabel:    { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionText:     { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.5 },
  sectionCount:    { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  card:            { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8, alignItems: 'center' },
  iconBox:         { width: 48, height: 48, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardName:        { fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  cardDesc:        { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 17 },
});
