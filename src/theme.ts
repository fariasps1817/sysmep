import { createTheme, type MantineColorsTuple } from '@mantine/core'

// Azul mariano (Nossa Senhora da Conceição) como cor principal.
const marian: MantineColorsTuple = [
  '#eef3fb',
  '#dbe4f3',
  '#b3c6e9',
  '#88a7df',
  '#658dd6',
  '#4f7dd1',
  '#4274cf',
  '#3463b8',
  '#2c58a5',
  '#204a91',
]

export const theme = createTheme({
  primaryColor: 'marian',
  colors: { marian },
  primaryShade: { light: 6, dark: 8 },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontWeight: '700',
  },
  cursorType: 'pointer',
})
