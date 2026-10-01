import Link from "next/link";
import MultiplayerLobby from "@/components/MultiplayerLobby";

export default function MultiplayerPage() {
  return (
    <main className="multiplayer-page">
      <Link className="back-link" href="/">
        ← ABOKI RIDERS
      </Link>
      <MultiplayerLobby />
    </main>
  );
}
