# Parcours et API consommées

Gwel consomme l'API Recipe pour les fiches et catalogues, l'API Agent pour les
créations/enrichissements et leur progression, et Media pour les images.

Le catalogue charge 50 recettes par page. Les cartes demandent le variant
`card-v1`, une miniature WebP 480 × 270 produite sans IA. L'URL originale reste
le repli en cas d'échec et la fiche détaillée conserve l'image en pleine
qualité.

Les trois modes de création IA sont : texte collé, lien Web/image, et document
image/PDF. Le document est encodé vers l'agent ; l'OCR reste un service interne
et n'est jamais appelé directement depuis le navigateur.
