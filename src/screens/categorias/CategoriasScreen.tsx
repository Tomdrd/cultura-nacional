import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Star, BookOpen, Utensils, Leaf, Compass, Lightbulb } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

const CATEGORIAS = [
  { name: 'Cultura',      Icon: Star,      color: '#7F77DD', desc: 'Arte, folclore e tradições' },
  { name: 'História',     Icon: BookOpen,  color: '#D85A30', desc: 'Fatos e personagens históricos' },
  { name: 'Gastronomia',  Icon: Utensils,  color: '#BA7517', desc: 'Culinária e pratos típicos' },
  { name: 'Natureza',     Icon: Leaf,      color: '#009C3B', desc: 'Flora, fauna e biomas' },
  { name: 'Turismo',      Icon: Compass,   color: '#378ADD', desc: 'Pontos turísticos e destinos' },
  { name: 'Curiosidades', Icon: Lightbulb, color: '#D4537E', desc: 'Fatos surpreendentes do Brasil' },
];

export function CategoriasScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Categorias</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {CATEGORIAS.map(({ name, Icon, color, desc }) => (
          <TouchableOpacity
            key={name}
            onPress={() => navigation.navigate('Quiz', { subcategory: name })}
            style={[styles.card, { backgroundColor: color + '15', borderColor: color + '40' }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: color + '25' }]}>
              <Icon size={28} color={color} />
            </View>
            <Text style={[styles.cardName, { color }]}>{name}</Text>
            <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  backBtn:   { width: 32, alignItems: 'flex-start' },
  title:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.xl, gap: 12 },
  card:      { width: '47%', borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 8 },
  iconWrap:  { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName:  { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cardDesc:  { fontSize: FontSize.xs, lineHeight: 18 },
});
