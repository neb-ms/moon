import { fireEvent, render } from "@testing-library/react";

import CalendarGrid, { type CalendarPhaseDay } from "../src/components/CalendarGrid";

function buildMonthDays(month: string): CalendarPhaseDay[] {
  const [yearToken, monthToken] = month.split("-");
  const year = Number(yearToken);
  const monthIndex = Number(monthToken) - 1;
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return Array.from({ length: dayCount }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");

    return {
      date: `${month}-${day}`,
      phaseName: "Full Moon",
      illuminationPct: 100,
      zodiacSign: "Leo",
    };
  });
}

function getDayCell(container: HTMLElement, date: string): HTMLButtonElement {
  const cell = container.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`);

  if (!cell) {
    throw new Error(`Missing calendar cell for ${date}`);
  }

  return cell;
}

describe("CalendarGrid", () => {
  it("renders personality empty state when no days are provided", () => {
    const { getByTestId, getByText } = render(<CalendarGrid days={[]} month="2026-08" />);

    expect(getByTestId("calendar-empty-state")).toBeInTheDocument();
    expect(getByText("No Moon Markers Yet")).toBeInTheDocument();
  });

  it("renders month boundary days before and after the current month", () => {
    const { container } = render(<CalendarGrid days={buildMonthDays("2026-08")} month="2026-08" />);

    const dayButtons = container.querySelectorAll("button[data-date]");
    expect(dayButtons).toHaveLength(42);

    expect(getDayCell(container, "2026-07-26")).toHaveAttribute("data-current-month", "false");
    expect(getDayCell(container, "2026-08-01")).toHaveAttribute("data-current-month", "true");
    expect(getDayCell(container, "2026-09-05")).toHaveAttribute("data-current-month", "false");
  });

  it("applies selected and today states to matching day cells", () => {
    const { container } = render(
      <CalendarGrid
        days={buildMonthDays("2026-08")}
        month="2026-08"
        selectedDate="2026-08-14"
        todayDate="2026-08-17"
      />,
    );

    const selectedCell = getDayCell(container, "2026-08-14");
    const todayCell = getDayCell(container, "2026-08-17");

    expect(selectedCell).toHaveAttribute("data-selected", "true");
    expect(selectedCell).toHaveAttribute("aria-pressed", "true");
    expect(todayCell).toHaveAttribute("data-today", "true");
    expect(getDayCell(container, "2026-08-18")).toHaveAttribute("data-today", "false");
  });

  it("calls onSelectDate with the clicked ISO date", () => {
    const onSelectDate = vi.fn();
    const { container } = render(
      <CalendarGrid days={buildMonthDays("2026-08")} month="2026-08" onSelectDate={onSelectDate} />,
    );

    fireEvent.click(getDayCell(container, "2026-08-21"));

    expect(onSelectDate).toHaveBeenCalledWith("2026-08-21");
    expect(onSelectDate).toHaveBeenCalledTimes(1);
  });
});
