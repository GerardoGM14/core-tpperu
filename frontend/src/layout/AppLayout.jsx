import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ROUTE_BY_ID } from '../routes';

export default function AppLayout() {
  const location = useLocation();
  const id = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
  const route = ROUTE_BY_ID[id];
  const crumb = route?.crumb ?? ['Travesía'];

  return (
    <div className="app">
      <Sidebar />
      <div className="main" data-screen-label={id}>
        <Topbar crumb={crumb} />
        <Outlet />
      </div>
    </div>
  );
}
