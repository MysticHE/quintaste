import { Image } from 'expo-image';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import type { PropsWithChildren } from 'react';
import { Icon } from '../ui';
import { fontNames, themeFor } from '../../theme/tokens';
import { useT } from '../../i18n';

const ink = themeFor('coral', false);
const noodles = require('../../../assets/walkin/noodles.webp');
const artwork = [require('../../../assets/walkin/dining.webp'), require('../../../assets/walkin/recipes.webp'),
  require('../../../assets/walkin/game.webp'), require('../../../assets/walkin/community.webp')];

/** A miniature illustrative interface, drawn as real text and views, never baked into artwork. */
function P({ children, bold, style }: PropsWithChildren<{ bold?: boolean; style?: TextStyle }>) {
  return <Text allowFontScaling={false} style={[s.text, bold && s.bold, style, { lineHeight: style?.lineHeight ?? (style?.fontSize ?? 12) * 1.25 }]}>{children}</Text>;
}
function Paper({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[s.paper, style]}>{children}</View>;
}
function Sample() {
  const t = useT('me');
  return <View style={s.sample}><Icon name="book-outline" size={11} color={ink.mutedForeground} /><P style={{ fontSize: 10, color: ink.mutedForeground }}>{t('walkInSample')}</P></View>;
}
function Dish({ height = 112 }: { height?: number }) {
  return <Image source={noodles} style={{ width: '100%', height, borderRadius: 9 }} contentFit="cover" />;
}
function Dietary() {
  const t = useT('me');
  return <View style={s.row}><Icon name="leaf-outline" size={12} color={ink.success} /><P style={{ color: ink.success, fontSize: 10 }}>{t('walkInVegan')}</P><P style={{ fontSize: 10 }}>· {t('walkInMinutes')}</P></View>;
}

function Dining() {
  const t = useT('me');
  return <>
    <View style={s.phone}>
      <View style={s.tabs}><P>{t('walkInVeg')}</P><P bold style={{ color: ink.accent }}>{t('walkInMixed')}</P></View>
      <View style={s.tabLine} /><Sample /><Dish height={88} />
      <P bold style={{ fontSize: 17 }}>Clover & Clay</P>
      <P style={{ color: ink.mutedForeground, fontSize: 10 }}>12 Clover Lane</P>
      <View style={s.row}><Icon name="leaf-outline" size={12} color={ink.success} /><P style={{ fontSize: 10 }}>{t('walkInVegetarian')}</P></View>
      <P style={{ color: ink.success, fontSize: 10 }}>{t('walkInVeganOptions')}</P>
    </View>
    <Paper style={{ left: 224, top: 24, width: 126, transform: [{ rotate: '-5deg' }] }}>
      <P bold style={{ fontSize: 15 }}>{t('walkInMenu')}</P>
      <P bold>{t('walkInDish')}</P><P style={{ color: ink.success }}>{t('walkInVegan')}</P>
      <P bold style={{ color: ink.accent, fontSize: 16 }}>S$8.90</P>
      <View style={s.rule} /><P bold>{t('walkInTofuBowl')}</P><P style={{ color: ink.accent }}>S$9.50</P>
    </Paper>
    <Paper style={{ left: 12, top: 296, width: 142, transform: [{ rotate: '-5deg' }] }}>
      <View style={s.row}><View style={s.avatar}><P bold>J</P></View><View style={{ gap: 2 }}><P bold style={{ color: ink.accent }}>Jules</P><P>{t('walkInLunch')}</P></View></View>
    </Paper>
  </>;
}

function Recipes() {
  const t = useT('me');
  return <>
    <View style={s.phone}>
      <View style={s.tabs}><P bold style={{ fontSize: 20 }}>{t('walkInAI')}</P><Icon name="sparkles-outline" size={17} color={ink.accent} /></View>
      <Sample />
      <View style={s.prompt}><P>{t('walkInDish')}</P><P style={{ color: ink.mutedForeground, fontSize: 10 }}>{t('walkInIdea')}</P></View>
      <Dish height={88} /><P bold style={{ fontSize: 14 }}>{t('walkInDish')}</P><Dietary />
    </View>
    <Paper style={{ left: 207, top: 30, width: 143, transform: [{ rotate: '-6deg' }] }}>
      <P bold style={{ fontSize: 14 }}>{t('walkInNutrition')}</P><P style={{ color: ink.mutedForeground, fontSize: 10 }}>{t('walkInEstimate')}</P>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <View><P bold style={s.metric}>444</P><P style={{ fontSize: 9 }}>{t('walkInEnergy')}</P></View>
        <View><P bold style={s.metric}>21 g</P><P style={{ fontSize: 9 }}>{t('walkInProtein')}</P></View>
        <View><P bold style={s.metric}>8 g</P><P style={{ fontSize: 9 }}>{t('walkInFibre')}</P></View>
      </View>
      <View style={s.rule} /><View style={s.row}><Icon name="leaf-outline" color={ink.success} size={14} /><P style={{ fontSize: 10, flex: 1 }}>{t('walkInNutrients')}</P></View>
    </Paper>
  </>;
}

function Game() {
  const t = useT('me');
  const ingredients = [
    [require('../../../assets/game/yellow-noodles.webp'), t('walkInNoodles')],
    [require('../../../assets/game/tofu.webp'), t('walkInTofu')],
    [require('../../../assets/game/button-mushrooms.webp'), t('walkInMushrooms')],
  ] as const;
  return <>
    <View style={s.phone}>
      <P bold style={{ fontSize: 18 }}>{t('walkInKitchen')}</P><Sample />
      <View style={[s.row, { justifyContent: 'space-between' }]}><Icon name="basket-outline" size={16} color={ink.accent} /><View style={s.stepLine} /><Icon name="flame" size={18} color={ink.accent} /><View style={s.stepLine} /><Icon name="checkmark-circle-outline" size={17} color={ink.mutedForeground} /></View>
      <View style={[s.row, { justifyContent: 'space-between' }]}><P style={{ fontSize: 10 }}>{t('walkInIngredients')}</P><P bold style={{ color: ink.accent, fontSize: 10 }}>{t('walkInSteps')}</P><P style={{ fontSize: 10 }}>2 / 5</P></View>
      <View style={[s.prompt, { backgroundColor: ink.accentSoft }]}><P bold>{t('walkInAddMushrooms')}</P></View>
      <Image source={require('../../../assets/game/stove-wok.webp')} contentFit="contain" style={{ height: 76, width: '100%' }} />
      <View style={[s.row, { justifyContent: 'space-between' }]}>{ingredients.map(([source, name]) => <View key={name} style={{ alignItems: 'center', gap: 2 }}>
        <Image source={source} style={{ width: 36, height: 32 }} contentFit="contain" /><P style={{ fontSize: 9 }}>{name}</P>
      </View>)}</View>
    </View>
    <Paper style={{ left: 243, top: 24, width: 104, transform: [{ rotate: '6deg' }] }}>
      <Dish height={66} /><P bold style={{ fontSize: 11 }}>{t('walkInDish')}</P>
      <View style={{ alignItems: 'center' }}><Icon name="arrow-down" size={24} color={ink.accent} /></View>
    </Paper>
  </>;
}

function Community() {
  const t = useT('me');
  return <>
    <View style={s.phone}>
      <P bold style={{ fontSize: 20 }}>{t('walkInCommunity')}</P>
      <View style={s.tabs}><P bold style={{ color: ink.accent }}>{t('walkInPeople')}</P><P>{t('walkInEvents')}</P><P>{t('walkInMarket')}</P></View>
      <Sample /><View style={s.row}><View style={[s.avatar, { backgroundColor: ink.successSoft }]}><P bold>M</P></View><View><P bold>Mika Tan</P><P style={{ color: ink.mutedForeground, fontSize: 10 }}>@mika.cooks</P></View></View>
      <P style={{ fontSize: 9, color: ink.success }}>{t('walkInInterests')}</P><Dish height={58} />
      <P bold style={{ fontSize: 11 }}>{t('walkInDish')}</P>
      <View style={s.chat}><P bold style={{ color: ink.accent, fontSize: 10 }}>Jules</P><P style={{ fontSize: 10 }}>{t('walkInConversation')}</P></View>
      <P style={{ fontSize: 10, color: ink.success }}>{t('walkInReply')}</P>
    </View>
    <Paper style={{ left: 224, top: 16, width: 125, transform: [{ rotate: '-5deg' }] }}>
      <P bold>{t('walkInEvents')}</P><Image source={require('../../../assets/walkin/dumplings.webp')} style={{ width: '100%', height: 57, borderRadius: 7 }} contentFit="cover" />
      <P bold>{t('walkInEvent')}</P><P style={{ fontSize: 9 }}>{t('walkInEventPlace')}</P>
    </Paper>
    <Paper style={{ left: 12, top: 318, width: 138, transform: [{ rotate: '-4deg' }] }}>
      <View style={s.row}><Image source={require('../../../assets/walkin/buns.webp')} style={{ width: 43, height: 43, borderRadius: 6 }} contentFit="cover" /><View style={{ flex: 1, gap: 2 }}><P bold style={{ fontSize: 10 }}>{t('walkInBuns')}</P><P style={{ fontSize: 9 }}>{t('walkInSeller')}</P><P bold style={{ color: ink.accent }}>S$7.50</P></View></View>
    </Paper>
  </>;
}

export function AppPreview({ page, width }: { page: number; width: number }) {
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    style={{ height: width * 1.25, width }}>
    <View style={{ width: 360, height: 450, transform: [{ scale: width / 360 }], transformOrigin: 'top left' }}>
      <Image source={artwork[page]} contentFit="cover" style={StyleSheet.absoluteFill} />
      {page === 0 ? <Dining /> : page === 1 ? <Recipes /> : page === 2 ? <Game /> : <Community />}
    </View>
  </View>;
}
const s = StyleSheet.create({
  text: { color: ink.foreground, fontFamily: fontNames.regular, fontSize: 12, lineHeight: 15 },
  bold: { fontFamily: fontNames.display },
  phone: { position: 'absolute', left: 13, top: 14, width: 204, padding: 10, gap: 5, borderRadius: 22,
    backgroundColor: ink.card, borderWidth: 3, borderColor: ink.frameBorder, boxShadow: '0px 7px 22px rgba(82,39,26,0.16)' },
  paper: { position: 'absolute', padding: 10, gap: 7, backgroundColor: ink.card, borderRadius: 12, boxShadow: '0px 6px 16px rgba(82,39,26,0.12)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 5 },
  tabLine: { alignSelf: 'flex-end', width: 82, height: 2, backgroundColor: ink.accent },
  sample: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  rule: { height: 1, backgroundColor: ink.divider },
  prompt: { backgroundColor: ink.muted, borderRadius: 8, padding: 8, gap: 4 },
  metric: { color: ink.accent, fontSize: 17, lineHeight: 23 },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: ink.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepLine: { height: 3, flex: 1, backgroundColor: ink.accentSoft },
  chat: { padding: 6, gap: 2, borderRadius: 7, backgroundColor: ink.accentSoft },
});
