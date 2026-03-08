import { C } from '../../lib/theme'
import { sp } from '../../lib/ds'

export default function Divider({ vertical, margin, color, style }) {
  if (vertical) {
    return (
      <div style={{
        width: 1, alignSelf: 'stretch',
        background: color || C.divider,
        margin: `0 ${margin ?? sp.md}px`,
        flexShrink: 0,
        ...style,
      }} />
    )
  }
  return (
    <div style={{
      height: 1,
      background: color || C.divider,
      margin: `${margin ?? 0}px 0`,
      ...style,
    }} />
  )
}
