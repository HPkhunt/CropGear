import React from 'react';
import { Link } from 'react-router-dom';

export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state card">
      <h2>{title}</h2>
      <p className="subtitle">{message}</p>
      {action && (
        <div className="empty-state-action">
          <Link to={action.to} className="button lg gradient">
            {action.label}
          </Link>
        </div>
      )}
    </div>
  );
}
