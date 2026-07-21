import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import ArrowLeft from 'lucide-react-native/dist/esm/icons/arrow-left';
import Award from 'lucide-react-native/dist/esm/icons/award';
import ThumbsUp from 'lucide-react-native/dist/esm/icons/thumbs-up';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';
import { HomeTheme } from '../../constants/colors';
import { ScreenContainer } from '../../components/ui/ScreenContainer';

// Sinônimo do lado do app pra flag='boa' de question_health — ver
// docs/DATABASE.md "Ranking de qualidade de perguntas".
interface TopQuestion {
  question_id:    string;
  text:           string;
  difficulty:     string;
  subcategory:    string;
  times_answered: number;
  accuracy:       number | null;
  votes_positive: number;
  votes_negative: number;
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };

export function TopQuestionsScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const C = isDark ? HomeTheme.dark : HomeTheme.light;
  const headerPaddingTop = useHeaderTopPadding();
  const [questions, setQuestions] = useState<TopQuestion[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // RPC única e leve (top_rated_questions), já filtrada/ordenada no banco —
    // evita trazer as 1.600+ perguntas pro cliente só pra filtrar aqui.
    const { data } = await supabase.rpc('top_rated_questions', { p_limit: 30 });
    setQuestions(data ?? []);
    setLoading(false);
  }

  return (
    <ScreenContainer>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>
            Perguntas em <Text style={{ color: C.green }}>Destaque</Text>
          </Text>
          <Text style={[styles.headerSub, { color: C.muted }]}>As mais bem avaliadas pela comunidade</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.green} size="large" />
        </View>
      ) : questions.length === 0 ? (
        <View style={[styles.center, { paddingHorizontal: Spacing.xl }]}>
          <Award size={40} color={C.muted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Ainda sem destaques</Text>
          <Text style={[styles.emptyText, { color: C.muted }]}>
            Conforme mais gente jogar e avaliar perguntas com 👍, elas aparecem aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={item => item.question_id}
          contentContainerStyle={[styles.list, { paddingHorizontal: Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 32 }} />}
          renderItem={({ item: q, index }) => (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.rankBadge, { backgroundColor: C.iconBg }]}>
                  <Text style={[styles.rankText, { color: C.muted }]}>#{index + 1}</Text>
                </View>
                <View style={[styles.metaBadge, { backgroundColor: C.iconBg, borderColor: C.border }]}>
                  <Text style={[styles.metaText, { color: C.muted }]}>{q.subcategory}</Text>
                </View>
                <View style={[styles.metaBadge, { backgroundColor: `${C.green}18`, borderColor: `${C.green}44` }]}>
                  <Text style={[styles.metaText, { color: C.green }]}>{DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}</Text>
                </View>
              </View>

              <Text style={[styles.questionText, { color: C.text }]} numberOfLines={3}>{q.text}</Text>

              <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
                <View style={styles.footerStat}>
                  <ThumbsUp size={13} color={C.green} />
                  <Text style={[styles.footerStatText, { color: C.green }]}>{q.votes_positive}</Text>
                </View>
                {q.accuracy !== null && (
                  <Text style={[styles.footerStatText, { color: C.muted }]}>
                    {Math.round(q.accuracy * 100)}% de acerto · {q.times_answered} respostas
                  </Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 16 },
  backBtn:         { marginRight: 12 },
  headerTitle:     { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.5 },
  headerSub:       { fontSize: FontSize.sm, marginTop: 2 },
  emptyTitle:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyText:       { fontSize: FontSize.sm, textAlign: 'center' },
  list:            { gap: 10 },
  card:            { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankBadge:       { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText:        { fontSize: scaleFont(11), fontWeight: FontWeight.bold },
  metaBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  metaText:        { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  questionText:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, lineHeight: 20 },
  cardFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
  footerStat:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerStatText:  { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});
