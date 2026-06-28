import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Check, X, Zap, Shield, Star, Crown, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius } from '../../constants/layout';

type PlanId = 'monthly' | 'family';

const PLANS = [
  { id: 'monthly' as PlanId, label: 'CN Pro',   price: 'R$ 9,90',  period: '/mês', description: 'Para você explorar sem limites', highlight: true },
  { id: 'family'  as PlanId, label: 'Família',  price: 'R$ 19,90', period: '/mês', description: 'Até 5 contas na assinatura',      highlight: false },
];

const FREE_FEATURES  = [
  { label: 'Quiz solo com anúncios',   ok: true  },
  { label: '5 duelos por dia',         ok: true  },
  { label: 'Acesso a 5 estados',       ok: true  },
  { label: 'Ranking nacional',         ok: true  },
  { label: 'Sem anúncios',             ok: false },
  { label: 'Duelos ilimitados',        ok: false },
  { label: 'Todos os 27 estados',      ok: false },
  { label: 'Modo offline',             ok: false },
  { label: 'Badge exclusivo',          ok: false },
];

const PRO_FEATURES = [
  'Quiz solo sem anúncios',
  'Duelos ilimitados',
  'Todos os 27 estados',
  'Ranking nacional + cidade',
  'Modo offline',
  'Badge exclusivo Pro',
  'Conteúdo antecipado',
  'Suporte prioritário',
];

export function SubscriptionScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    if (user) {
      await supabase.from('profiles')
        .update({ plan: selectedPlan === 'family' ? 'family' : 'pro' })
        .eq('id', user.id);
    }
    setLoading(false);
    Alert.alert('Bem-vindo ao CN Pro!', 'Assinatura ativada com sucesso!',
      [{ text: 'Começar', onPress: () => navigation.goBack() }]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>CN Pro</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Crown size={40} color="#FFDF00" />
          <Text style={styles.heroTitle}>Explore o Brasil{'\n'}sem limites</Text>
          <Text style={styles.heroSub}>Cancele quando quiser</Text>
        </View>

        {/* Plan cards */}
        <View style={styles.planRow}>
          {PLANS.map(plan => (
            <TouchableOpacity key={plan.id} onPress={() => setSelectedPlan(plan.id)}
              style={[styles.planCard, {
                backgroundColor: selectedPlan === plan.id ? colors.primary : colors.card,
                borderColor: selectedPlan === plan.id ? colors.primary : colors.border,
              }]}
            >
              {plan.highlight && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              <Text style={[styles.planLabel, { color: selectedPlan === plan.id ? '#FFF' : colors.text }]}>{plan.label}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, { color: selectedPlan === plan.id ? '#FFDF00' : colors.primary }]}>{plan.price}</Text>
                <Text style={[styles.planPeriod, { color: selectedPlan === plan.id ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{plan.period}</Text>
              </View>
              <Text style={[styles.planDesc, { color: selectedPlan === plan.id ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>{plan.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comparison */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>O que está incluído</Text>
          <View style={[styles.compareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.compareTitle, { color: colors.textSecondary }]}>Gratuito</Text>
            {FREE_FEATURES.map(({ label, ok }) => (
              <View key={label} style={styles.featureRow}>
                {ok ? <Check size={16} color={colors.primary} /> : <X size={16} color={colors.textMuted} />}
                <Text style={[styles.featureLabel, { color: ok ? colors.text : colors.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.compareCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '40' }]}>
            <View style={styles.compareTitleRow}>
              <Crown size={14} color={colors.primary} />
              <Text style={[styles.compareTitle, { color: colors.primary }]}>CN Pro</Text>
            </View>
            {PRO_FEATURES.map(label => (
              <View key={label} style={styles.featureRow}>
                <Check size={16} color={colors.primary} />
                <Text style={[styles.featureLabel, { color: colors.text }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          {[
            { Icon: Shield, label: 'Pagamento\nseguro' },
            { Icon: Zap,    label: 'Cancele\nquando quiser' },
            { Icon: Star,   label: 'Sem\ncompromisso' },
          ].map(({ Icon, label }) => (
            <View key={label} style={styles.trustItem}>
              <Icon size={20} color={colors.textSecondary} />
              <Text style={[styles.trustLabel, { color: colors.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.cta, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={handleSubscribe} disabled={loading}
          style={[styles.ctaBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Crown size={18} color="#FFDF00" />
              <Text style={styles.ctaBtnText}>
                Assinar por {selectedPlan === 'monthly' ? 'R$ 9,90/mês' : 'R$ 19,90/mês'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.ctaHint, { color: colors.textMuted }]}>
          Cobrado mensalmente · Cancele a qualquer momento
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, paddingTop: 56, borderBottomWidth: 0.5 },
  headerTitle:     { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  hero:            { padding: Spacing.xxxl, alignItems: 'center', gap: 12 },
  heroTitle:       { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 34 },
  heroSub:         { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  planRow:         { flexDirection: 'row', gap: 12, padding: Spacing.xl },
  planCard:        { flex: 1, borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 6, overflow: 'hidden' },
  popularBadge:    { position: 'absolute', top: 8, right: 8, backgroundColor: '#FFDF00', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  popularText:     { fontSize: 9, fontWeight: FontWeight.bold, color: '#002776' },
  planLabel:       { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  priceRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  planPrice:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  planPeriod:      { fontSize: FontSize.xs, marginBottom: 3 },
  planDesc:        { fontSize: 11, lineHeight: 16 },
  section:         { padding: Spacing.xl, gap: 12 },
  sectionTitle:    { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 4 },
  compareCard:     { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 2 },
  compareTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  compareTitle:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 8 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  featureLabel:    { fontSize: FontSize.sm, flex: 1 },
  trustRow:        { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xxl, padding: Spacing.xl },
  trustItem:       { alignItems: 'center', gap: 6 },
  trustLabel:      { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  cta:             { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, borderTopWidth: 0.5, gap: 8 },
  ctaBtn:          { height: 52, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaBtnText:      { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  ctaHint:         { fontSize: 11, textAlign: 'center' },
});
