export const PlayerSide = {
  DARK: 'DARK',
  HOLY: 'HOLY',
  NOT_CHOSEN: 'NOT_CHOSEN',
} as const
export type PlayerSideType = keyof typeof PlayerSide


