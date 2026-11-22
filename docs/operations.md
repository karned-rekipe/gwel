# Exploitation

Une validation complète ouvre la liste des recettes, charge les miniatures,
utilise « Charger plus », consulte une fiche, puis exerce séparément une
création texte et une création document. Un simple `200` sur `/healthz` ne
valide pas les proxies ni les backends.

En cas d'image absente, vérifier d'abord la réponse du sélecteur `card-v1`, puis
la cible WebP et enfin l'original. Un échec de miniature doit automatiquement
retomber sur l'original.

Le rollback consiste à rétablir le digest Gwel précédent. Les données métier et
les médias ne sont pas modifiés par ce retour arrière.
