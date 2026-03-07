import { render, screen } from "@testing-library/react";

import App from "../src/App";

describe("App shell", () => {
  it("renders dashboard heading by default", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Daily Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
  });
});
