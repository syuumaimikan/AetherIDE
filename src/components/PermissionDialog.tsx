import React from 'react';
import { PermissionRequest } from '../types';
import { AlertTriangle, Check, ShieldAlert, X } from 'lucide-react';

interface PermissionDialogProps {
  request: PermissionRequest | null;
  onDecision: (requestId: string, decision: 'allow_once' | 'allow_always' | 'deny') => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  request,
  onDecision,
}) => {
  if (!request) return null;

  return (
    <div className="modal-overlay">
      <div className="permission-modal">
        <div className="permission-header">
          <ShieldAlert size={20} />
          <span>Security Authorization Required</span>
        </div>

        <div className="permission-body">
          <p>An autonomous agent is requesting permission to execute an operation:</p>
          <div className="permission-resource-box">
            <div><b>Category:</b> {request.category}</div>
            <div><b>Action:</b> {request.action}</div>
            <div><b>Resource:</b> {request.resource}</div>
          </div>
          <p style={{ marginTop: '10px', color: 'var(--accent-amber)' }}>
            <b>Risk Analysis:</b> {request.explanation}
          </p>
        </div>

        <div className="permission-actions">
          <button
            className="btn btn-danger"
            onClick={() => onDecision(request.request_id, 'deny')}
          >
            <X size={13} />
            <span>Deny</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onDecision(request.request_id, 'allow_once')}
          >
            <Check size={13} />
            <span>Allow Once</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onDecision(request.request_id, 'allow_always')}
          >
            <Check size={13} />
            <span>Always Allow</span>
          </button>
        </div>
      </div>
    </div>
  );
};
