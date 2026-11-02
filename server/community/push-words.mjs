/**
 * The words of each phone alert (server/community/push.mjs), in English and Simplified Chinese: [title, body]. {name} is who
 * did it, {detail} a short name (a gift, a class, a recipe, an item, minutes late). Alerts never carry what was written, so
 * nothing private shows on a locked screen. `kind` is the switch in Settings › Phone alerts (and the Android channel).
 */
export const alertWords = {
  message: { kind: 'messages', en: ['{name}', 'New message'], zh: ['{name}', '新消息'] },

  friendRequest: { kind: 'friends', en: ['Friend request', '{name} wants to be friends'], zh: ['好友请求', '{name} 想加你为好友'] },
  friendAccepted: { kind: 'friends', en: ['New friend', 'You and {name} are now friends'], zh: ['新朋友', '你和 {name} 成为了好友'] },

  gift: { kind: 'gifts', en: ['A gift for you', '{name} sent you a {detail}'], zh: ['你收到一份礼物', '{name} 送你一份{detail}'] },
  giftLiked: { kind: 'gifts', en: ['{name} liked your gift', 'Your {detail} ♥'], zh: ['{name} 喜欢你的礼物', '你送的{detail} ♥'] },
  giftThanks: { kind: 'gifts', en: ['{name} says thanks', 'For your {detail}'], zh: ['{name} 向你道谢', '谢谢你送的{detail}'] },

  dinner: { kind: 'dinners', en: ['Dinner invite', '{name} invited you to dinner'], zh: ['晚餐邀请', '{name} 邀请你吃饭'] },
  dinnerAccepted: { kind: 'dinners', en: ['Dinner is on', '{name} said yes'], zh: ['晚餐确定', '{name} 接受了邀请'] },
  dinnerDeclined: { kind: 'dinners', en: ['Dinner invite', '{name} can’t make it'], zh: ['晚餐邀请', '{name} 无法赴约'] },
  dinnerChanged: { kind: 'dinners', en: ['Dinner plan', '{name} suggested a change'], zh: ['晚餐安排', '{name} 建议了新的安排'] },
  dinnerCancelled: { kind: 'dinners', en: ['Dinner cancelled', '{name} called off the dinner'], zh: ['晚餐取消', '{name} 取消了晚餐'] },
  dinnerLate: { kind: 'dinners', en: ['{name}', 'Running {detail} min late'], zh: ['{name}', '会迟到 {detail} 分钟'] },
  dinnerAgain: { kind: 'dinners', en: ['Eat together again', 'You and {name} both want another dinner'], zh: ['再约一次', '你和 {name} 都想再一起吃饭'] },

  order: { kind: 'orders', en: ['New order', '{name} placed an order'], zh: ['新订单', '{name} 下了订单'] },
  orderConfirmed: { kind: 'orders', en: ['Order confirmed', '{detail} confirmed your order'], zh: ['订单已确认', '{detail} 确认了你的订单'] },
  orderDeclined: { kind: 'orders', en: ['Order declined', '{detail} declined your order'], zh: ['订单被拒绝', '{detail} 拒绝了你的订单'] },
  orderReady: { kind: 'orders', en: ['Ready to collect', 'Your order from {detail} is ready'], zh: ['可以取货', '{detail} 的订单已准备好'] },
  orderCancelled: { kind: 'orders', en: ['Order cancelled', '{detail} cancelled your order'], zh: ['订单已取消', '{detail} 取消了你的订单'] },
  orderCancelledByBuyer: { kind: 'orders', en: ['Order cancelled', '{name} cancelled their order'], zh: ['订单已取消', '{name} 取消了订单'] },
  orderProblem: { kind: 'orders', en: ['Order problem', '{name} reported a problem'], zh: ['订单问题', '{name} 报告了一个问题'] },
  safetyNotice: { kind: 'orders', en: ['Safety notice', 'About {detail}. Open for details'], zh: ['安全提醒', '关于{detail}，请查看详情'] },

  classJoined: { kind: 'classes', en: ['New student', '{name} joined {detail}'], zh: ['新学员', '{name} 报名了{detail}'] },
  classLeft: { kind: 'classes', en: ['Seat freed', '{name} left {detail}'], zh: ['名额空出', '{name} 退出了{detail}'] },
  classChanged: { kind: 'classes', en: ['Class changed', 'New time or place for {detail}'], zh: ['课程有变', '{detail}的时间或地点有更新'] },
  classCancelled: { kind: 'classes', en: ['Class cancelled', '{detail} is cancelled'], zh: ['课程取消', '{detail}已取消'] },
  classRemoved: { kind: 'classes', en: ['Class seat', 'You were removed from {detail}'], zh: ['课程名额', '你已被移出{detail}'] },
  teacherApproved: { kind: 'classes', en: ['You can teach', 'Post your first class'], zh: ['教学申请已通过', '发布你的第一堂课吧'] },
  teacherDeclined: { kind: 'classes', en: ['Teaching application', 'Not approved. Open to see why'], zh: ['教学申请', '未通过，查看原因'] },
  teacherSuspended: { kind: 'classes', en: ['Teaching paused', 'Open to see why'], zh: ['教学已暂停', '查看原因'] },
  teacherReinstated: { kind: 'classes', en: ['Teaching resumed', 'You can post classes again'], zh: ['教学已恢复', '你可以再次发布课程'] },

  recipeReady: { kind: 'recipes', en: ['Your recipe is ready', '{detail}'], zh: ['你的食谱已完成', '{detail}'] },
  recipeFailed: { kind: 'recipes', en: ['Recipe not made', 'Open to see why'], zh: ['食谱未能生成', '查看原因'] },
  recipePublished: { kind: 'recipes', en: ['Recipe published', '{detail} is live'], zh: ['食谱已发布', '{detail}已上线'] },
  recipeDeclined: { kind: 'recipes', en: ['Recipe not published', 'Open {detail} to see why'], zh: ['食谱未发布', '查看{detail}的原因'] },
  levelReady: { kind: 'recipes', en: ['New game level', '{detail} is ready to play'], zh: ['新游戏关卡', '{detail}可以玩了'] },

  recipeLiked: { kind: 'likes', en: ['{name} liked your recipe', '{detail}'], zh: ['{name} 赞了你的食谱', '{detail}'] },
  recipeCooked: { kind: 'likes', en: ['{name} cooked your recipe', '{detail}'], zh: ['{name} 做了你的食谱', '{detail}'] },
  cookedPhoto: { kind: 'likes', en: ['{name} shared a photo', 'They cooked your {detail}'], zh: ['{name} 分享了照片', '做了你的{detail}'] },
  levelLiked: { kind: 'likes', en: ['{name} liked your game level', '{detail}'], zh: ['{name} 喜欢你的游戏关卡', '{detail}'] },

  photoApproved: { kind: 'account', en: ['Photo check passed', 'You can use Dining now'], zh: ['照片审核通过', '现在可以使用约饭了'] },
  photoDeclined: { kind: 'account', en: ['Photo check', 'Please update your photo'], zh: ['照片审核', '请更新你的照片'] },
  shopPaused: { kind: 'account', en: ['Shop paused', 'Open to see why'], zh: ['店铺已暂停', '查看原因'] },
  itemRemoved: { kind: 'account', en: ['Item removed', '{detail} was taken off the Market'], zh: ['商品已下架', '{detail}已从市集下架'] },
};
/** Every switch in Settings › Phone alerts; the app's list is pushKinds in src/services/push.ts. */
export const pushKinds = ['messages', 'friends', 'gifts', 'dinners', 'orders', 'classes', 'recipes', 'likes', 'account'];

const giftNames = {
  en: { rose: 'Rose', lotus: 'Pink Lotus', bouquet: 'Rose Bouquet', mochi: 'Mochi Hug', 'golden-lotus': 'Golden Lotus' },
  zh: { rose: '玫瑰', lotus: '粉莲', bouquet: '玫瑰花束', mochi: '麻糬抱抱', 'golden-lotus': '金莲' },
};
const someone = { en: 'Someone', zh: '有人' }, giftWord = { en: 'gift', zh: '礼物' };

/** The [title, body] of alert `what` in `language`, about `name` (who did it) and `detail`. */
export function alertText(what, language, name, detail) {
  const words = alertWords[what][language];
  const values = { name: name || someone[language], detail: what.startsWith('gift') ? giftNames[language][detail] ?? giftWord[language] : detail };
  return words.map(template => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '').trim());
}
