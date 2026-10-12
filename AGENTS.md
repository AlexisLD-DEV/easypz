# CODEX-GAME Agent Notes

Appliquer d'abord la base commune:

```text
CODEX-AGENT-BASE.md
```

Puis appliquer cette fiche locale.

## Identite

- Nom a afficher: **CODEX-GAME**
- Role: projet jeu / experimentations gameplay.
- Commande principale: `codex-game`
- Worktree autorise: `/srv/projects/quiz-english`
- Branche attendue: selon chantier actif.
- Session tmux: `game`

## Registre

Les autres agents autorises sont listes ici:

```text
CODEX-AGENTS-REGISTRY.md
```

## Regles locales

- Repondre tres brievement par defaut.
- Ne pas modifier les autres worktrees sauf demande explicite.
- Avant commit: verifier `git status`, lancer les tests pertinents, puis `git diff --check`.
- Si le projet n'a pas de test fiable, le dire brievement en final.
