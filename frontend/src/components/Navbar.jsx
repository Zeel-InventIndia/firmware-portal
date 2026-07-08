import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="topbar">
      <div className="brand">
        <span className="chip" />
        FIRMWARE PORTAL
      </div>
      <div className="nav-links">
        <NavLink to="/projects" className={({ isActive }) => (isActive ? 'active' : '')}>
          Projects
        </NavLink>
        <NavLink to="/tickets" className={({ isActive }) => (isActive ? 'active' : '')}>
          Tickets
        </NavLink>
        {user.role === 'admin' && (
          <NavLink to="/admin/tickets" className={({ isActive }) => (isActive ? 'active' : '')}>
            Manage Tickets
          </NavLink>
        )}
        {user.role === 'admin' && (
          <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : '')}>
            Users
          </NavLink>
        )}
      </div>
      <div className="user-badge">
        <span className={`role-tag ${user.role}`}>{user.role}</span>
        {user.name}
        <button
          className="link"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
