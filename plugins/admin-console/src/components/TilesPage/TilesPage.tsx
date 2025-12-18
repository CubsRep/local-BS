import React from 'react';
import { Page, Header, Content, InfoCard, Link } from '@backstage/core-components';
import { Grid, CardActionArea, CardContent, Typography } from '@material-ui/core';
import { useNavigate } from 'react-router-dom';

type ViewTile = {
  title: string;
  description?: string;
  to: string; // target route (another plugin or page)
};

const mockViews: ViewTile[] = [
  { title: 'ViewDrns', description: 'Browse all DRNs with status', to: '/drn-viewer' },
  // { title: 'TechDocs', description: 'Read documentation', to: '/docs' },
  // add more tiles as above
];

export const TilesPage = () => {
  const navigate = useNavigate();

  return (
    <Page themeId="tool">
      <Header title="Admin Console" subtitle="Administrative tools and views" />
      <Content>
        <Grid container spacing={3}>
          {mockViews.map(view => (
            <Grid item xs={12} sm={6} md={4} key={view.title}>
              <InfoCard title={view.title} divider={false}>
                <CardActionArea onClick={() => navigate(view.to)}>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      {view.description ?? 'Open'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <div style={{ marginTop: 8 }}>
                  <Link to={view.to}>Open</Link>
                </div>
              </InfoCard>
            </Grid>
          ))}
        </Grid>
      </Content>
    </Page>
  );
};