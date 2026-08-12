import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card primitive", () => {
  it("renders header, title, content and footer", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card title</CardTitle>
        </CardHeader>
        <CardContent>Card content</CardContent>
        <CardFooter>Card footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Card title")).not.toBeNull();
    expect(screen.getByText("Card content")).not.toBeNull();
    expect(screen.getByText("Card footer")).not.toBeNull();
  });
});
