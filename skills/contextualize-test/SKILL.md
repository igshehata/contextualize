---
name: contextualize-test
description: Test skill shipped by the contextualize kit to confirm skill injection works. Use when the user asks to verify that the contextualize kit's skills are loading.
---

# contextualize — test skill

If an agent is reading this, the **contextualize** kit successfully registered a skill by
adding its own bundled `skills/` directory to `config.skills.paths` — with **no files
written into the consumer's project**.

This is a placeholder that proves the mechanism end to end. Replace it with real skills
under the kit's `skills/` directory: each skill is its own folder containing a `SKILL.md`
with `name` and `description` frontmatter.
