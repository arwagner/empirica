# Empirica

## Phones are a supported platform

The lab must work on a phone (portrait, 360px wide and up, and landscape) as well as on desktop.

- **Filing a ticket:** say how the change behaves on a phone, and include phone checks in its acceptance criteria. If phone use is out of scope, say so and why.
- **Working a ticket:** before calling UI work done, check it in a mobile viewport (360px wide, touch) as well as on desktop:
  - no horizontal page scroll
  - tap targets at least 44px
  - nothing that only works by hover, keyboard shortcut or mouse lock; every shortcut needs an on-screen control
  - keyboard hints (`<kbd>`) hidden on touch devices
