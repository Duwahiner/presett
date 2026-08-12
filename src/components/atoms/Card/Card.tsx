import {
  Card as UICard,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { CardProps } from "./Card.types";

export function Card({ title, children, className }: CardProps) {
  return (
    <UICard className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </UICard>
  );
}
