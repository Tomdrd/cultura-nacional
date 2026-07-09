import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, Music } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';
import { CategoryColors, withOpacity } from '../../constants/colors';

const GENEROS = [
  { name: 'MPB',    emoji: '🎸', color: CategoryColors.musica, desc: 'Música Popular Brasileira' },
  { name: 'Reggae', emoji: '🌿', color: CategoryColors.reggae, desc: 'Ritmo e cultura rastafári' },
  { name: 'RAP',    emoji: '🎤', color: CategoryColors.rap,    desc: 'Rimas e batidas urbanas' },
];

export function MusicaScreen({ navigation }: any) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Música</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.heroBanner, { backgroundColor: withOpacity(CategoryColors.musica, 12.5), borderColor: withOpacity(CategoryColors.musica, 25.1) }]}>
          <Music size={32} color={CategoryColors.musica} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>Quiz Musical</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>Teste seus conhecimentos sobre a música brasileira</Text>
        </View>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Escolha um gênero</Text>
        {GENEROS.map(({ name, emoji, color, desc }) => (
          <TouchableOpacity
            key={name}
            onPress={() => navigation.navigate('Quiz', { subcategory: name })}
            style={[styles.card, { backgroundColor: withOpacity(color, 8.2), borderColor: withOpacity(color, 25.1) }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: withOpacity(color, 14.5) }]}>
              <Text style={styles.emoji}>{emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: colors.text }]}>{name}</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  backBtn:     { width: 32, alignItems: 'flex-start' },
  title:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  content:     { padding: Spacing.xl, gap: 12 },
  heroBanner:  { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.xl, alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  heroTitle:   { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  heroSub:     { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  sectionLabel:{ fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 14 },
  iconWrap:    { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji:       { fontSize: 26 },
  cardName:    { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cardDesc:    { fontSize: FontSize.xs, marginTop: 2 },
});
