import React from 'react';
import {
        Page,
        Header,
        Content,
        ContentHeader,
        InfoCard,
    
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { drnViewerApiRef } from '../../api/DrnViewerApi';
import {
        Box,
        Button,
        Radio,
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableRow,
        Typography,
    
} from '@material-ui/core';
import { useLocation } from 'react-router-dom';
import { Drn } from '../../api/types';

function useQueryParam(name: string) {
        const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search).get(name), [search, name]);
}

export const DrnReviewPage = () => {
        const api = useApi(drnViewerApiRef);
        const includeApproved = useQueryParam('includeApproved') === 'true';
        const [rows, setRows] = React.useState<Drn[]>([]);
        const [loading, setLoading] = React.useState(true);
        const [selected, setSelected] = React.useState<string | null>(null);
        const [submitting, setSubmitting] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);
        const load = React.useCallback(async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await api.listPending({ includeApproved });
            setRows(data.documents);
            setSelected(null);
        } catch (e: any) {
                setError(e?.message ?? 'Failed to load DRNs');
        } finally {
                setLoading(false);
        }
    }, [api, includeApproved]);
    React.useEffect(() => {
            load();
    
    }, [load]);
    const submit = async (decision: 'approve' | 'reject') => {
            if (!selected) return;
            setSubmitting(true);
            setError(null);
            try {
                await api.decide(selected, decision);
                await load();
        } catch (e: any) {
                setError(e?.message ?? 'Failed to submit decision');
        } finally {
                setSubmitting(false);
        }
    };
    return (
            <Page themeId="tool">
                <Header title="DRN Review" subtitle="Select a DRN and approve/reject" />
                <Content>
                    <ContentHeader title="Pending DRNs">
                        <Box display="flex" gridGap={8}>
                            <Button
                                variant="contained"
                                color="primary"
                                disabled={!selected || submitting}
                                onClick={() => submit('approve')}
                        >
                            Approve
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            disabled={!selected || submitting}
                            onClick={() => submit('reject')}
                        >
                            Reject
                        </Button>
                    </Box>
                </ContentHeader>
                <InfoCard>
                    {error && (
                            <Box mb={2}>
                                <Typography color="error">{error}</Typography>
                            </Box>
                    )}
                    {loading ? (
                            <Typography>Loading…</Typography>    
                    ) : rows.length === 0 ? (
                            <Typography>No DRNs found.</Typography>    
                    ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={48} />
                                        <TableCell>DRN</TableCell>
                                        <TableCell>Business Unit</TableCell>
                                        <TableCell>Requester</TableCell>
                                        <TableCell>Architecture Review</TableCell>
                                        <TableCell>State</TableCell>
                                        <TableCell>Created At</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map(r => (
                                        <TableRow key={r.drn} hover>
                                            <TableCell>
                                                <Radio
                                                    checked={selected === r.drn}
                                                    onChange={() => setSelected(r.drn)}
                                            />
                                        </TableCell>
                                        <TableCell>{r.drn}</TableCell>
                                        <TableCell>{r.business_unit}</TableCell>
                                        <TableCell>{r.requester_email}</TableCell>
                                        <TableCell>{r.architecture_review}</TableCell>
                                        <TableCell>{r.state}</TableCell>
                                        <TableCell>{r.created_at ?? '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </InfoCard>
            </Content>
        </Page>
    );
};
