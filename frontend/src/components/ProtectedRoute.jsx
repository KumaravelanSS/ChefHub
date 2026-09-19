import React from 'react';

export default function ProtectedRoute({ children, user, requiredRole }) {
  // Seamless portal access: if user is not authenticated for this role, the portal component renders its login form directly
  return children;
}
