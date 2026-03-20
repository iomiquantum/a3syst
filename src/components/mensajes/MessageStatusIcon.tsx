import { Check, CheckCheck, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
  size?: "sm" | "md";
}

const MessageStatusIcon = ({ status, size = "sm" }: Props) => {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  switch (status) {
    case "pending":
      return <Clock className={cn(iconSize, "text-muted-foreground")} />;
    case "sent":
      return <Check className={cn(iconSize, "text-muted-foreground")} />;
    case "delivered":
      return <CheckCheck className={cn(iconSize, "text-muted-foreground")} />;
    case "read":
      return <CheckCheck className={cn(iconSize)} style={{ color: "#53BDEB" }} />;
    case "failed":
      return <XCircle className={cn(iconSize, "text-destructive")} />;
    default:
      return null;
  }
};

export default MessageStatusIcon;
