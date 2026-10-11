import React, { useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Ban, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';

export default function CancelOrderLoadingModal({ cancellingProgress, onClose }) {
  if (!cancellingProgress) return null;

  const {
    order_id,
    customer_name = 'Customer',
    total_amount = '0.00',
    reason = 'Kitchen Constraints',
    step = 'CANCEL_REQUEST',
    statusText = 'Processing order cancellation...',
    errorMessage
  } = cancellingProgress;

  const isSuccess = step === 'SUCCESS';
  const isError = step === 'ERROR';

  // Calculate percentage
  let progressPercent = 25;
  if (step === 'RESTOCKING_MENU') progressPercent = 50;
  if (step === 'REFUNDING_ESCROW') progressPercent = 75;
  if (step === 'UPDATING_QUEUE') progressPercent = 90;
  if (step === 'SUCCESS') progressPercent = 100;

  // Auto-close after success
  useEffect(() => {
    if (isSuccess && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  const stages = [
    { id: 'CANCEL_REQUEST', label: 'Order Cancellation Request', desc: 'Alerting kitchen gateway & rider dispatch' },
    { id: 'RESTOCKING_MENU', label: 'Portion Stock Restoration', desc: 'Returning prepared portions back to menu inventory' },
    { id: 'REFUNDING_ESCROW', label: '100% Escrow Refund Credit', desc: `Refunding ₹${total_amount} to ${customer_name}` },
    { id: 'UPDATING_QUEUE', label: 'Synchronizing Kitchen UI', desc: 'Refreshing live order queue & availability tables' }
  ];

  const getStageStatus = (stageId) => {
    const order = ['CANCEL_REQUEST', 'RESTOCKING_MENU', 'REFUNDING_ESCROW', 'UPDATING_QUEUE', 'SUCCESS'];
    const currentIndex = order.indexOf(step);
    const stageIndex = order.indexOf(stageId);

    if (isError) return 'error';
    if (stageIndex < currentIndex || isSuccess) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 w-full max-w-md shadow-2xl bg-white dark:bg-slate-900 space-y-5 text-center">
        {/* Top Icon Badge */}
        <div className="flex justify-center">
          {isSuccess ? (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          ) : isError ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/25 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <AlertCircle className="w-9 h-9" />
            </div>
          ) : (
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-rose-500/20 animate-ping duration-1000"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Title & Status */}
        <div className="space-y-1.5">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-sm ${
            isSuccess
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : isError
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
          }`}>
            {isSuccess ? 'Cancellation Finalized' : isError ? 'Cancellation Error' : 'Escrow Refund & UI Sync'}
          </span>

          <h3 className="text-xl font-black font-display text-slate-900 dark:text-white">
            {isSuccess
              ? `Order #${order_id} Cancelled`
              : isError
              ? `Failed to Cancel #${order_id}`
              : `Cancelling Order #${order_id}...`}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {statusText}
          </p>

          {reason && !isSuccess && !isError && (
            <p className="text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
              "{reason}"
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isSuccess
                ? 'bg-emerald-500'
                : isError
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step-by-Step Flow List */}
        <div className="text-left space-y-2 bg-slate-50/80 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
          {stages.map((stg) => {
            const status = getStageStatus(stg.id);
            return (
              <div key={stg.id} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {status === 'completed' ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                  ) : status === 'active' ? (
                    <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px]">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]">
                      •
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold truncate ${
                      status === 'completed'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : status === 'active'
                        ? 'text-slate-900 dark:text-white font-extrabold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {stg.label}
                    </span>
                    {status === 'completed' && (
                      <span className="text-[10px] text-emerald-500 font-extrabold uppercase">Done</span>
                    )}
                    {status === 'active' && (
                      <span className="text-[10px] text-rose-500 font-extrabold uppercase animate-pulse">Running</span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight truncate">
                    {stg.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions Button */}
        {(isSuccess || isError) && (
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95 ${
              isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white'
            }`}
          >
            {isSuccess ? 'Done • Close' : 'Dismiss'}
          </button>
        )}
      </div>
    </div>
  );
}
