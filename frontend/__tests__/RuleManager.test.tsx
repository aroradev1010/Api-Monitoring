import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import RuleManager from "@/components/RuleManager";
import { toast } from "sonner";
import { createRule, deleteRule, listRules } from "@/services/api";

// --- mock deps
jest.mock("sonner", () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock("@/services/api", () => ({
    createRule: jest.fn(),
    deleteRule: jest.fn(),
    listRules: jest.fn(),
}));
jest.mock("@/components/ConfirmToast", () => ({
    showConfirmToast: jest.fn(({ onConfirm }) => onConfirm && onConfirm()),
}));

describe("RuleManager", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("renders message when no api_id is given", () => {
        render(<RuleManager />);
        expect(screen.getByText(/select an api/i)).toBeInTheDocument();
    });

    test("loads and lists rules when api_id is given", async () => {
        (listRules as jest.Mock).mockResolvedValueOnce([
            { rule_id: "r1", name: "Latency high", type: "latency_gt", threshold: 1000 },
        ]);

        await act(async () => {
            render(<RuleManager api_id="api1" />);
        });

        expect(await screen.findByText("Latency high")).toBeInTheDocument();
    });

    test("creates a rule", async () => {
        (listRules as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        (createRule as jest.Mock).mockResolvedValueOnce({});

        render(<RuleManager api_id="api1" />);

        fireEvent.change(screen.getByPlaceholderText(/rule_id/i), { target: { value: "r1" } });
        fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: "My Rule" } });
        fireEvent.change(screen.getByPlaceholderText(/threshold/i), { target: { value: "500" } });

        const addBtn = screen.getByRole("button", { name: /add/i });

        await act(async () => {
            fireEvent.click(addBtn);
        });

        await waitFor(() => expect(createRule).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith("Rule created");
    });

    test("deletes a rule via confirm toast", async () => {
        (listRules as jest.Mock).mockResolvedValueOnce([
            { rule_id: "r1", name: "Old rule", type: "latency_gt", threshold: 1000 },
        ]);
        (deleteRule as jest.Mock).mockResolvedValueOnce({});

        await act(async () => {
            render(<RuleManager api_id="api1" />);
        });

        const delBtn = await screen.findByRole("button", { name: /delete/i });

        await act(async () => {
            fireEvent.click(delBtn);
        });

        await waitFor(() => expect(deleteRule).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith("Rule deleted");
    });
});
