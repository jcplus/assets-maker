"use client";

import { Modal } from "@/components/Modal";

/**
 * 替代浏览器原生 confirm/alert 的弹窗。
 * - 含 onConfirm 时为确认对话框（取消 / 确认）
 * - 仅 onClose 时为提示框（单个“知道了”按钮）
 */
export function ConfirmModal({
  title = "确认",
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger,
  onConfirm,
  onClose,
}: {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          {onConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded border border-border px-3 py-1.5 hover:bg-panel"
              >
                {cancelText}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`cursor-pointer rounded px-4 py-1.5 font-medium text-white ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-accent"
                }`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="cursor-pointer rounded bg-accent px-4 py-1.5 font-medium text-white"
            >
              知道了
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
