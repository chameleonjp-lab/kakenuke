import { LOGICAL_WIDTH, type GameMode } from "../config/progression";

export const GAME_SLUG = "kakenuke";
export const GAME_URL = "https://chameleonjp-lab.github.io/kakenuke/";
export const LAB_URL = "https://chameleonjp-lab.github.io/chameleonjp_lab/";
const SUPABASE_URL = "https://mlpnjgezrnhdxsxolyzj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_drzcy0v97knU6FgjqSgBHw_0A9XPdFM";
const CLIENT_VERSION = "kakenuke-2026-08-31-platform";
const PLAYER_NAME_KEY = "kakenuke.player-name";
const MAX_NAME_LENGTH = 20;

export interface RankingRow {
  rank: number;
  displayName: string;
  score: number;
}

export interface ResultPlatformData {
  mode: GameMode;
  score: number;
  distance: number;
  kills: number;
  bossKills: number;
  coins: number;
}

function cleanPlayerName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

export function readPlayerName(): string {
  try {
    return cleanPlayerName(localStorage.getItem(PLAYER_NAME_KEY) ?? "");
  } catch {
    return "";
  }
}

export function savePlayerName(value: string): string {
  const name = cleanPlayerName(value);
  try {
    if (name) {
      localStorage.setItem(PLAYER_NAME_KEY, name);
    } else {
      localStorage.removeItem(PLAYER_NAME_KEY);
    }
  } catch {
    // Storage is optional; the in-memory value still gates this session.
  }
  return name;
}

export function shareHomeText(): string {
  return `【カケヌケ】時間をあやつるシューティングに挑戦中！\n${GAME_URL}\n#カケヌケ #カメレオンJP`;
}

export function shareResultText(data: ResultPlatformData): string {
  const mode = data.mode === "hardcore" ? "HARDCORE" : "NORMAL";
  const name = readPlayerName() || "プレイヤー";
  return [
    `【カケヌケ】${name}のプレイ結果`,
    `${data.score.toLocaleString()}点 / ${mode}`,
    `到達距離 ${data.distance.toLocaleString()}・撃破 ${data.kills.toLocaleString()}・ボス撃破 ${data.bossKills.toLocaleString()}・コイン ◇${data.coins.toLocaleString()}`,
    "時間を止め、背後の闇から逃げ切った！",
    GAME_URL,
    "#カケヌケ #カメレオンJP",
  ].join("\n");
}

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };
}

async function callRpc<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`ランキング通信に失敗しました (${response.status})`);
  }
  return (await response.json()) as T;
}

function normalizeRanking(payload: unknown): RankingRow[] {
  if (!Array.isArray(payload)) return [];
  return payload.slice(0, 10).map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      rank: Number(item.rank) || index + 1,
      displayName: cleanPlayerName(String(item.display_name ?? item.player_name ?? "プレイヤー")) || "プレイヤー",
      score: Number(item.score) || 0,
    };
  });
}

async function loadRanking(): Promise<RankingRow[]> {
  const payload = await callRpc<unknown>("get_best_score_ranking", {
    p_game_slug: GAME_SLUG,
    p_limit: 10,
  });
  return normalizeRanking(payload);
}

async function submitScore(score: number): Promise<void> {
  await callRpc<unknown>("submit_score", {
    p_display_name: readPlayerName(),
    p_game_slug: GAME_SLUG,
    p_score: Math.max(0, Math.round(score)),
    p_client_version: CLIENT_VERSION,
  });
}

export async function submitAndLoadRanking(score: number): Promise<RankingRow[]> {
  await submitScore(score);
  return loadRanking();
}

export async function shareOrCopy(text: string): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied ? "copied" : "failed";
  } catch {
    return "failed";
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function positionPanel(panel: HTMLElement, logicalTop: number, logicalHeight: number): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-root canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / LOGICAL_WIDTH;
  panel.style.left = `${rect.left + 100 * scale}px`;
  panel.style.top = `${rect.top + logicalTop * scale}px`;
  panel.style.width = `${880 * scale}px`;
  panel.style.maxHeight = `${logicalHeight * scale}px`;
  panel.style.fontSize = `${Math.max(11, 24 * scale)}px`;
}

function attachPanel(panel: HTMLElement, logicalTop: number, logicalHeight: number): () => void {
  const root = document.getElementById("game-root");
  if (!root) return () => undefined;
  root.appendChild(panel);
  const relayout = (): void => positionPanel(panel, logicalTop, logicalHeight);
  window.addEventListener("resize", relayout);
  requestAnimationFrame(relayout);
  return () => {
    window.removeEventListener("resize", relayout);
    panel.remove();
  };
}

function statusText(status: "shared" | "copied" | "cancelled" | "failed"): string {
  if (status === "shared") return "シェア画面を開きました";
  if (status === "copied") return "シェア文をコピーしました";
  if (status === "cancelled") return "シェアをキャンセルしました";
  return "コピーできませんでした。シェア文を長押ししてコピーしてください";
}

export function focusPlayerName(): void {
  const input = document.querySelector<HTMLInputElement>("#kakenuke-player-name");
  input?.focus();
}

export function mountTitlePlatform(): () => void {
  const panel = document.createElement("section");
  panel.className = "kakenuke-platform kakenuke-title-platform";
  panel.innerHTML = `
    <label class="kakenuke-name-label" for="kakenuke-player-name">プレイヤー名（必須）</label>
    <input id="kakenuke-player-name" class="kakenuke-name-input" maxlength="20" autocomplete="nickname" placeholder="名前を入力" />
    <p id="kakenuke-name-status" class="kakenuke-platform-status">名前を入力してから START</p>
    <div class="kakenuke-platform-actions">
      <button type="button" data-kakenuke-share>ホームをシェア</button>
      <a href="${LAB_URL}" target="_blank" rel="noreferrer">実験場へ</a>
    </div>
  `;
  const input = panel.querySelector<HTMLInputElement>("#kakenuke-player-name");
  const status = panel.querySelector<HTMLElement>("#kakenuke-name-status");
  if (input) input.value = readPlayerName();
  input?.addEventListener("input", () => {
    const name = savePlayerName(input.value);
    if (status) status.textContent = name ? "名前を保存しました" : "名前を入力してから START";
  });
  panel.querySelector<HTMLButtonElement>("[data-kakenuke-share]")?.addEventListener("click", async () => {
    const result = await shareOrCopy(shareHomeText());
    if (status) status.textContent = statusText(result);
  });
  return attachPanel(panel, 1170, 180);
}

export function mountResultPlatform(data: ResultPlatformData): () => void {
  let disposed = false;
  const panel = document.createElement("section");
  panel.className = "kakenuke-platform kakenuke-result-platform";
  const shareText = shareResultText(data);
  panel.innerHTML = `
    <div class="kakenuke-result-heading">${escapeHtml(readPlayerName() || "プレイヤー")} の結果をシェア</div>
    <textarea class="kakenuke-share-text" readonly aria-label="シェア文">${escapeHtml(shareText)}</textarea>
    <button type="button" class="kakenuke-share-button" data-kakenuke-result-share>シェアする／コピー</button>
    <p class="kakenuke-platform-status" data-kakenuke-result-status>ランキングに登録中…</p>
    <div class="kakenuke-ranking-heading">ONLINE TOP 10</div>
    <ol class="kakenuke-ranking-list" data-kakenuke-ranking><li>読み込み中…</li></ol>
    <a class="kakenuke-lab-link" href="${LAB_URL}" target="_blank" rel="noreferrer">カメレオンJPの実験場へ</a>
  `;
  const status = panel.querySelector<HTMLElement>("[data-kakenuke-result-status]");
  const ranking = panel.querySelector<HTMLOListElement>("[data-kakenuke-ranking]");
  panel.querySelector<HTMLButtonElement>("[data-kakenuke-result-share]")?.addEventListener("click", async () => {
    const result = await shareOrCopy(shareText);
    if (status) status.textContent = statusText(result);
  });

  const cleanup = attachPanel(panel, 1080, 300);
  void submitAndLoadRanking(data.score)
    .then((rows) => {
      if (disposed || !ranking) return;
      ranking.innerHTML = rows.length
        ? rows
            .map(
              (row) =>
                `<li><span>${row.rank}. ${escapeHtml(row.displayName)}</span><strong>${row.score.toLocaleString()}点</strong></li>`,
            )
            .join("")
        : "<li>まだランキングがありません</li>";
      if (status) status.textContent = "オンラインランキングに反映しました";
    })
    .catch(() => {
      if (disposed) return;
      if (status) status.textContent = "ランキングは現在利用できません（結果は保存されています）";
      if (ranking) ranking.innerHTML = "<li>ランキングを読み込めませんでした</li>";
    });
  return () => {
    disposed = true;
    cleanup();
  };
}
