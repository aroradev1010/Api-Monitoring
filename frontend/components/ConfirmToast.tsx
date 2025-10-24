// src/components/ConfirmToast.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";

/** Options for the confirm toast. */
export type ConfirmToastOptions = {
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => Promise<void> | void;
    onCancel?: () => void;
    duration?: number;
    actionsClassName?: string;
};

export function showConfirmToast(opts: ConfirmToastOptions) {
    const {
        title,
        description,
        confirmLabel = "Confirm",
        cancelLabel = "Cancel",
        onConfirm,
        onCancel,
        duration = 10000,
        actionsClassName,
    } = opts;

    toast.custom(
        // `tid` is the toast id (string | number) provided by sonner
        (tid: string | number) => {
            // local component to allow internal state (busy)
            function ToastContent() {
                const [busy, setBusy] = useState(false);

                return (
                    <div
                        className="max-w-xl rounded-md bg-white shadow-md p-3 border"
                        role="alert"
                        aria-live="polite"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{title}</div>
                                {description && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {description}
                                    </div>
                                )}
                            </div>

                            <div className={`flex gap-2 ${actionsClassName ?? ""}`}>
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-60"
                                    onClick={async () => {
                                        try {
                                            setBusy(true);
                                            // dismiss the toast UI immediately
                                            toast.dismiss(tid);
                                            await Promise.resolve(onConfirm());

                                        } catch (err: any) {
                                            toast.error(err?.message ?? "Action failed");
                                        } finally {
                                            setBusy(false);
                                        }
                                    }}
                                    disabled={busy}
                                >
                                    {busy ? "Working…" : confirmLabel}
                                </button>

                                <button
                                    type="button"
                                    className="px-3 py-1 border rounded text-sm"
                                    onClick={() => {
                                        toast.dismiss(tid);
                                        onCancel?.();
                                    }}
                                >
                                    {cancelLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            return <ToastContent />;
        },
        {
            duration,
        }
    );
}
