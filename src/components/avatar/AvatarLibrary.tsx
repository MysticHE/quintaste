import { Image, Platform, Pressable, View } from 'react-native';
import { Icon, T, common } from '../ui';
import { AvatarPortrait } from './AvatarPortrait';
import { usePreferences } from '../../state/Preferences';
import { sampleAvatar } from '../../utils/avatar-schema';
import type { Avatar } from '../../types/avatar';
import type { AvatarItem } from '../../hooks/useAccountAvatars';
import { useKeyboardFocus } from '../../hooks/useKeyboardFocus';

function Choice({ id, label, thumbnail, avatar, selected, onPress, disabled }: {
  id: string; label: string; thumbnail?: string; avatar?: Avatar | null; selected: boolean; onPress: (id: string) => void; disabled: boolean;
}) {
  const { theme } = usePreferences();
  const { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }}
    testID={'avatar-choice-' + id} disabled={disabled} onPress={() => onPress(id)}
    {...focusProps}
    style={({ pressed }) => ({ flexBasis: 96, flexGrow: 1, maxWidth: 160, minHeight: 140, padding: 6, paddingTop: 16, gap: 6,
      alignItems: 'center', borderWidth: 2, borderColor: focused ? theme.accent : theme.transparent,
      backgroundColor: selected ? theme.accentSoft : theme.card, borderRadius: 16, opacity: pressed || disabled ? 0.6 : 1,
      ...(Platform.OS === 'web' ? { outlineStyle: 'solid' as const, outlineWidth: 0 } : {}) })}>
    {selected && <View testID="avatar-selected-check" accessible={false} aria-hidden
      style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent }}>
      <Icon name="checkmark" size={14} color={theme.background} />
    </View>}
    {thumbnail ? <Image source={{ uri: thumbnail }} style={{ width: 80, height: 80 }} resizeMode="contain" accessible={false} />
      : <AvatarPortrait avatar={avatar || null} size={80} animate={false} label="" />}
    <T variant="small" color={selected ? theme.accent : theme.foreground} style={common.center}>{label}</T>
  </Pressable>;
}
export function AvatarLibrary({ items, pending, selected, onSelect, disabled }: {
  items: AvatarItem[]; pending: Avatar | null; selected: string; onSelect: (id: string) => void; disabled: boolean;
}) {
  return <View style={{ gap: 12 }}>
    <T variant="subtitle" accessibilityRole="header">Your Avatars</T>
    <View style={[common.row, { flexWrap: 'wrap', alignItems: 'stretch', gap: 8 }]}>
      {pending && !items.some(item => item.id === pending.id) && <Choice id={pending.id} label="New - Unsaved" thumbnail={pending.frames.base} selected={selected === pending.id} onPress={onSelect} disabled={disabled} />}
      {items.map((item, index) => <Choice key={item.id} id={item.id} label={'Portrait ' + (items.length - index)} thumbnail={item.thumbnail}
        selected={selected === item.id} onPress={onSelect} disabled={disabled} />)}
      <Choice id="default" label="Lian" avatar={null} selected={selected === 'default'} onPress={onSelect} disabled={disabled} />
      <Choice id={sampleAvatar.id} label="Sample" avatar={sampleAvatar} selected={selected === sampleAvatar.id} onPress={onSelect} disabled={disabled} />
    </View>
  </View>;
}
