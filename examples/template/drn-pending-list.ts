import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { RootConfigService } from '@backstage/backend-plugin-api';
import { z } from 'zod';

type MockDrnDocument = {
  drn: string;
  business_unit: string;
  requester_email: string;
  architecture_review: string;
  approved: boolean;
  created_at?: string;
};

/**
 * Creates a new `drn:pending:list` scaffolder action.
 *
 * @public
 */
export const createDrnPendingListAction = (config: RootConfigService) => {
  // Get backstage base url and approval template path from app-config.yaml
  const backstageUrl = config.getString('app.baseUrl');
  const approveTemplatePath = config.getString(
    'scaffolder.templates.drnApproval.path',
  );

  return createTemplateAction({
    id: 'drn:pending:list',
    description: 'Retrieves a list of pending DRNs that are not yet approved.',
    schema: {
      output: z.object({
        documents: z
          .array(
            z.object({
              drn: z.string(),
              business_unit: z.string(),
              requester_email: z.string(),
              architecture_review: z.string(),
              action: z.string(),
            }),
          )
          .describe('An array of DRN documents from the collection'),
        status: z.string().describe('The status of the action'),
      }),
    },
    async handler(ctx) {
      ctx.logger.info('Fetching pending DRN documents.');

      const mockData: MockDrnDocument[] = [
        {
          drn: 'DRN001',
          business_unit: 'Finance',
          requester_email: 'john.doe@example.com',
          architecture_review: 'Pending',
          approved: false,
          created_at: '2024-01-15',
        },
        {
          drn: 'DRN002',
          business_unit: 'Engineering',
          requester_email: 'jane.smith@example.com',
          architecture_review: 'In Progress',
          approved: false,
        },
        {
          drn: 'DRN003',
          business_unit: 'HR',
          requester_email: 'bob.wilson@example.com',
          architecture_review: 'Completed',
          approved: true, // This will be filtered out
        },
      ];

      try {
          const pendingDrns = mockData
            .filter(doc => !doc.approved && doc.drn)
            .map(doc => {
              // construct url link to open "DRN Onboard Template" in a new tab with drn# appended
              const approveUrl = `${backstageUrl}${approveTemplatePath}?drn=${encodeURIComponent(
                doc.drn,
              )}`;
              return {
                drn: doc.drn,
                business_unit: doc.business_unit || '',
                requester_email: doc.requester_email || '',
                architecture_review: doc.architecture_review || '',
                action: `[Approve](${approveUrl})`,
              };
            });
            ctx.logger.info(
                        `Fetched and processed ${pendingDrns.length} pending DRN documents successfully.`,
                    );
            ctx.output('documents', pendingDrns);
            ctx.output('status', 'SUCCESS');
        } catch (error) {
            ctx.logger.error ('Failed to fetch',error);
            ctx.output('status','FAILED');
            throw error;
        }
      }
  });
};
