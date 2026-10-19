export function calculatePetLevel(exp: number): number {
  return Math.floor(exp / 100) + 1;
}

export function formatLastUsed(lastUsed: number): string {
  if (!lastUsed) return '未使用';
  
  const date = new Date(lastUsed);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今日';
  } else if (diffDays === 1) {
    return '昨日';
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}週間前`;
  } else {
    return `${Math.floor(diffDays / 30)}ヶ月前`;
  }
}

// MyPet type to MHF (Marc's Head Format) mapping for mc-heads.net
const PET_MHF_MAPPING: Record<string, string> = {
  // Hostile mobs
  'Creeper': 'MHF_Creeper',
  'Zombie': 'MHF_Zombie',
  'Skeleton': 'MHF_Skeleton',
  'Spider': 'MHF_Spider',
  'Cave_Spider': 'MHF_CaveSpider',
  'Enderman': 'MHF_Enderman',
  'Blaze': 'MHF_Blaze',
  'Ghast': 'MHF_Ghast',
  'Magma_Cube': 'MHF_LavaSlime',
  'Slime': 'MHF_Slime',
  'Witch': 'MHF_Witch',
  'Zombified_Piglin': 'MHF_PigZombie',
  'Wither_Skeleton': 'MHF_WSkeleton',
  'Wither': 'MHF_Wither',
  'Stray': 'MHF_Stray',
  'Vex': 'MHF_Vex',
  'Shulker': 'MHF_Shulker',
  'Vindicator': 'MHF_Illager',
  'Evoker': 'MHF_Illager',
  'Pillager': 'MHF_Illager',
  
  // Friendly mobs
  'Cow': 'MHF_Cow',
  'Pig': 'MHF_Pig',
  'Chicken': 'MHF_Chicken',
  'Sheep': 'MHF_Sheep',
  'Wolf': 'MHF_Wolf',
  'Ocelot': 'MHF_Ocelot',
  'Cat': 'MHF_Ocelot', // Use Ocelot for cats as fallback
  'Mooshroom': 'MHF_MushroomCow',
  'Squid': 'MHF_Squid',
  'Iron_Golem': 'MHF_Golem',
  'Villager': 'MHF_Villager',
};

export function getPetEmoji(petType: string): string {
  // Map pet types to appropriate emojis
  const emojiMapping: Record<string, string> = {
    'Wolf': '🐺',
    'Cat': '🐱',
    'Ocelot': '🐈',
    'Horse': '🐴',
    'Donkey': '🫏',
    'Mule': '🫏',
    'Llama': '🦙',
    'Parrot': '🦜',
    'Fox': '🦊',
    'Bee': '🐝',
    'Axolotl': '🩀',
    'Goat': '🐐',
    'Frog': '🐸',
    'Allay': '👻',
    'Camel': '🐫',
    'Sniffer': '🐘',
    'Armadillo': '🦔',
    'Zombie': '🧟',
    'Skeleton': '💀',
    'Creeper': '💥',
    'Spider': '🕷️',
    'Enderman': '👤',
    'Witch': '🧙',
    'Blaze': '🔥',
    'Ghast': '👻',
    'Cow': '🐄',
    'Pig': '🐷',
    'Sheep': '🐑',
    'Chicken': '🐔',
    'Rabbit': '🐰',
    'Villager': '👨‍🌾',
    'Iron_Golem': '🤖',
    'Snow_Golem': '⛄',
    'Squid': '🦑',
    'Glow_Squid': '🦑',
    'Bat': '🦇',
    'Mooshroom': '🍄',
    'Panda': '🐼',
    'Polar_Bear': '🐻‍❄️',
    'Turtle': '🐢',
    'Dolphin': '🐬',
    'Cod': '🐟',
    'Salmon': '🐟',
    'Pufferfish': '🐡',
    'Tropical_Fish': '🐠',
    'Wandering_Trader': '🧳',
    'Trader_Llama': '🦙',
    'Strider': '🦎',
    'Tadpole': '🐸',
    'Piglin': '🐷',
    'Piglin_Brute': '🐷',
    'Hoglin': '🐗',
    'Zoglin': '🐗',
    'Zombified_Piglin': '🧟',
    'Wither_Skeleton': '💀',
    'Phantom': '👻',
    'Drowned': '🧟',
    'Husk': '🧟',
    'Stray': '💀',
    'Vindicator': '⚔️',
    'Evoker': '🔮',
    'Pillager': '🏹',
    'Ravager': '🐂',
    'Vex': '👻',
    'Guardian': '🐟',
    'Elder_Guardian': '🐟',
    'Shulker': '📦',
    'Endermite': '🐛',
    'Silverfish': '🐛',
    'Cave_Spider': '🕷️',
    'Slime': '🟢',
    'Magma_Cube': '🔴',
    'Warden': '👹',
    'Wither': '☠️',
    'Ender_Dragon': '🐉',
  };
  
  return emojiMapping[petType] || '🐾';
}

export function sanitizePetName(name: string): string {
  if (!name) return '名前なし';

  // Remove HTML tags and special characters that could be used for injection
  // But preserve Minecraft color codes (&x, &#FFFFFF) for rendering
  return name
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"']/g, '') // Remove potentially dangerous characters (keep &)
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 100) || '名前なし'; // Limit length and provide fallback
}

/**
 * ペット名からカラーコードを除去したプレーンテキストを取得
 */
export function getPlainPetName(name: string): string {
  if (!name) return '名前なし';

  return name
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"']/g, '') // Remove potentially dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/&[0-9a-fA-FlmnorLMNOR]/g, '') // Remove Minecraft color codes
    .replace(/&#[0-9A-Fa-f]{6}/g, '') // Remove hex color codes
    .replace(/\\n/g, ' ') // Replace escaped newlines with space
    .trim()
    .substring(0, 100) || '名前なし';
}

export function getPetTypeColor(petType: string): string {
  // Return Tailwind color classes based on pet type category
  const colorMapping: Record<string, string> = {
    // Passive/Friendly pets - green
    'Wolf': 'bg-green-100 text-green-800',
    'Cat': 'bg-pink-100 text-pink-800',
    'Ocelot': 'bg-yellow-100 text-yellow-800',
    'Horse': 'bg-amber-100 text-amber-800',
    'Donkey': 'bg-amber-100 text-amber-800',
    'Mule': 'bg-amber-100 text-amber-800',
    'Llama': 'bg-green-100 text-green-800',
    'Parrot': 'bg-blue-100 text-blue-800',
    'Fox': 'bg-orange-100 text-orange-800',
    'Bee': 'bg-yellow-100 text-yellow-800',
    'Axolotl': 'bg-pink-100 text-pink-800',
    'Goat': 'bg-green-100 text-green-800',
    'Frog': 'bg-green-100 text-green-800',
    'Allay': 'bg-blue-100 text-blue-800',
    'Camel': 'bg-yellow-100 text-yellow-800',
    'Sniffer': 'bg-green-100 text-green-800',
    'Armadillo': 'bg-gray-100 text-gray-800',
    'Cow': 'bg-green-100 text-green-800',
    'Pig': 'bg-pink-100 text-pink-800',
    'Sheep': 'bg-green-100 text-green-800',
    'Chicken': 'bg-yellow-100 text-yellow-800',
    'Rabbit': 'bg-green-100 text-green-800',
    'Villager': 'bg-blue-100 text-blue-800',
    'Iron_Golem': 'bg-gray-100 text-gray-800',
    'Snow_Golem': 'bg-blue-100 text-blue-800',
    'Squid': 'bg-blue-100 text-blue-800',
    'Glow_Squid': 'bg-cyan-100 text-cyan-800',
    'Bat': 'bg-gray-100 text-gray-800',
    'Mooshroom': 'bg-red-100 text-red-800',
    'Panda': 'bg-green-100 text-green-800',
    'Polar_Bear': 'bg-blue-100 text-blue-800',
    'Turtle': 'bg-green-100 text-green-800',
    'Dolphin': 'bg-blue-100 text-blue-800',
    'Cod': 'bg-blue-100 text-blue-800',
    'Salmon': 'bg-pink-100 text-pink-800',
    'Pufferfish': 'bg-yellow-100 text-yellow-800',
    'Tropical_Fish': 'bg-orange-100 text-orange-800',
    'Wandering_Trader': 'bg-blue-100 text-blue-800',
    'Trader_Llama': 'bg-blue-100 text-blue-800',
    'Strider': 'bg-red-100 text-red-800',
    'Tadpole': 'bg-green-100 text-green-800',
    
    // Hostile/Neutral pets - red/orange
    'Zombie': 'bg-red-100 text-red-800',
    'Skeleton': 'bg-gray-100 text-gray-800',
    'Creeper': 'bg-green-100 text-green-800',
    'Spider': 'bg-red-100 text-red-800',
    'Enderman': 'bg-purple-100 text-purple-800',
    'Witch': 'bg-purple-100 text-purple-800',
    'Blaze': 'bg-orange-100 text-orange-800',
    'Ghast': 'bg-red-100 text-red-800',
    'Piglin': 'bg-orange-100 text-orange-800',
    'Piglin_Brute': 'bg-red-100 text-red-800',
    'Hoglin': 'bg-red-100 text-red-800',
    'Zoglin': 'bg-red-100 text-red-800',
    'Zombified_Piglin': 'bg-red-100 text-red-800',
    'Wither_Skeleton': 'bg-gray-100 text-gray-800',
    'Phantom': 'bg-purple-100 text-purple-800',
    'Drowned': 'bg-blue-100 text-blue-800',
    'Husk': 'bg-yellow-100 text-yellow-800',
    'Stray': 'bg-blue-100 text-blue-800',
    'Vindicator': 'bg-red-100 text-red-800',
    'Evoker': 'bg-purple-100 text-purple-800',
    'Pillager': 'bg-red-100 text-red-800',
    'Ravager': 'bg-red-100 text-red-800',
    'Vex': 'bg-purple-100 text-purple-800',
    'Guardian': 'bg-cyan-100 text-cyan-800',
    'Elder_Guardian': 'bg-cyan-100 text-cyan-800',
    'Shulker': 'bg-purple-100 text-purple-800',
    'Endermite': 'bg-purple-100 text-purple-800',
    'Silverfish': 'bg-gray-100 text-gray-800',
    'Cave_Spider': 'bg-red-100 text-red-800',
    'Slime': 'bg-green-100 text-green-800',
    'Magma_Cube': 'bg-red-100 text-red-800',
    'Warden': 'bg-gray-100 text-gray-800',
    'Wither': 'bg-black text-white',
    'Ender_Dragon': 'bg-purple-100 text-purple-800',
  };
  
  return colorMapping[petType] || 'bg-gray-100 text-gray-800';
}

export function getPetDisplayName(petType: string): string {
  // Convert technical names to more readable display names
  const displayNames: Record<string, string> = {
    'Wolf': 'オオカミ',
    'Cat': 'ネコ',
    'Ocelot': 'オセロット',
    'Horse': 'ウマ',
    'Donkey': 'ロバ',
    'Mule': 'ラバ',
    'Llama': 'ラマ',
    'Parrot': 'オウム',
    'Fox': 'キツネ',
    'Bee': 'ミツバチ',
    'Axolotl': 'ウーパールーパー',
    'Goat': 'ヤギ',
    'Frog': 'カエル',
    'Allay': 'アレイ',
    'Camel': 'ラクダ',
    'Sniffer': 'スニッファー',
    'Armadillo': 'アルマジロ',
    'Zombie': 'ゾンビ',
    'Skeleton': 'スケルトン',
    'Creeper': 'クリーパー',
    'Spider': 'クモ',
    'Enderman': 'エンダーマン',
    'Witch': 'ウィッチ',
    'Blaze': 'ブレイズ',
    'Ghast': 'ガスト',
    'Cow': 'ウシ',
    'Pig': 'ブタ',
    'Sheep': 'ヒツジ',
    'Chicken': 'ニワトリ',
    'Rabbit': 'ウサギ',
    'Villager': '村人',
    'Iron_Golem': 'アイアンゴーレム',
    'Snow_Golem': 'スノウゴーレム',
    'Squid': 'イカ',
    'Glow_Squid': 'ヒカリイカ',
    'Bat': 'コウモリ',
    'Mooshroom': 'ムーシュルーム',
    'Panda': 'パンダ',
    'Polar_Bear': 'シロクマ',
    'Turtle': 'カメ',
    'Dolphin': 'イルカ',
  };
  
  return displayNames[petType] || petType;
}