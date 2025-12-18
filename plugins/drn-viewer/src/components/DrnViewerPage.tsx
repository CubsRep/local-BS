import React, { useEffect, useMemo, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Typography, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, TableSortLabel,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Alert } from '@material-ui/lab';
import { useApi, discoveryApiRef, identityApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { Content, Header, Page } from '@backstage/core-components';

type DRNStatus = 'pending' | 'approved' | 'rejected';

interface DRNEntry {
  id: string;
  requesterName: string;
  projectId: string;
  status: DRNStatus;
  requestDate: string;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof DRNEntry;

const useStyles = makeStyles(theme => ({
  controlsRow: {
    marginBottom: theme.spacing(2),
  },
  headCell: {
    // Remove header “box” borders; keep a subtle bottom divider
    border: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    whiteSpace: 'nowrap',
  },
  bodyCell: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

export const DrnViewerPage = () => {
  const classes = useStyles();

  const [data, setData] = useState<DRNEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DRNStatus>('all');

  // Sorting
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('requestDate');

  const discoveryApi = useApi(discoveryApiRef);
  const identityApi = useApi(identityApiRef);
  const fetchApi = useApi(fetchApiRef);

  useEffect(() => {
    const fetchDRNData = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = await discoveryApi.getBaseUrl('drn-viewer');
        const { token } = await identityApi.getCredentials();

        const resp = await fetchApi.fetch(`${baseUrl}/DRN-list`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`Failed to fetch DRN list (${resp.status}) ${text}`);
        }

        const json = (await resp.json()) as DRNEntry[];
        setData(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchDRNData();
  }, [discoveryApi, identityApi, fetchApi]);

  // Filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter(item => {
      const matchesQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.requesterName.toLowerCase().includes(q) ||
        item.projectId.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [data, query, statusFilter]);

  // Sorting
  const getComparator = (ord: Order, key: OrderBy) => {
    return (a: DRNEntry, b: DRNEntry) => {
      let av: string | number = (a as any)[key];
      let bv: string | number = (b as any)[key];

      if (key === 'requestDate') {
        av = a.requestDate ? Date.parse(a.requestDate) : 0;
        bv = b.requestDate ? Date.parse(b.requestDate) : 0;
      } else {
        // Compare strings case-insensitively for text fields
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }

      if (av < bv) return ord === 'asc' ? -1 : 1;
      if (av > bv) return ord === 'asc' ? 1 : -1;
      return 0;
    };
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort(getComparator(order, orderBy));
    return arr;
  }, [filtered, order, orderBy]);

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Page themeId="home">
      <Header title="Outstanding DRN Requests" subtitle="Overview of all DRN onboarding requests." />
      <Content>
        <Grid container direction="column" spacing={3}>
          <Grid item className={classes.controlsRow}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  label="Search (ID, Requester, Project)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    label="Status"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          <Grid item>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className={classes.headCell} sortDirection={orderBy === 'id' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'id'}
                          direction={orderBy === 'id' ? order : 'asc'}
                          onClick={() => handleRequestSort('id')}
                        >
                          ID
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className={classes.headCell} sortDirection={orderBy === 'requesterName' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'requesterName'}
                          direction={orderBy === 'requesterName' ? order : 'asc'}
                          onClick={() => handleRequestSort('requesterName')}
                        >
                          Requester Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className={classes.headCell} sortDirection={orderBy === 'projectId' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'projectId'}
                          direction={orderBy === 'projectId' ? order : 'asc'}
                          onClick={() => handleRequestSort('projectId')}
                        >
                          Project ID
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className={classes.headCell} sortDirection={orderBy === 'status' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'status'}
                          direction={orderBy === 'status' ? order : 'asc'}
                          onClick={() => handleRequestSort('status')}
                        >
                          Status
                        </TableSortLabel>
                      </TableCell>
                      <TableCell className={classes.headCell} sortDirection={orderBy === 'requestDate' ? order : false}>
                        <TableSortLabel
                          active={orderBy === 'requestDate'}
                          direction={orderBy === 'requestDate' ? order : 'asc'}
                          onClick={() => handleRequestSort('requestDate')}
                        >
                          Request Date
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sorted.length === 0 ? (
                      <TableRow>
                        <TableCell className={classes.bodyCell} colSpan={5} align="center">
                          <Typography variant="body1">No DRN requests found.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sorted.map(row => (
                        <TableRow key={row.id} hover>
                          <TableCell className={classes.bodyCell}>{row.id}</TableCell>
                          <TableCell className={classes.bodyCell}>{row.requesterName}</TableCell>
                          <TableCell className={classes.bodyCell}>{row.projectId}</TableCell>
                          <TableCell className={classes.bodyCell}>{row.status}</TableCell>
                          <TableCell className={classes.bodyCell}>
                            {row.requestDate ? new Date(row.requestDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};