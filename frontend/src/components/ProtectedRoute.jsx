import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, user, requiredRole, redirectPath }) {
  if (!user) {
    return <Navigate to={redirectPath || '/portals'} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 text-2xl font-bold">
          403
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">RBAC Boundary Protection</h2>
        <p className="text-slate-400 max-w-md mb-6 text-sm">
          Access Denied. Your account role is <span className="text-amber-400 font-semibold">{user.role}</span>. This portal requires <span className="text-orange-400 font-semibold">{requiredRole}</span> permissions.
        </p>
        <button
          onClick={() => window.location.href = redirectPath || '/portals'}
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all"
        >
          Return to Portal Launchpad
        </button>
      </div>
    );
  }

  return children;
}
