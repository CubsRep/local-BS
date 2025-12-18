import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { TilesPage } from './TilesPage/TilesPage'

export const Router = () => (
  <Routes>
    <Route path="/" element={<TilesPage />} />
  </Routes>
);