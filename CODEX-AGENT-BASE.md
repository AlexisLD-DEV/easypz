# Codex Agent Base

Base commune pour toutes les conversations Codex pilotees sur le VPS.

Ce fichier definit les regles communes. Chaque agent ajoute ensuite une petite fiche locale avec son nom, son dossier, sa branche, sa session tmux et sa commande.

## Objectif

Avoir plusieurs agents Codex en parallele sans confusion:

- un agent = une conversation;
- une conversation = une session tmux;
- une session = un dossier/worktree;
- un chantier long = une branche dediee;
- un recap bref en fin de goal.

## Style par defaut

- Repondre tres brievement.
- Donner l'essentiel: fait, test, commit/deploy, prochaine etape.
- Eviter les longs paragraphes sauf demande explicite.
- Si l'utilisateur demande un plan, fournir un plan court et actionnable.
- Si l'utilisateur demande une explication, rester concret et lie aux fichiers/commandes.

## Mode de travail

Mode attendu: **YOO full access** avec garde-fous.

L'agent peut, par defaut:

- lire le code et les docs utiles;
- modifier les fichiers du worktree autorise;
- lancer les tests pertinents;
- creer des commits propres;
- continuer une tache longue sans redemander `go`;
- proposer ou executer la prochaine action logique quand la demande est claire.

L'agent ne doit pas:

- afficher ou demander un secret;
- lancer un email reel sans confirmation;
- lancer un achat, paiement ou inscription payante sans confirmation;
- faire une suppression massive sans confirmation;
- faire une migration risquee sans confirmation;
- casser volontairement le travail d'un autre agent;
- modifier un autre worktree sans demande explicite.

## Autonomie longue

Pour `/goal` ou `/objectif`, traiter la demande comme une mission autonome.

Comportement attendu:

1. Reformuler mentalement l'objectif.
2. Lire seulement le contexte utile.
3. Etablir un plan court si la tache est multi-etapes.
4. Executer les sous-taches sans redemander `go`.
5. Tester avant commit si le changement touche du code.
6. Commit par etape coherente si le repo est propre et le changement utile.
7. Continuer jusqu'a objectif atteint, blocage reel, risque sensible ou demande `/pause` / `/stop`.

## Commandes utilisateur

Les commandes doivent etre comprises dans le terminal, le web ou Telegram.

| Message | Comportement attendu |
| --- | --- |
| `continue` | reprendre la prochaine action concrete |
| `suite` | meme comportement que `continue` |
| `quelle est la suite ?` | dire la prochaine action claire, puis continuer si le contexte le permet |
| `/plan` | donner un plan court |
| `/goal "..."` | executer une mission longue autonome |
| `/objectif "..."` | meme comportement que `/goal` |
| `/pause` | finir l'action en cours puis s'arreter avec resume |
| `/stop` | arreter proprement et resumer |
| `/point` | donner l'etat sans coder tant que l'utilisateur ne relance pas |

## Regle worktree

Un agent ne travaille que dans son dossier autorise.

Regle de base:

```text
1 agent = 1 dossier = 1 branche = 1 session tmux
```

Exemples:

```text
codex-ncc          -> /srv/projects/nice-control-center-main
codex-game         -> /srv/projects/quiz-english
codex-nova         -> /srv/projects/codex-nova
nova-codex         -> /srv/projects/codex-nova-codex-control
```

Si deux agents doivent travailler sur le meme repo, utiliser des `git worktree` separes.

## Telegram

Les messages Telegram doivent pouvoir cibler un agent par prefixe.

Exemples:

```text
nova-codex continue
nova-codex suite
nova-codex quelle est la suite ?
nova-codex /plan
nova-codex /goal "implemente la page /dashboard/codex"
codex-ncc continue
codex-game /goal "avance le jeu"
codex-nova suite
```

Regles Telegram:

- repondre tres brievement;
- confirmer l'action envoyee a la session;
- ne jamais inclure de secret;
- en fin de goal, envoyer un recap bref;
- si l'agent cible n'existe pas, repondre avec les agents disponibles.

Format de recap de fin:

```text
AGENT termine: resultat. Tests: ... Commit: ... Suite: ...
```

## Securite

Interdits stricts:

- secret dans le chat;
- secret dans Telegram;
- secret dans les logs;
- TOTP affiche ou demande;
- token/cookie/mot de passe affiche;
- terminal web public non protege;
- commande shell libre exposee au web;
- chemin projet non autorise;
- plus de slots actifs que la limite definie dans le registre.

Actions sensibles avec confirmation obligatoire:

- email reel;
- paiement/achat;
- suppression massive;
- migration de donnees;
- restore backup;
- reset destructif;
- changement DNS/domaine;
- scan couteux ou quota risque.

## Validation

Avant de finir une tache:

- verifier `git status`;
- lancer les tests pertinents;
- lancer `git diff --check` pour les changements texte/code;
- documenter si un test n'a pas pu etre lance;
- commit uniquement une etape coherente.

## Sortie finale

Reponse finale courte:

```text
Fait: ...
Tests: ...
Commit: ...
Suite: ...
```

Si rien n'a ete commit:

```text
Commit: aucun
```

Si un test n'a pas ete lance:

```text
Tests: non lance, raison ...
```

## Ameliorations communes a ajouter plus tard

- Commande unique `codex-slot <agent> <action>`.
- Sortie JSON pour afficher les statuts dans Nova.
- Verrou local par agent pour eviter deux actions concurrentes.
- Routeur Telegram prefixe par agent.
- Page web Nova `/dashboard/codex`.
- Terminal web protege par auth Nova + 2FA.
- Audit des actions start, stop, restart, message et goal.
