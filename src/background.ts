/// <reference types="./types" />
/// <reference path="./types/index.d.ts" />
/// <reference path="./types/lila-tb.ts" />
/// <reference path="./types/chess-com.d.ts" />
/// <reference path="./types/chess-js.ts" />

const _bg_browserPrefix: Browsers = chrome?.storage ? chrome : browser;

const abortController = new AbortController();

_bg_browserPrefix.runtime.onMessage.addListener(function (
  message: message_pass.message,
  sender,
  senderResponse
) {
  try {
    const { type, payload } = message;

    if (type === "remove_query") {
      _bg_browserPrefix.tabs.query({ currentWindow: true, active: true });
      getCurrentTab().then((tab) => {
        if (!tab || !tab.id || !tab.url) return;

        const { event, game } = URLHelper.getEventAndGame(tab);

        if (event && !game) {
          const replaceUrl = tab.url.replace(`event=${event}`, "");

          // @ts-ignore
          _bg_browserPrefix.tabs.update(tab.id, { url: replaceUrl });
        }
      });

      return;
    }

    if (type === "onload") {
      onLoadHandler();
    } else if (type === "reverse_pgn_request") {
      const { gameNumber, event } = payload;

      requestReverseGame(gameNumber, event).catch((e: any) =>
        console.log("Game fetch error: ", e?.message ?? e)
      );
    } else if (type === "request_tb_eval") {
      const { fen, currentPly } = payload;

      requestTBScoreHandler(fen, currentPly)
        .then((res) => {
          senderResponse(res);
        })
        .catch((e) => console.log("TB fetch error: ", e?.message ?? e));
    }

    return true;
  } catch (e: any) {
    console.log(e?.message ?? e);
  }
});

// to request agreement from random CCC games
_bg_browserPrefix.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (!changeInfo.url) {
    return false;
  }

  if (
    !changeInfo.url.includes("chess.com/computer-chess-championship") &&
    !changeInfo.url.includes("chess.com/ccc")
  ) {
    return;
  }

  const { event, game } = URLHelper.getEventAndGame(tab);

  const message: message_pass.message = {
    type: "tab_update",
    payload: {
      event,
      game,
    },
  };
  _sendMessageToContent(message);

  if (!game || !event) return;

  // todo delete this
  requestReverseGame(game, event).catch((e: any) =>
    console.log("Fetch error: ", e)
  );

  return true;
});

async function getCurrentTab() {
  try {
    const [tab] = await _bg_browserPrefix.tabs.query({
      active: true,
      currentWindow: true,
    });

    return tab;
  } catch (e: any) {
    console.log(e?.message ?? e);
  }
}

// gets CCC tab queries
// such as a name of the event
// and game number
async function onLoadHandler() {
  try {
    const tab = await getCurrentTab();

    if (!tab || !tab.id) return false;

    const { event, game } = URLHelper.getEventAndGame(tab);

    const message: message_pass.message = {
      type: "tab_update",
      payload: {
        event,
        game,
      },
    };
    _sendMessageToContent(message);

    if (game && event) {
      const reverseGameNumber = game % 2 === 1 ? game + 1 : game - 1;

      const urlToFetch = URLHelper.getArchiveGameURL(event, reverseGameNumber);
      const data = await fetch(urlToFetch);
      const response = (await data.json()) as chess_com.game_response;

      if (!response) {
        console.log("game not found");
        return;
      }

      const message: message_pass.message = {
        type: "reverse_pgn_response",
        payload: {
          pgn: getMovesFromPgn(response.pgn),
          reverseGameNumber,
          gameNumber: game,
        },
      };

      _sendMessageToContent(message);
    }

    return true;
  } catch (e: any) {
    console.log(e?.message);
  }
  return true;
}

async function requestReverseGame(gameNumber: number, event: string) {
  const reverseGameNumber =
    gameNumber % 2 === 0 ? gameNumber - 1 : gameNumber + 1;

  const response = await fetch(
    URLHelper.getArchiveGameURL(event, reverseGameNumber)
  );

  if (!response.ok) throw new Error("No response");

  const result = (await response.json()) as chess_com.game_response;
  if (!result) throw new Error("Result is null");
  if (!result.pgn) throw new Error("No pgn");

  const pgnArray = getMovesFromPgn(result.pgn);

  const message: message_pass.message = {
    type: "reverse_pgn_response",
    payload: {
      gameNumber,
      reverseGameNumber,
      pgn: pgnArray,
    },
  };

  _sendMessageToContent(message);
}

async function requestTBScoreHandler(fen: string, ply: number) {
  const tbResponse = await tbScore.requestTBScoreStandard(fen);

  const message: message_pass.message = {
    type: "response_tb_standard",
    payload: {
      response: tbResponse || null,
      ply,
    },
  };

  return message;
}

/**
 * returns moves string that looks like this
 * 1. e4 e5 2. Nf3 Nc6 3. Nf6 ...
 */
function getMovesFromPgn(pgn: string) {
  const data: string[] = pgn.split("\n");
  const pgnString = data[data.length - 1]!;

  return parsePGNMoves(pgnString);
}

/**
 * returns string[] with moves in SAN format
 * ['e4', 'e5', 'Ke2', 'Ke7', 'Na3', ...]
 */
function parsePGNMoves(pgn: string) {
  return (
    pgn
      .split(" ")
      // removes whitespaces
      .filter((el) => el !== "" && el !== " ")
      // filter potential comments
      .filter(
        (el) => !el.includes("{") && !el.includes("[") && !el.includes("*")
      )
      // filter move numbers and game result
      .filter((val) => {
        if (!val.match(/^\d/gi)) return val;
      })
  );
}

// todo add description
class URLHelper {
  static getEventAndGame(tab: Tab) {
    const url = tab?.url;

    // get "#" query params
    const textAfterHash = url?.split("#")?.[1];

    const eventAndGame: {
      event: string | null;
      game: number | null;
    } = {
      event: null,
      game: null,
    };

    if (
      !url ||
      !url.includes("computer-chess-championship") ||
      !textAfterHash
    ) {
      return eventAndGame;
    }

    const allHashQueries = textAfterHash?.split("&");
    const queries = allHashQueries.map((query) => {
      return query.split("=");
    });

    try {
      queries.forEach((el) => {
        if (el[0] === "event") {
          if (!el[1]) throw new Error("Event name is empty");

          eventAndGame.event = el[1];
          return;
        }
        if (el[0] === "game") {
          if (!el[1]) throw new Error("Game number is empty");

          eventAndGame.game = parseInt(el[1]);
        }
      });
    } catch (e: any) {
      console.log(e?.message ?? e);
    }

    return eventAndGame;
  }

  static getArchiveGameURL(eventId: string, gameNumber: number) {
    return `https://cccc.chess.com/archive?event=${eventId}&game=${gameNumber}`;
  }
}

// todo add description
class TB7Score {
  private controller = new AbortController();

  // todo move to the URLHelper ?
  private urlBase = "https://tablebase.lichess.ovh/standard";
  private urlStandard = `${this.urlBase}?fen=`;
  private urlMainline = `${this.urlBase}/mainline?fen=`;

  async requestTBScoreStandard(fen: string) {
    try {
      const requestURL = `${this.urlStandard}${fen}`;

      const response = await fetch(requestURL, {
        signal: this.controller.signal,
      });

      const result = await response.json();
      return result as lila.standard_response;
    } catch (e: any) {
      console.log("failed to request standard tb score: ", e?.message ?? e);
    }
  }

  async requestTBScoreMainline(fen: string) {
    try {
      const requestURL = `${this.urlMainline}${fen}`;

      const response = await fetch(requestURL, {
        signal: this.controller.signal,
      });

      const result = await response.json();

      return result as lila.mainline_response;
    } catch (e: any) {
      console.log(e?.message ?? e);
    }
  }
}

// todo delete
const tbScore = new TB7Score();

/**
 * sends a message to the content scripts
 */
async function _sendMessageToContent(message: message_pass.message) {
  const tab = await getCurrentTab();
  if (!tab || !tab.id) return;

  return _bg_browserPrefix.tabs.sendMessage(tab.id, message);
}

// todo
// _bg_browserPrefix.windows.onFocusChanged.addListener((windowId) => {
//
// });
