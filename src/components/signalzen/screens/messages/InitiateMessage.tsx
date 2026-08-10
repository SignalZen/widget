import type { ApiMessage } from "../../backend";
import { useSession } from "../../SessionProvider";
import { EventLine } from "../primitives";

export function InitiateMessageItem({ msg: _msg }: { msg: ApiMessage }) {
  const { translation } = useSession();
  return <EventLine>{translation.chat_initiated}</EventLine>;
}
