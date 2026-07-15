import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, StatusBar } from 'react-native';
import { ArrowLeft, Star, BookOpen, Utensils, Leaf, Compass, Lightbulb } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';

const CATEGORIAS = [
  { name: 'Cultura',      Icon: Star,      desc: 'Arte, folclore e tradições' },
  { name: 'História',     Icon: BookOpen,  desc: 'Fatos e personagens históricos' },
  { name: 'Gastronomia',  Icon: Utensils,  desc: 'Culinária e pratos típicos' },
  { name: 'Natureza',     Icon: Leaf,      desc: 'Flora, fauna e biomas' },
  { name: 'Turismo',      Icon: Compass,   desc: 'Pontos turísticos e destinos' },
  { name: 'Curiosidades', Icon: Lightbulb, desc: 'Fatos surpreendentes do Brasil' },
];

export function CategoriasScreen({ navigation }: any) {
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
            Explorar <Text style={{ color: C.green }}>Categorias</Text>
          </Text>
          <Text style={[styles.headerSub, { color: C.muted }]}>Escolha um tema e comece a explorar</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Section Label */}
        <View style={[styles.sectionLabel, { paddingHorizontal: Spacing.xl }]}>
          <Text style={[styles.sectionText, { color: C.muted }]}>CATEGORIAS</Text>
          <Text style={[styles.sectionCount, { color: C.green }]}> {CATEGORIAS.length}</Text>
        </View>

        {/* Grid */}
        <View style={[styles.grid, { paddingHorizontal: Spacing.xl, gap: 12 }]}>
          {CATEGORIAS.map(({ name, Icon, desc }) => (
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
  cardDesc:        { fontSize: FontSize.xs, textAlign: 'center', lineHeight: 16 },
});
