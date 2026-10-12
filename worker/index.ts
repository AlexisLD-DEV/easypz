import type { Env } from "./env";
import {
  addAllowedEmail,
  addBannedTerm,
  deleteAllowedEmail,
  deleteBannedTerm,
  listAllowedEmails,
  listBannedTerms
} from "./admin/routes";
import { fail, HttpError } from "./http/response";
import { login, logout, me, register } from "./auth/routes";
import { getTeacherAnalytics } from "./analytics/routes";
import { receiveCodeInboxEmail, syncCodeInbox } from "./codeInbox/routes";
import { readAudio, readImage, uploadAudio, uploadImage } from "./media/routes";
import { finishPracticeAttempt, startPracticeAttempt, startSecretPracticeAttempt, submitPracticeAnswer } from "./practice/routes";
import { getPublicQuiz, getSecretQuiz, listPublicQuizzes } from "./public/routes";
import {
  checkSimilarQuestionBankItems,
  createQuestionBankItem,
  deleteQuestionBankItem,
  getQuestionBankItem,
  listQuestionBankItems,
  updateQuestionBankItem
} from "./questionBank/routes";
import { createQuiz, deleteQuiz, duplicateQuiz, getTeacherQuiz, listTeacherQuizzes, updateQuiz, updateQuizPublication } from "./quizzes/routes";
import {
  createLiveSession,
  deleteTeacherLiveSession,
  emailTeacherLiveSessionSummary,
  exportTeacherLiveSessionResults,
  getLiveBootstrap,
  getTeacherLiveSessionResults,
  joinLiveSession,
  listTeacherLiveSessions,
  liveSocket
} from "./live/routes";
import { assertTrustedRequestOrigin, isProtectedLiveSocketRequest, isProtectedStateChangingRequest } from "./http/origin";

export { LiveSessionRoom } from "./live/LiveSessionRoom";

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (isProtectedStateChangingRequest(request, url) || isProtectedLiveSocketRequest(request, url)) {
    assertTrustedRequestOrigin(request, env);
  }

  if (request.method === "POST" && url.pathname === "/api/auth/register") return register(request, env);
  if (request.method === "POST" && url.pathname === "/api/auth/login") return login(request, env);
  if (request.method === "POST" && url.pathname === "/api/auth/logout") return logout(request, env);
  if (request.method === "GET" && url.pathname === "/api/auth/me") return me(request, env);
  if (request.method === "GET" && url.pathname === "/api/code-inbox/sync") return syncCodeInbox(request, env);
  if (request.method === "GET" && url.pathname === "/api/admin/allowed-emails") return listAllowedEmails(request, env);
  if (request.method === "POST" && url.pathname === "/api/admin/allowed-emails") return addAllowedEmail(request, env);
  if (request.method === "DELETE" && url.pathname.startsWith("/api/admin/allowed-emails/")) {
    return deleteAllowedEmail(request, env, decodeURIComponent(url.pathname.split("/").pop() ?? ""));
  }
  if (request.method === "GET" && url.pathname === "/api/admin/banned-terms") return listBannedTerms(request, env);
  if (request.method === "POST" && url.pathname === "/api/admin/banned-terms") return addBannedTerm(request, env);
  if (request.method === "DELETE" && url.pathname.startsWith("/api/admin/banned-terms/")) {
    return deleteBannedTerm(request, env, decodeURIComponent(url.pathname.split("/").pop() ?? ""));
  }
  if (request.method === "GET" && url.pathname === "/api/teacher/question-bank") return listQuestionBankItems(request, env);
  if (request.method === "POST" && url.pathname === "/api/teacher/question-bank") return createQuestionBankItem(request, env);
  if (request.method === "POST" && url.pathname === "/api/teacher/question-bank/check-similar") {
    return checkSimilarQuestionBankItems(request, env);
  }
  if (url.pathname.startsWith("/api/teacher/question-bank/")) {
    const itemId = decodeURIComponent(url.pathname.split("/")[4] ?? "");
    if (request.method === "GET") return getQuestionBankItem(request, env, itemId);
    if (request.method === "PUT") return updateQuestionBankItem(request, env, itemId);
    if (request.method === "DELETE") return deleteQuestionBankItem(request, env, itemId);
  }
  if (request.method === "GET" && url.pathname === "/api/teacher/quizzes") return listTeacherQuizzes(request, env);
  if (request.method === "GET" && url.pathname === "/api/teacher/analytics") return getTeacherAnalytics(request, env);  if (request.method === "POST" && url.pathname === "/api/teacher/quizzes") return createQuiz(request, env);
  if (request.method === "GET" && url.pathname === "/api/teacher/live-sessions") return listTeacherLiveSessions(request, env);
  if (request.method === "GET" && url.pathname.match(/^\/api\/teacher\/live-sessions\/[^/]+\/results$/)) {
    return getTeacherLiveSessionResults(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "GET" && url.pathname.match(/^\/api\/teacher\/live-sessions\/[^/]+\/export\.csv$/)) {
    return exportTeacherLiveSessionResults(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/teacher\/live-sessions\/[^/]+\/email-summary$/)) {
    return emailTeacherLiveSessionSummary(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "DELETE" && url.pathname.match(/^\/api\/teacher\/live-sessions\/[^/]+$/)) {
    return deleteTeacherLiveSession(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/teacher\/quizzes\/[^/]+\/live-sessions$/)) {
    return createLiveSession(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/teacher\/quizzes\/[^/]+\/publication$/)) {
    return updateQuizPublication(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/teacher\/quizzes\/[^/]+\/duplicate$/)) {
    return duplicateQuiz(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (url.pathname.startsWith("/api/teacher/quizzes/")) {
    const quizId = url.pathname.split("/")[4];
    if (request.method === "GET") return getTeacherQuiz(request, env, quizId);
    if (request.method === "PUT") return updateQuiz(request, env, quizId);
    if (request.method === "DELETE") return deleteQuiz(request, env, quizId);
  }
  if (request.method === "POST" && url.pathname === "/api/media/images") return uploadImage(request, env);
  if (request.method === "POST" && url.pathname === "/api/media/audio") return uploadAudio(request, env);
  if (request.method === "GET" && url.pathname.startsWith("/api/media/images/")) {
    return readImage(env, url.pathname.slice("/api/media/images/".length));
  }
  if (request.method === "GET" && url.pathname.startsWith("/api/media/audio/")) {
    return readAudio(env, url.pathname.slice("/api/media/audio/".length));
  }
  if (request.method === "GET" && url.pathname === "/api/public/quizzes") return listPublicQuizzes(request, env);
  if (request.method === "GET" && url.pathname.startsWith("/api/public/quizzes/")) {
    return getPublicQuiz(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "GET" && url.pathname.startsWith("/api/public/secret-quizzes/")) {
    return getSecretQuiz(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/public\/quizzes\/[^/]+\/practice\/start$/)) {
    return startPracticeAttempt(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/public\/secret-quizzes\/[^/]+\/practice\/start$/)) {
    return startSecretPracticeAttempt(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/practice\/[^/]+\/answers$/)) {
    return submitPracticeAnswer(request, env, decodeURIComponent(url.pathname.split("/")[3] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/practice\/[^/]+\/finish$/)) {
    return finishPracticeAttempt(request, env, decodeURIComponent(url.pathname.split("/")[3] ?? ""));
  }
  if (request.method === "POST" && url.pathname.match(/^\/api\/live\/[^/]+\/join$/)) {
    return joinLiveSession(request, env, decodeURIComponent(url.pathname.split("/")[3] ?? ""));
  }
  if (request.method === "GET" && url.pathname.match(/^\/api\/live\/sessions\/[^/]+\/bootstrap$/)) {
    return getLiveBootstrap(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (url.pathname.match(/^\/api\/live\/sessions\/[^/]+\/socket$/)) {
    return liveSocket(request, env, decodeURIComponent(url.pathname.split("/")[4] ?? ""));
  }
  if (url.pathname.startsWith("/api/")) throw new HttpError(404, "not_found");
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await api(request, env);
    } catch (error) {
      return fail(error);
    }
  },

  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    await receiveCodeInboxEmail(message, env);
  }
};
