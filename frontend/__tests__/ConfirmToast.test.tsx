/**
 * frontend/__tests__/ConfirmToast.test.tsx
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toaster } from "sonner";
import { showConfirmToast } from "@/components/ConfirmToast";
import { act } from "react";

describe("ConfirmToast (showConfirmToast)", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        jest.clearAllMocks();
    });

    test("renders message and calls onConfirm callback when confirm button clicked", async () => {
        const onConfirm = jest.fn().mockResolvedValue(undefined);
        const onCancel = jest.fn();

        render(<Toaster />);

        act(() => {
            showConfirmToast({
                title: "Delete API?",
                description: "Are you sure you want to delete?",
                confirmLabel: "Delete",
                cancelLabel: "No",
                onConfirm,
                onCancel,
                duration: 10000,
            });
        });

        // confirm the toast appears
        expect(await screen.findByText(/delete api\?/i)).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete\?/i)).toBeInTheDocument();

        // click confirm inside act and await any async resolves
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /delete/i }));
            // allow the onConfirm promise microtask to resolve
            await Promise.resolve();
        });

        expect(onConfirm).toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
    });
});
