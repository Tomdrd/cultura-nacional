import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ArrowLeft, Star, BookOpen, Utensils, Leaf, Compass, Lightbulb } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { CategoryColors, withOpacity } from '../../constants/colors';

const CATEGORIAS = [
  { name: 'Cultura',      Icon: Star,      color: CategoryColors.cultura,      desc: 'Arte, folclore e tradições' },
  { name: 'História',     Icon: BookOpen,  color: CategoryColors.historia,     desc: 'Fatos e personagens históricos' },
  { name: 'Gastronomia',  Icon: Utensils,  color: CategoryColors.gastronomia,  desc: 'Culinária e pratos típicos' },
  { name: 'Natureza',     Icon: Leaf,      color: CategoryColors.natureza,     desc: 'Flora, fauna e biomas' },
  { name: 'Turismo',      Icon: Compass,   color: CategoryColors.turismo,      desc: 'Pontos turísticos e destinos' },
  { name: 'Curiosidades', Icon: Lightbulb, color: CategoryColors.curiosidades, desc: 'Fatos surpreendentes do Brasil' },
];

export function CategoriasScreen({ navigation }: any) {
  const { colors } = useTheme();
  const headerPaddingTop = useHeaderTopPadding();
  const { width } = Dimensions.get('window');
  const padding = Spacing.xl;
  const gap = 12;
  const cardWidth = (width - padding * 2 - gap) / 2;
  const isSmall = width < 360;
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Categorias</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.grid, { padding, gap }]}>
        {CATEGORIAS.map(({ name, Icon, color, desc }) => (
          <TouchableOpacity
            key={name}
            onPress={() => navigation.navigate('Quiz', { subcategory: name })}
            style={[
              styles.card,
              {
                backgroundColor: withOpacity(color, 15),
                borderColor: withOpacity(color, 65),
                width: cardWidth,
              },
            ]}
          >
            <View style={[
              styles.iconWrap,
              {
                backgroundColor: withOpacity(color, 25),
                width: isSmall ? 40 : 52,
                height: isSmall ? 40 : 52,
              },
            ]}>
              <Icon size={isSmall ? 22 : 28} color={color} />
            </View>
            <Text style={[styles.cardName, { color: colors.text, fontSize: isSmall ? FontSize.sm : FontSize.md }]}>
              {name}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textMuted, fontSize: isSmall ? FontSize.xs : FontSize.xs }]}>
              {desc}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 0.5 },
  backBtn:   { width: 32, alignItems: 'flex-start' },
  title:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  card:      { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 8 },
  // 12 é intencional: não bate com Radius.md (10) nem Radius.lg (16), fica entre os dois
  // de propósito pro ícone parecer mais "squircle" que o card. Não é um número esquecido.
  iconWrap:  { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName:  { fontWeight: FontWeight.bold },
  cardDesc:  { lineHeight: 18 },
});
