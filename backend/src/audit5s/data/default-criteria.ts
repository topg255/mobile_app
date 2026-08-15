import { Pilier5S } from '../entities/critere5s.entity';

export interface DefaultCritere {
  pilier: Pilier5S;
  label: string;
  points: number;
  ordre: number;
}

export const PILIER_LABELS: Record<Pilier5S, string> = {
  [Pilier5S.S1]: '1S — Trier',
  [Pilier5S.S2]: '2S — Ranger',
  [Pilier5S.S3]: '3S — Nettoyer',
  [Pilier5S.S4]: '4S — Standardiser',
  [Pilier5S.S5]: '5S — Pérenniser',
};

export const DEFAULT_CRITERIA: DefaultCritere[] = [
  // S1 — Trier (5pts × 4 = 20pts)
  { pilier: Pilier5S.S1, label: 'Seuls les outils nécessaires sont présents au poste', points: 5, ordre: 1 },
  { pilier: Pilier5S.S1, label: 'Aucun objet inutile ou cassé sur la ligne', points: 5, ordre: 2 },
  { pilier: Pilier5S.S1, label: 'Les pièces non conformes sont isolées et identifiées', points: 5, ordre: 3 },
  { pilier: Pilier5S.S1, label: 'Zone de quarantaine définie et respectée', points: 5, ordre: 4 },

  // S2 — Ranger (5pts × 3 + 5pts = 20pts)
  { pilier: Pilier5S.S2, label: 'Chaque outil a un emplacement défini et balisé', points: 5, ordre: 1 },
  { pilier: Pilier5S.S2, label: 'Les emplacements sont visibles (silhouettes, couleurs)', points: 5, ordre: 2 },
  { pilier: Pilier5S.S2, label: 'Aucun outil ne traîne hors de son emplacement', points: 5, ordre: 3 },
  { pilier: Pilier5S.S2, label: 'Les câbles et fils sont rangés et non enchevêtrés', points: 5, ordre: 4 },

  // S3 — Nettoyer (5+5+4+6 = 20pts)
  { pilier: Pilier5S.S3, label: 'Le poste est propre et sans déchets visibles', points: 5, ordre: 1 },
  { pilier: Pilier5S.S3, label: 'Les machines sont nettoyées et sans huile/poussière', points: 5, ordre: 2 },
  { pilier: Pilier5S.S3, label: 'Le sol autour de la ligne est dégagé et propre', points: 4, ordre: 3 },
  { pilier: Pilier5S.S3, label: 'Aucune fuite ou trace suspecte sur les équipements', points: 6, ordre: 4 },

  // S4 — Standardiser (5pts × 4 = 20pts)
  { pilier: Pilier5S.S4, label: 'Les procédures 5S sont affichées et visibles', points: 5, ordre: 1 },
  { pilier: Pilier5S.S4, label: 'La checklist de poste est présente et à jour', points: 5, ordre: 2 },
  { pilier: Pilier5S.S4, label: 'Les standards de rangement sont respectés par tous', points: 5, ordre: 3 },
  { pilier: Pilier5S.S4, label: 'Les anomalies sont signalées selon le protocole', points: 5, ordre: 4 },

  // S5 — Pérenniser (6+4+5+5 = 20pts)
  { pilier: Pilier5S.S5, label: "L'agent applique les 5S sans rappel superviseur", points: 6, ordre: 1 },
  { pilier: Pilier5S.S5, label: "Le registre d'anomalies est complété à jour", points: 4, ordre: 2 },
  { pilier: Pilier5S.S5, label: 'Aucune récidive de non-conformité 5S ce mois', points: 5, ordre: 3 },
  { pilier: Pilier5S.S5, label: "L'agent a suivi la formation 5S récemment", points: 5, ordre: 4 },
];
