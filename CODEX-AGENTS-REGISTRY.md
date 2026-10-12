# Codex Agents Registry

Registre V0 des agents Codex autorises.

Ce registre sert de reference commune pour les conversations, les commandes tmux, le futur routeur Telegram et la future page Nova `/dashboard/codex`.

Limite V0: **4 agents actifs maximum**.

## Agents

| Agent | Commande | Dossier | Branche attendue | tmux | Role |
| --- | --- | --- | --- | --- | --- |
| `CODEX-NCC` | `codex-ncc` | `/srv/projects/nice-control-center-main` | `main` | `ncc` ou `ncc-codex-cli` | Nice Control Center, dashboard RouenWeb, orchestration VPS |
| `CODEX-GAME` | `codex-game` | `/srv/projects/quiz-english` | selon chantier | `game` | Projet jeu / experimentations gameplay |
| `CODEX-NOVA` | `codex-nova` | `/srv/projects/codex-nova` | `main` | `nova` | Nova principal, produit personnel, maintenance courante |
| `NOVA-CODEX` | `nova-codex` ou `codex-nova-feature` | `/srv/projects/codex-nova-codex-control` | `feature/codex-cli-control` | `nova-codex` | Feature Nova Codex Control et base agents |

## Commandes communes attendues

Chaque agent doit accepter, directement ou via son lanceur:

```bash
<commande>
<commande> status
<commande> continue
<commande> suite
<commande> plan "..."
<commande> goal "..."
<commande> ask "..."
```

Etat actuel:

| Agent | Lanceur complet |
| --- | --- |
| `NOVA-CODEX` | oui: `nova-codex` |
| `CODEX-NCC` | partiel: `codex-ncc` |
| `CODEX-GAME` | partiel: `codex-game` |
| `CODEX-NOVA` | partiel: `codex-nova` |

Amelioration facile: creer `codex-slot` pour unifier les actions.

## Routage Telegram cible

Syntaxe:

```text
<agent> <message>
```

Exemples:

```text
nova-codex continue
codex-ncc suite
codex-game /goal "avance le gameplay"
codex-nova /plan
```

Mapping:

| Prefixe Telegram | Agent | Action |
| --- | --- | --- |
| `nova-codex` | `NOVA-CODEX` | envoyer a tmux `nova-codex` |
| `codex-ncc` | `CODEX-NCC` | envoyer a tmux `ncc` ou `ncc-codex-cli` |
| `codex-game` | `CODEX-GAME` | envoyer a tmux `game` |
| `codex-nova` | `CODEX-NOVA` | envoyer a tmux `nova` |

## Regles de creation d'un nouvel agent

Avant d'ajouter un agent:

1. Verifier que la limite de 4 slots n'est pas depassee.
2. Creer ou choisir un dossier dedie.
3. Creer une branche ou un worktree dedie si le repo est partage.
4. Creer un `CODEX_HOME` dedie.
5. Creer une session tmux dediee.
6. Ajouter l'agent dans ce registre.
7. Ajouter ou adapter son `AGENTS.md`.

Modele:

```text
Agent: CODEX-EXEMPLE
Commande: codex-exemple
Dossier: /srv/projects/exemple
Branche: feature/exemple
tmux: exemple
Role: mission courte
```

## Fichiers de base

Base commune:

```text
CODEX-AGENT-BASE.md
```

Fiche locale de chaque agent:

```text
AGENTS.md
```

Config machine lisible:

```text
ops/codex/worktrees.json
```

## Priorites d'integration immediate

1. Copier ou referencer `CODEX-AGENT-BASE.md` dans chaque agent.
2. Uniformiser les lanceurs avec `codex-slot`.
3. Ajouter `status-json` pour Nova Web.
4. Ajouter le routeur Telegram par prefixe.
5. Reprendre ensuite Nova Web Codex Control.
