import { Router, Request, Response } from 'express';
import { DidacticMode, SubjectProfile } from '../../../../../packages/contracts/src/didactic.js';

// Hardcoded profiles for M07 as requested
const PROFILES: SubjectProfile[] = [
  {
    id: 'fisica',
    name: 'Fisica',
    focus: 'Derivazioni matematiche, ipotesi, condizioni al contorno e unità di misura',
    rules: [
      'Includi sempre il sistema di riferimento',
      'Verifica le dimensioni prima del risultato'
    ]
  },
  {
    id: 'matematica',
    name: 'Matematica',
    focus: 'Definizioni formali, teoremi, dimostrazioni rigorose',
    rules: [
      'Distingui ipotesi da tesi',
      'Esplicita ogni passaggio logico'
    ]
  },
  {
    id: 'chimica',
    name: 'Chimica',
    focus: 'Bilanciamento, cariche, stati, stechiometria',
    rules: [
      'Indica gli stati di aggregazione',
      'Bilancia sempre le reazioni'
    ]
  }
];

export function createDidacticRouter() {
  const router = Router();

  router.get('/profiles', (req: Request, res: Response) => {
    res.json(PROFILES);
  });

  router.get('/modes', (req: Request, res: Response) => {
    res.json(Object.values(DidacticMode));
  });

  // Mock endpoint to initiate a plan
  router.post('/plan', (req: Request, res: Response) => {
    const { sourceId, profileId, mode } = req.body;
    
    if (!sourceId || !profileId || !mode) {
      res.status(400).json({ error: 'Missing sourceId, profileId or mode' });
      return;
    }

    const profile = PROFILES.find(p => p.id === profileId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // Mock plan creation
    res.status(201).json({
      success: true,
      plan: {
        projectId: 'test-project',
        mode: mode as DidacticMode,
        subjectId: profile.id,
        chapters: ['Capitolo 1: Introduzione'],
        requirements: [
          {
            id: 'req_1',
            description: 'Concetti base',
            source: sourceId,
            priority: 'HIGH',
            expectedLevel: 'Universitario',
            chapter: 'Capitolo 1: Introduzione',
            developmentCriteria: 'Definizione e condizioni',
            completionEvidence: 'Blocchi indicati',
            status: 'PENDING'
          }
        ],
        estimatedCostEurMicro: 150000 // 0.15 EUR
      }
    });
  });

  return router;
}
