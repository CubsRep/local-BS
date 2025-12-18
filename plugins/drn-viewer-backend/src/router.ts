import { HttpAuthService,LoggerService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { todoListServiceRef } from './services/TodoListService';

// Define the shape of your DRN data
export type DRNStatus = 'pending' | 'approved' | 'rejected';

export interface DRNEntry {
  id: string;
  requesterName: string;
  projectId: string;
  status: DRNStatus;
  requestDate: string; // ISO string preferred
  // ... any other metadata from your Firestore documents
}

export interface RouterOptions {
  logger: LoggerService;
}

// In-memory mock data for local testing
const MOCK_DRN_ENTRIES: DRNEntry[] = [
  {
    id: 'drn-001',
    requesterName: 'Alice Johnson',
    projectId: 'proj-123',
    status: 'pending',
    requestDate: '2025-10-10T12:00:00.000Z',
  },
  {
    id: 'drn-002',
    requesterName: 'Bob Smith',
    projectId: 'proj-456',
    status: 'approved',
    requestDate: '2025-09-28T09:30:00.000Z',
  },
  {
    id: 'drn-003',
    requesterName: 'Carol Lee',
    projectId: 'proj-789',
    status: 'rejected',
    requestDate: '2025-10-01T16:15:00.000Z',
  },
  {
    id: 'drn-004',
    requesterName: 'Carol Lee',
    projectId: 'proj-999',
    status: 'rejected',
    requestDate: '2025-10-01T16:15:00.000Z',
  },
  {
    id: 'drn-005',
    requesterName: 'Vasa Lee',
    projectId: 'proj-100',
    status: 'pending',
    requestDate: '2025-10-01T16:15:00.000Z',
  },
  {
    id: 'drn-006',
    requesterName: 'Mike Mo',
    projectId: 'proj-223',
    status: 'approved',
    requestDate: '2025-10-01T16:15:00.000Z',
  }
];

type RouterDeps = {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  todoList: typeof todoListServiceRef.T;
};

function isDrnStatus(value: unknown): value is DRNStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}

export async function createRouter(options: RouterDeps): Promise<express.Router> {
    const { logger } = options;
    const router = Router();
    router.use(express.json());

    // GET /api/drn-viewer/DRN-list
    router.get('/DRN-list', async (req, res) => {
      logger.info('Received request for DRN list (mock).');
  
      try {
        // Optional: filter by status via ?status=pending|approved|rejected
        const { status } = req.query;
        let data = MOCK_DRN_ENTRIES;
  
        if ( typeof status === 'string') {
            if (!isDrnStatus(status)) {
            throw new Error(`Invalid status value: ${status}`);
          }
            data = data.filter(d => d.status === status);
        }
  
        // Optional: simulate network delay
        // await new Promise(r => setTimeout(r, 250));
  
        res.json(data);
      } catch (error: any) {
        logger.error(`Failed to return mock DRN list: ${error?.message ?? error}`);
        res.status(500).json({ error: 'Failed to retrieve mock DRN data' });
      }
    });
  
    // Basic health check
    router.get('/health', (_req, res) => {
      res.send({ status: 'ok' });
    });
  
    return router;
}