import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ApiManager from "../components/ApiManager";
import * as apiSvc from "../services/api";

jest.mock("../services/api");

describe("ApiManager component", () => {
    const mockCreateApi = jest.fn();
    const mockListApis = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (apiSvc.createApi as jest.Mock) = mockCreateApi;
        (apiSvc.listApis as jest.Mock) = mockListApis;
        // make listApis resolve so useEffect won't trigger unexpected async state updates
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

        // if you have a button that opens a form, otherwise the form is visible by default
        const openBtn = screen.queryByRole("button", { name: /create api|new api|add/i });
        if (openBtn) fireEvent.click(openBtn);

        const apiIdInput = screen.getByPlaceholderText(/api_id|api id/i);
        const nameInput = screen.getByPlaceholderText(/name/i);
        const baseUrlInput = screen.getByPlaceholderText(/base_url|base url/i);

        fireEvent.change(apiIdInput, { target: { value: "new-api" } });
        fireEvent.change(nameInput, { target: { value: "New API" } });
        fireEvent.change(baseUrlInput, { target: { value: "https://example.test" } });

        const saveBtn = screen.getByRole("button", { name: /save|create|add|add api/i });
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
