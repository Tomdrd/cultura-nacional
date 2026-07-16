import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { ArrowLeft, Shield, Zap, RefreshCw } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useHeaderTopPadding } from '../../hooks/useHeaderTopPadding';
import { useAuthStore } from '../../store/authStore';
import { Spacing, FontSize, FontWeight, Radius, scaleFont } from '../../constants/layout';

type PlanId = 'monthly' | 'biannual' | 'annual';

const PLANS = [
  {
    id:       'monthly'  as PlanId,
    label:    '1 mês',
    price:    'R$ 14,90',
    priceNum: 14.90,
    monthly:  'R$ 14,90/mês',
    period:   'Renovação mensal',
    economy:  null,
    days:     30,
  },
  {
    id:       'biannual' as PlanId,
    label:    '6 meses',
    price:    'R$ 69,90',
    priceNum: 69.90,
    monthly:  'R$ 11,65/mês',
    period:   'Pagamento único',
    economy:  'Economize 22%',
    days:     180,
    popular:  true,
  },
  {
    id:       'annual'   as PlanId,
    label:    '1 ano',
    price:    'R$ 119,90',
    priceNum: 119.90,
    monthly:  'R$ 9,99/mês',
    period:   'Pagamento único',
    economy:  'Economize 33%',
    days:     365,
  },
];

const FEATURES = [
  'Selo azul verificado',
  'Perguntas exclusivas CN Pro',
  'Ranking prioritário',
  'Todos os 27 estados',
  'Duelos ilimitados',
  'Cancele quando quiser',
];

const CHECKOUT_BASE_URL = 'https://cultura-nacional-admin.vercel.app/checkout';

export function SubscriptionScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const headerPaddingTop = useHeaderTopPadding();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<PlanId>('biannual');

  function handleSubscribe() {
    const plan = PLANS.find(p => p.id === selected)!;
    const params = new URLSearchParams({
      plan:   selected,
      days:   String(plan.days),
      price:  String(plan.priceNum),
      userId: user?.id ?? '',
      email:  user?.email ?? '',
    });
    const url = `${CHECKOUT_BASE_URL}?${params.toString()}`;
    Linking.openURL(url);
  }

  const selectedPlan = PLANS.find(p => p.id === selected)!;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>CN Pro</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.heroBadge, { backgroundColor: '#1877F215', borderColor: '#1877F240' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#1877F2" />
            <Text style={styles.heroBadgeText}>Verificado</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Leve o Cultura Nacional{'\n'}ao próximo nível</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>Perguntas exclusivas, ranking prioritário e muito mais</Text>
        </View>

        {/* Plans */}
        <View style={styles.plansSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Escolha seu plano</Text>
          <View style={styles.plansCol}>
            {PLANS.map(plan => {
              const isSelected = plan.id === selected;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelected(plan.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isSelected ? '#1877F210' : colors.card,
                      borderColor:     isSelected ? '#1877F2'   : colors.border,
                      borderWidth:     isSelected ? 1.5 : 0.5,
                    },
                  ]}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>MAIS POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.planRow}>
                    <View style={[styles.radio, { borderColor: isSelected ? '#1877F2' : colors.border }]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planLabel, { color: colors.text }]}>{plan.label}</Text>
                      <Text style={[styles.planPeriod, { color: colors.textMuted }]}>{plan.period}</Text>
                      {plan.economy && (
                        <Text style={styles.planEconomy}>{plan.economy}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.planPrice, { color: isSelected ? '#1877F2' : colors.text }]}>{plan.price}</Text>
                      <Text style={[styles.planMonthly, { color: colors.textMuted }]}>{plan.monthly}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>O que está incluído</Text>
          <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {FEATURES.map(f => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#1877F2" />
                <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trust */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Shield size={18} color={colors.textMuted} />
            <Text style={[styles.trustText, { color: colors.textMuted }]}>Pagamento{'\n'}seguro</Text>
          </View>
          <View style={[styles.trustDivider, { backgroundColor: colors.border }]} />
          <View style={styles.trustItem}>
            <Zap size={18} color={colors.textMuted} />
            <Text style={[styles.trustText, { color: colors.textMuted }]}>Ativação{'\n'}imediata</Text>
          </View>
          <View style={[styles.trustDivider, { backgroundColor: colors.border }]} />
          <View style={styles.trustItem}>
            <RefreshCw size={18} color={colors.textMuted} />
            <Text style={[styles.trustText, { color: colors.textMuted }]}>Cancele{'\n'}quando quiser</Text>
          </View>
        </View>

      </ScrollView>

      {/* CTA fixo */}
      <View style={[styles.cta, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={handleSubscribe} activeOpacity={0.85} style={styles.ctaBtn}>
          <Text style={styles.ctaBtnText}>Assinar por {selectedPlan.price}</Text>
        </TouchableOpacity>
        <Text style={[styles.ctaHint, { color: colors.textMuted }]}>
          Pague com Pix, cartão ou boleto · Processado pelo Mercado Pago
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 0.5 },
  headerTitle:    { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  hero:           { padding: Spacing.xl, paddingVertical: 28, alignItems: 'center', gap: 10, borderBottomWidth: 0.5 },
  heroBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, marginBottom: 4 },
  heroBadgeText:  { fontSize: scaleFont(12), fontWeight: FontWeight.medium, color: '#1877F2' },
  heroTitle:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 30 },
  heroSub:        { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  plansSection:   { padding: Spacing.xl, gap: 10 },
  sectionLabel:   { fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  plansCol:       { gap: 8 },
  planCard:       { borderRadius: Radius.lg, padding: Spacing.lg, overflow: 'hidden' },
  popularBadge:   { position: 'absolute', top: 0, right: 12, backgroundColor: '#1877F2', paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  popularText:    { fontSize: scaleFont(9), fontWeight: FontWeight.bold, color: '#fff', letterSpacing: 0.5 },
  planRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio:          { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1877F2' },
  planLabel:      { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  planPeriod:     { fontSize: FontSize.xs, marginTop: 1 },
  planEconomy:    { fontSize: FontSize.xs, color: '#22c55e', marginTop: 2, fontWeight: FontWeight.medium },
  planPrice:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  planMonthly:    { fontSize: scaleFont(11), marginTop: 1 },
  featuresSection:{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, gap: 10 },
  featuresCard:   { borderRadius: Radius.lg, borderWidth: 0.5, padding: Spacing.lg, gap: 4 },
  featureRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  featureText:    { fontSize: FontSize.sm, flex: 1 },
  trustRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, gap: 0 },
  trustItem:      { flex: 1, alignItems: 'center', gap: 6 },
  trustDivider:   { width: 0.5, height: 36, marginHorizontal: 8 },
  trustText:      { fontSize: scaleFont(11), textAlign: 'center', lineHeight: 17 },
  cta:            { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, borderTopWidth: 0.5, gap: 8 },
  ctaBtn:         { height: 52, borderRadius: Radius.md, backgroundColor: '#1877F2', alignItems: 'center', justifyContent: 'center' },
  ctaBtnText:     { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  ctaHint:        { fontSize: scaleFont(11), textAlign: 'center' },
});
