import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ApiManager from "../components/ApiManager";
import * as apiSvc from "../services/api";

jest.mock("../services/api");
// Sonner toast is used in ApiManager — mock it to avoid DOM side-effects
jest.mock("sonner", () => ({
    toast: { success: jest.fn(), error: jest.fn(), custom: jest.fn() },
}));
jest.mock("../components/ConfirmToast", () => ({
    showConfirmToast: jest.fn(),
}));

describe("ApiManager component", () => {
    const mockCreateApi = jest.fn();
    const mockListApis = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (apiSvc.createApi as jest.Mock) = mockCreateApi;
        (apiSvc.listApis as jest.Mock) = mockListApis;
        // Resolve immediately so useEffect reload() doesn't leave loading state
        mockListApis.mockResolvedValue([]);
    });

    test("creates an API and calls onApiCreated callback", async () => {
        const onApiCreated = jest.fn();

        mockCreateApi.mockResolvedValue({
            api_id: "new-api",
            name: "New API",
            base_url: "https://example.test",
        });

        render(<ApiManager onApiCreated={onApiCreated} />);

        // Wait for initial loading to complete so the form is interactive
        await waitFor(() => {
            expect(screen.queryByText(/loading apis/i)).not.toBeInTheDocument();
        });

        // Match actual placeholders defined in ApiManager.tsx
        const apiIdInput = screen.getByPlaceholderText(/user-service/i);
        const nameInput = screen.getByPlaceholderText(/user auth service/i);
        const baseUrlInput = screen.getByPlaceholderText(/api\.example\.com/i);

        fireEvent.change(apiIdInput, { target: { value: "new-api" } });
        fireEvent.change(nameInput, { target: { value: "New API" } });
        fireEvent.change(baseUrlInput, { target: { value: "https://example.test" } });

        // Submit button label is "Register API" in the actual component
        const saveBtn = screen.getByRole("button", { name: /register api/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(mockCreateApi).toHaveBeenCalledWith(
                expect.objectContaining({
                    api_id: "new-api",
                    name: "New API",
                    base_url: "https://example.test",
                })
            );
        });

        await waitFor(() => expect(onApiCreated).toHaveBeenCalledWith("new-api"));
    });
});
