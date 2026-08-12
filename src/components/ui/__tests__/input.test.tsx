import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Input } from "@/components/ui/input";

describe("Input primitive", () => {
  it("renders an accessible textbox", () => {
    render(<Input placeholder="Type here" />);

    expect(screen.getByRole("textbox").getAttribute("placeholder")).toBe(
      "Type here",
    );
  });

  it("forwards refs to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("accepts user input", async () => {
    render(<Input aria-label="Name" />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    await userEvent.type(input, "Ada");

    expect(input.value).toBe("Ada");
  });
});
