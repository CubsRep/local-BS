import { TemplateExample } from '@backstage/plugin-scaffolder-node';
import yaml from 'yaml';

export const examples: TemplateExample[] = [
    {
        description: 'Runs an example action',
        example: yaml.stringify({ 
            steps: [
                {
                    action: 'drn:pending:list',
                    input: {
                        includeApproved: true
                    },
                    name: 'List pending DRN documents'
                }
            ]
        })
    }
]