export type Product = {
  slug: string
  name: string
  image: string
  type: "common" | "rare" | "epic" | "legendary"
  category: "buildings" | "troops" | "others"
  description: string
}

// Helper to rotate types a bit for variety
const typeCycle: Product["type"][] = ["common", "rare", "epic", "legendary"]

function pickType(index: number): Product["type"] {
  return typeCycle[index % typeCycle.length]
}

export const products: Product[] = [
  // BUILDINGS — elixir collector levels 1..16
  ...Array.from({ length: 16 }, (_, i) => {
    const level = i + 1
    return {
      slug: `elixir-collector-l${level}`,
      name: `elixir collector lvl ${level}`,
      image: `/products/elixir-collector-l${level}.png`,
      type: pickType(i),
      category: "buildings" as const,
      description: `Elixir Collector level ${level}. Generates elixir over time; upgrade improves production and capacity.`,
    }
  }),

  // BUILDINGS — other items
  {
    slug: "cannon",
    name: "cannon",
    image: "/products/cannon.png",
    type: "common",
    category: "buildings",
    description: "Basic ground defense with steady damage output.",
  },
  {
    slug: "r-and-d-hut",
    name: "r&d hut",
    image: "/products/r-and-d-hut.png",
    type: "rare",
    category: "buildings",
    description: "Research and development hub to unlock advanced upgrades.",
  },
  {
    slug: "air-artillery",
    name: "air artillery",
    image: "/products/air-artillery.png",
    type: "epic",
    category: "buildings",
    description: "Long-range anti-air defense with splash damage.",
  },
  {
    slug: "mini-tesla",
    name: "mini tesla",
    image: "/products/mini-tesla.png",
    type: "rare",
    category: "buildings",
    description: "Hidden electric defense that zaps nearby enemies.",
  },
  {
    slug: "troop-research-center",
    name: "troop research center",
    image: "/products/troop-research-center.png",
    type: "epic",
    category: "buildings",
    description: "Improves troop capabilities and unlocks new tactics.",
  },
  {
    slug: "multi-shot-tesla",
    name: "multi shot tesla",
    image: "/products/multi-shot-tesla.png",
    type: "legendary",
    category: "buildings",
    description: "High-voltage tower that chains lightning across enemies.",
  },

  // TROOPS — required + 5 more
  {
    slug: "archer",
    name: "archer",
    image: "/products/archer.png",
    type: "rare",
    category: "troops",
    description: "Ranged unit with precise shots from a distance.",
  },
  {
    slug: "barbarian",
    name: "barbarian",
    image: "/products/barbarian.png",
    type: "common",
    category: "troops",
    description: "Brave melee unit with quick training time.",
  },
  {
    slug: "goblin",
    name: "goblin",
    image: "/products/goblin.png",
    type: "common",
    category: "troops",
    description: "Fast looter focused on targeting resources.",
  },
  {
    slug: "witch",
    name: "witch",
    image: "/products/witch.png",
    type: "epic",
    category: "troops",
    description: "Summoner unit calling forth spectral allies.",
  },
  {
    slug: "miner",
    name: "miner",
    image: "/products/miner.png",
    type: "rare",
    category: "troops",
    description: "Tunnels beneath defenses to strike unexpectedly.",
  },
  {
    slug: "king",
    name: "king",
    image: "/products/king.png",
    type: "legendary",
    category: "troops",
    description: "Powerful leader unit with strong durability.",
  },
  {
    slug: "golem",
    name: "golem",
    image: "/products/golem.png",
    type: "epic",
    category: "troops",
    description: "Massive tank unit that splits into mini-golems.",
  },
  // +5 more troops
  {
    slug: "wizard",
    name: "wizard",
    image: "/products/wizard.png",
    type: "epic",
    category: "troops",
    description: "Area damage caster with explosive projectiles.",
  },
  {
    slug: "bomb-balloon",
    name: "bomb balloon",
    image: "/products/bomb-balloon.png",
    type: "rare",
    category: "troops",
    description: "Air unit dropping bombs onto enemy defenses.",
  },
  {
    slug: "dragonling",
    name: "dragonling",
    image: "/products/dragonling.png",
    type: "legendary",
    category: "troops",
    description: "Flying creature with fiery breath and splash damage.",
  },
  {
    slug: "field-medic",
    name: "field medic",
    image: "/products/field-medic.png",
    type: "rare",
    category: "troops",
    description: "Support unit that heals nearby allies.",
  },
  {
    slug: "valkyrie",
    name: "valkyrie",
    image: "/products/valkyrie.png",
    type: "epic",
    category: "troops",
    description: "Spinning melee fighter dealing circular damage.",
  },

  // OTHERS (Loots)
  {
    slug: "scrap-metal",
    name: "scrap metal",
    image: "/products/scrap-metal.png",
    type: "common",
    category: "others",
    description: "Basic crafting material salvaged from battlefields.",
  },
  {
    slug: "precious-metal",
    name: "precious metal",
    image: "/products/precious-metal.png",
    type: "rare",
    category: "others",
    description: "High-value refined metal used for advanced upgrades.",
  },
  {
    slug: "machined-metal",
    name: "machined metal",
    image: "/products/machined-metal.png",
    type: "epic",
    category: "others",
    description: "Precisely engineered component for high-end builds.",
  },
  {
    slug: "building-token",
    name: "building token",
    image: "/products/building-token.png",
    type: "rare",
    category: "others",
    description: "Token used to unlock special building upgrades.",
  },
  {
    slug: "shooter-token",
    name: "shooter token",
    image: "/products/shooter-token.png",
    type: "rare",
    category: "others",
    description: "Token enhancing ranged troop research lines.",
  },
  {
    slug: "close-combat-token",
    name: "close combat token",
    image: "/products/close-combat-token.png",
    type: "rare",
    category: "others",
    description: "Token focused on melee troop enhancements.",
  },
  {
    slug: "defense-building-token",
    name: "defense building token",
    image: "/products/defense-building-token.png",
    type: "epic",
    category: "others",
    description: "Token unlocking new defensive structures and upgrades.",
  },
]
