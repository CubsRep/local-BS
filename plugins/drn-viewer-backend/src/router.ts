import express from 'express';
import Router from 'express-promise-router';
import { LoggerService } from '@backstage/backend-plugin-api';
import { z } from 'zod';

type Drn = {
  drn: string;
  business_unit: string;
  requester_email: string;
  architecture_review: string;
  approved: boolean;
  state: 'pending' | 'rejected' | 'approved';
  created_at?: string;
};

const MOCK: Drn[] = [
  {
    drn: 'DRN001',
    business_unit: 'Finance',
    requester_email: 'john.doe@example.com',
    architecture_review: 'Pending',
    approved: false,
    state: 'pending',
    created_at: '2024-01-15',
  },
  {
    drn: 'DRN002',
    business_unit: 'Engineering',
    requester_email: 'jane.smith@example.com',
    architecture_review: 'completed',
    approved: true,
    state: 'approved',
    created_at: '2025-06-12',
  },
  {
    drn: 'DRN003',
    business_unit: 'Itsvc',
    requester_email: 'chris.w@example.com',
    architecture_review: 'In Progress',
    approved: false,
    state: 'rejected',
    created_at: '2024-08-12',
  },
  {
    drn: 'DRN004',
    business_unit: 'Cloud',
    requester_email: 'andy.q@example.com',
    architecture_review: 'In Progress',
    approved: false,
    state: 'pending',
    created_at: '2025-03-19',
  },
  {
    drn: 'DRN005',
    business_unit: 'Engineering',
    requester_email: 'mike.m@example.com',
    architecture_review: 'completed',
    approved: true,
    state: 'approved',
    created_at: '2025-11-11',
  },
];

export async function createRouter({
  logger,
}: {
  logger: LoggerService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  // GET /api/drn-viewer/pending?includeApproved=true
  router.get('/pending', async (req, res) => {
    const includeApproved = req.query.includeApproved === 'true';
    const documents = includeApproved ? MOCK : MOCK.filter(d => !d.approved);

    res.json({ documents });
  });

  // POST /api/drn-viewer/decision  { drn: "DRN001", decision: "approve" | "reject" }
  router.post('/decision', async (req, res) => {
    const body = z
      .object({
        drn: z.string(),
        decision: z.enum(['approve', 'reject']),
      })
      .parse(req.body);

    logger.info(`DRN decision received: ${body.drn} => ${body.decision}`);

    // TODO: Replace this with Firestore update / workflow trigger
    res.json({ ok: true });
  });

  return router;
}
