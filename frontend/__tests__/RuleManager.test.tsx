import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

        render(<RuleManager api_id="api1" />);

        // Wait for loading to finish, then assert the rule is rendered
        expect(await screen.findByText("Latency high")).toBeInTheDocument();
    });

    test("creates a rule", async () => {
        (listRules as jest.Mock).mockResolvedValue([]);
        (createRule as jest.Mock).mockResolvedValueOnce({});

        render(<RuleManager api_id="api1" />);

        // Wait for loading to finish before interacting with the form
        await waitFor(() => {
            expect(screen.queryByText(/loading rules/i)).not.toBeInTheDocument();
        });

        // Match actual placeholders from RuleManager.tsx
        fireEvent.change(screen.getByPlaceholderText(/high-latency-alert/i), { target: { value: "r1" } });
        fireEvent.change(screen.getByPlaceholderText(/latency.*1000ms/i), { target: { value: "My Rule" } });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. 1000/i), { target: { value: "500" } });

        // Submit button label is "Create Rule" in the actual component
        const addBtn = screen.getByRole("button", { name: /create rule/i });
        fireEvent.click(addBtn);

        await waitFor(() => expect(createRule).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith("Rule created");
    });

    test("deletes a rule via confirm toast", async () => {
        (listRules as jest.Mock).mockResolvedValueOnce([
            { rule_id: "r1", name: "Old rule", type: "latency_gt", threshold: 1000 },
        ]);
        (deleteRule as jest.Mock).mockResolvedValueOnce({});

        render(<RuleManager api_id="api1" />);

        // Wait for loading to finish and rule to appear; then locate the Delete button
        await waitFor(() => {
            expect(screen.queryByText(/loading rules/i)).not.toBeInTheDocument();
        });

        // Button renders text "Delete" — find it once loading is done
        const delBtn = await screen.findByRole("button", { name: /^delete$/i });
        fireEvent.click(delBtn);

        await waitFor(() => expect(deleteRule).toHaveBeenCalled());
        expect(toast.success).toHaveBeenCalledWith("Rule deleted");
    });
});
