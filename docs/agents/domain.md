# Domain Docs

This repo uses a single-context layout.

## What to read

- Read `CONTEXT.md` at the repo root before exploring domain-sensitive areas.
- Read `docs/adr/` for architecture decisions that affect the area you are working in.

If either path does not exist yet, proceed without blocking on it.

## Layout

Single-context repos keep one shared glossary and one shared ADR set:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

## Consumer rules

- Use the terminology from `CONTEXT.md` in issue titles, proposals, tests, and refactor plans.
- If a proposed change conflicts with an ADR, call that out explicitly instead of silently overriding it.
