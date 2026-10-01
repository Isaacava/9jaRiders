"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSharedRealtimeClient, type RealtimeState } from "@/game/multiplayer";

export default function MultiplayerLobby() {
  const clientRef = useRef<ReturnType<typeof getSharedRealtimeClient> | null>(null);
  const preserveConnectionRef = useRef(false);
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [state, setState] = useState<RealtimeState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [hostId, setHostId] = useState("");
  const [status, setStatus] = useState("CONNECTING");
  const [error, setError] = useState("");

  useEffect(() => {
    const client = getSharedRealtimeClient();
    clientRef.current = client;

    client.onState((next) => {
      setState(next);
      setHostId(next.hostId);
      preserveConnectionRef.current =
        next.status === "countdown" || next.status === "racing";
    });
    client.onMessage((message) => {
      if (message.type === "server:ready") {
        setStatus("ONLINE");
      }
      if (message.type === "room:created" || message.type === "room:joined") {
        setRoomCode(String(message.roomId ?? ""));
        setPlayerId(String(message.playerId ?? ""));
        if (message.host) setHostId(String(message.playerId ?? ""));
        setStatus("IN LOBBY");
      }
      if (message.type === "error") {
        setError(String(message.code ?? "SERVER_ERROR"));
        setStatus("ERROR");
      }
    });

    void client.connect().catch(() => {
      setStatus("OFFLINE");
      setError("Realtime server is not reachable yet.");
    });

    return () => {
      if (!preserveConnectionRef.current) client.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!state || !playerId) return;

    if (state.status === "countdown" || state.status === "racing") {
      router.push("/play?mode=multiplayer&room=" + encodeURIComponent(state.roomId) + "&player=" + encodeURIComponent(playerId));
    }
  }, [state, playerId, router]);

  const displayName = name.trim().slice(0, 18) || "Rider";

  const create = () => {
    setError("");
    clientRef.current?.createRoom(displayName);
  };

  const join = () => {
    setError("");
    if (!roomCode.trim()) {
      setError("Enter a room code.");
      return;
    }
    clientRef.current?.joinRoom(roomCode, displayName);
  };

  const toggleReady = () => {
    if (!state || !playerId) return;
    const me = state.players.find((player) => player.id === playerId);
    clientRef.current?.setReady(state.roomId, playerId, !me?.ready);
  };

  const start = () => {
    if (state && playerId === hostId) {
      clientRef.current?.startRace(state.roomId, playerId);
    }
  };

  const me = state?.players.find((player) => player.id === playerId);
  const isHost = playerId !== "" && playerId === hostId;

  return (
    <section className="multiplayer-panel">
      <div className="multiplayer-top">
        <div>
          <span className="brand-kicker">REALTIME STREET RACING</span>
          <h1>RACE WITH YOUR PEOPLE</h1>
          <p>2–8 riders · room code · server-authoritative race state</p>
        </div>
        <span className={`server-status server-status--${status.toLowerCase().replace(/\s+/g, "-")}`}>
          {status}
        </span>
      </div>

      <div className="multiplayer-card">
        <label>
          RIDER NAME
          <input
            value={name}
            maxLength={18}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your rider name"
          />
        </label>

        <div className="multiplayer-actions">
          <button type="button" className="lobby-primary" onClick={create}>
            CREATE ROOM
          </button>
          <div className="room-join">
            <input
              value={roomCode}
              maxLength={6}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ROOM CODE"
            />
            <button type="button" onClick={join}>
              JOIN
            </button>
          </div>
        </div>

        {state && (
          <div className="room-state">
            <div className="room-header">
              <div>
                <span>ROOM</span>
                <strong>{state.roomId}</strong>
              </div>
              <div>
                <span>RACERS</span>
                <strong>{state.players.length}/8</strong>
              </div>
            </div>

            <div className="rider-list">
              {state.players.map((player) => (
                <div className="rider-row" key={player.id}>
                  <span className="rider-dot" />
                  <strong>{player.name}</strong>
                  <span>{player.ready ? "READY" : "NOT READY"}</span>
                  {player.id === state.hostId && <b>HOST</b>}
                </div>
              ))}
            </div>

            <div className="lobby-footer">
              <button type="button" onClick={toggleReady} className="lobby-ready">
                {me?.ready ? "NOT READY" : "READY UP"}
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={start}
                  className="lobby-primary"
                  disabled={state.status !== "lobby"}
                >
                  START RACE
                </button>
              )}
            </div>

            {state.status === "countdown" && (
              <p className="lobby-notice">Race countdown started. Phaser multiplayer rendering is the next integration layer.</p>
            )}
          </div>
        )}

        {error && <p className="lobby-error">{error}</p>}
      </div>
    </section>
  );
}
