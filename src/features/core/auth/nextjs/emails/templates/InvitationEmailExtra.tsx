import { Text } from "@react-email/components";

export function InvitationEmailExtra(props: { invitedByLine?: string }) {
    if (!props.invitedByLine) return null;
    return <Text style={{ fontSize: "16px", margin: "0 0 16px" }}>{props.invitedByLine}</Text>;
}
