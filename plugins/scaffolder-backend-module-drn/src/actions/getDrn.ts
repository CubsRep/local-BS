
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { examples } from './getDrn.examples'

type MockDrnDocument = {
    drn: string;
    business_unit: string;
    requester_email: string;
    architecture_review: string;
    approved: boolean;
    state: 'pending' | 'rejected' | 'approved';
    created_at?: string;
};

export function getDrnAction() {

    return createTemplateAction({
        id: 'drn:pending:list',
        description: 'Lists pending DRN documents',
        examples,
        // 👇 IMPORTANT: Wrap schemas in a function that receives z
        schema: {
            input: z =>
                z.object({
                    includeApproved: z.boolean().optional().default(false),
                })
                    .optional(),
            output: z =>
                z.object({
                    documents: z.array(
                        z.object({
                            drn: z.string(),
                            business_unit: z.string(),
                            requester_email: z.string().email(),
                            architecture_review: z.string(),
                            approved: z.boolean(),
                            state: z.enum(['pending','approved','rejected']),
                            created_at: z.string().optional(),
                        }),
                    ),
                }),
        },

        async handler(ctx) {
            ctx.logger.info('Fetching pending DRN documents.');

            const mockData: MockDrnDocument[] =
                [
                    {
                        "drn": "DRN001",
                        "business_unit": "Finance",
                        "requester_email": "john.doe@example.com",
                        "architecture_review": "Pending",
                        "approved": false,
                        "state": "pending",
                        "created_at": "2024-01-15"
                    },
                    {
                        "drn": "DRN002",
                        "business_unit": "Engineering",
                        "requester_email": "jane.smith@example.com",
                        "architecture_review": "completed",
                        "approved": true,
                        "state": "approved",
                        "created_at": "2025-06-12"
                    },
                    {
                        "drn": "DRN003",
                        "business_unit": "Itsvc",
                        "requester_email": "chris.w@example.com",
                        "architecture_review": "In Progress",
                        "approved": false,
                        "state": "rejected",
                        "created_at": "2024-08-12"
                    },
                    {
                        "drn": "DRN004",
                        "business_unit": "Cloud",
                        "requester_email": "andy.q@example.com",
                        "architecture_review": "In Progress",
                        "approved": false,
                        "state": "pending",
                        "created_at": "2025-03-19"
                    },
                    {
                        "drn": "DRN005",
                        "business_unit": "Engineering",
                        "requester_email": "mike.m@example.com",
                        "architecture_review": "completed",
                        "approved": true,
                        "state": "approved",
                        "created_at": "2025-11-11"
                    }
                ];


            const includeApproved =
                (ctx.input as { includeApproved?: boolean } | undefined)?.includeApproved ??
                false;

            const documents = includeApproved
                ? mockData
                : mockData.filter(d => !d.approved);

            // Output must match your output schema keys
            ctx.output('documents', documents);

        },
    })
};
