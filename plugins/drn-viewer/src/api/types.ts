export type Drn = {
    drn: string;
    business_unit: string;
    requester_email: string;
    architecture_review: string;
    approved: boolean;
    state: 'pending' | 'rejected' | 'approved';
    created_at?: string;
}