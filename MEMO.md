# MEMO — Pense-bête Git

Je travaille sur **2 ordinateurs différents**. Pour éviter les conflits, toujours synchroniser.

## 🟢 En début de session — récupérer les derniers changements

```bash
git pull
```

## 🔴 En fin de session — envoyer mon travail

```bash
git add .
git commit -m "Description de ce que j'ai fait"
git push
```

---

💡 **Règle d'or** : `git pull` AVANT de commencer, `git push` AVANT de fermer.
Si j'oublie le pull et que git refuse le push, faire d'abord `git pull` puis re-`git push`.
