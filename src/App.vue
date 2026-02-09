<script setup lang='ts'>
import { ref, computed, nextTick } from "vue";
import {
  getCriteria,
  getFormQuestions,
  analyzeScores,
  buildPrompt,
  type AnalysisResult,
  type FormQuestion,
  type Gender,
} from "./composables/useScale";

const gender = ref<Gender>("female");
const activeTab = ref(1);
const criteria = computed(() => getCriteria(gender.value));
const formQuestions = computed(() => getFormQuestions(gender.value));

type FormAnswer = 1 | 0 | -1 | null; // Да, Не знаю, Нет
const girlFormAnswers = ref<FormAnswer[]>(Array(11).fill(null));
const girlAiResponse = ref("");
const girlIsLoading = ref(false);
const girlError = ref("");
const girlCardRef = ref<HTMLElement | null>(null);

const boyFormAnswers = ref<FormAnswer[]>(Array(11).fill(null));
const boyAiResponse = ref("");
const boyIsLoading = ref(false);
const boyError = ref("");
const boyCardRef = ref<HTMLElement | null>(null);

const scores = ref<number[]>(Array(11).fill(0));
const aiResponse = ref("");
const isLoading = ref(false);
const error = ref("");
const aiCardRef = ref<HTMLElement | null>(null);

const analysis = computed<AnalysisResult>(() =>
  analyzeScores(scores.value, gender.value)
);
const allZeros = computed(() => scores.value.every((s) => s === 0));
// const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

async function getAIAnalysis() {
  isLoading.value = true;
  error.value = "";
  aiResponse.value = "";

  try {
    const apiUrl =
      import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV
        ? `http://${
            typeof window !== "undefined"
              ? window.location.hostname
              : "localhost"
          }:3001`
        : "");

    let genderValue = gender.value;

    if (activeTab.value === 2) {
      genderValue = gender.value === "male" ? "female" : "male";
    }

    const res = await fetch(`${apiUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildPrompt(scores.value, analysis.value, genderValue),
      }),
    });

    if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);

    const data = await res.json();
    aiResponse.value = data.response;
    await nextTick();
    aiCardRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e: any) {
    error.value =
      "Не удалось подключиться к API. Запусти в отдельном терминале: npm run api";
  } finally {
    isLoading.value = false;
  }
}

const MIN_SCORE = 0;
const MAX_SCORE = 10;

function allowOnlyDigits(e: KeyboardEvent) {
  if (
    /[0-9]/.test(e.key) ||
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Tab" ||
    e.key.startsWith("Arrow") ||
    e.key === "Home" ||
    e.key === "End"
  )
    return;
  e.preventDefault();
}

function setScore(i: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, "");
  if (raw === "") {
    scores.value[i] = 0;
    return;
  }
  const n = Math.min(MAX_SCORE, Math.max(MIN_SCORE, Number(raw)));
  scores.value[i] = n;
}

function setGender(value: Gender) {
  if (gender.value === value) return;
  gender.value = value;
  // activeTab.value = value === "female" ? 2 : 1;
  resetAllForms();
}

function setTab(n: number) {
  if (activeTab.value === n) return;
  activeTab.value = n;
  error.value = "";
  girlError.value = "";
  boyError.value = "";
}

function resetAllForms() {
  scores.value = Array(11).fill(0);
  aiResponse.value = "";
  girlFormAnswers.value = Array(11).fill(null);
  girlAiResponse.value = "";
  boyFormAnswers.value = Array(11).fill(null);
  boyAiResponse.value = "";
  error.value = "";
  girlError.value = "";
  boyError.value = "";
}

function setGirlAnswer(i: number, value: FormAnswer) {
  girlFormAnswers.value[i] = value;
}

function setBoyAnswer(i: number, value: FormAnswer) {
  boyFormAnswers.value[i] = value;
}

const formAnswerLabel = (v: FormAnswer) =>
  v === 1 ? "Да" : v === 0 ? "Не знаю" : v === -1 ? "Нет" : "—";

function getOptionLabel(i: number, v: FormAnswer): string {
  if (v === null) return "—";
  const o = formQuestions.value[i].options;
  return v === 1 ? o[0] : v === 0 ? o[1] : o[2];
}

function buildFormPrompt(answers: FormAnswer[], formLabel: string): string {
  const lines = formQuestions.value.map(
    (q, i) =>
      `${i + 1}. ${q.text}\n   Ответ: ${getOptionLabel(i, answers[i])}`
  );
  const isMale = formLabel.includes("мальчиков");
  const rec = isMale
    ? "обсудить с партнёршей или проработать самому"
    : "обсудить с партнёром или проработать самой";
  return `Рефлексия по отношениям (${formLabel}). Ответы на вопросы:

${lines.join("\n\n")}

Дай развёрнутый анализ (4–6 абзацев):
1. Общая картина: что говорят ответы о качестве отношений и твоём состоянии.
2. Сильные стороны: где ответы «Да» и что это значит.
3. Зоны риска: «Нет» и «Не знаю» — на что обратить внимание, возможные причины.
4. Зависимость vs любовь: как соотносятся ответы с честной привязанностью.
5. Рекомендации: что имеет смысл ${rec}.`;
}

async function getGirlFormAnalysis() {
  girlIsLoading.value = true;
  girlError.value = "";
  girlAiResponse.value = "";

  try {
    const apiUrl =
      import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV
        ? `http://${
            typeof window !== "undefined"
              ? window.location.hostname
              : "localhost"
          }:3001`
        : "");
    const res = await fetch(`${apiUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: buildFormPrompt(girlFormAnswers.value, "форма для девочек") }),
    });

    if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);

    const data = await res.json();
    girlAiResponse.value = data.response;
    await nextTick();
    girlCardRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e: any) {
    girlError.value =
      "Не удалось подключиться к API. Запусти в отдельном терминале: npm run api";
  } finally {
    girlIsLoading.value = false;
  }
}

const girlFormHasAnswers = computed(() =>
  girlFormAnswers.value.some((a) => a !== null)
);

async function getBoyFormAnalysis() {
  boyIsLoading.value = true;
  boyError.value = "";
  boyAiResponse.value = "";

  try {
    const apiUrl =
      import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV
        ? `http://${
            typeof window !== "undefined"
              ? window.location.hostname
              : "localhost"
          }:3001`
        : "");
    const res = await fetch(`${apiUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: buildFormPrompt(boyFormAnswers.value, "форма для мальчиков") }),
    });

    if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);

    const data = await res.json();
    boyAiResponse.value = data.response;
    await nextTick();
    boyCardRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e: any) {
    boyError.value =
      "Не удалось подключиться к API. Запусти в отдельном терминале: npm run api";
  } finally {
    boyIsLoading.value = false;
  }
}

const boyFormHasAnswers = computed(() =>
  boyFormAnswers.value.some((a) => a !== null)
);

const hasFormData = computed(
  () =>
    scores.value.some((s) => s !== 0) ||
    girlFormAnswers.value.some((a) => a !== null) ||
    boyFormAnswers.value.some((a) => a !== null) ||
    !!aiResponse.value ||
    !!girlAiResponse.value ||
    !!boyAiResponse.value
);

const showFeedbackModal = ref(false);
const feedbackText = ref("");
const feedbackSending = ref(false);
const feedbackError = ref("");

function openFeedbackModal() {
  showFeedbackModal.value = true;
  feedbackText.value = "";
  feedbackError.value = "";
}

function closeFeedbackModal() {
  showFeedbackModal.value = false;
  feedbackText.value = "";
  feedbackError.value = "";
}

async function sendFeedback() {
  feedbackSending.value = true;
  feedbackError.value = "";
  const apiBase =
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env?.VITE_API_URL) ||
    "";
  try {
    const res = await fetch(`${apiBase}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: feedbackText.value.trim() || "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      feedbackError.value = data.error || `Ошибка: ${res.status}`;
      return;
    }
    closeFeedbackModal();
  } catch {
    feedbackError.value =
      "Не удалось отправить. Запусти API: npm run api и добавь RESEND_API_KEY в .env";
  } finally {
    feedbackSending.value = false;
  }
}
</script>

<template>
  <div class="app">
    <div class="container">
      <header class="header">
        <h1>COLD FORMAT <span class="by">(by LexSola)</span></h1>
      </header>

      <div class="tabs-row">
        <div class="tabs-container">
          <div class="gender-switch">
            <button
              type="button"
              class="gender-btn girls-mode"
              :class="{ active: gender === 'female' }"
              @click="setGender('female')"
              title="Женский"
            >
              <svg
                class="gender-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="9" r="5" />
                <line x1="12" y1="14" x2="12" y2="20" />
                <line x1="9" y1="17" x2="15" y2="17" />
              </svg>
            </button>
            <button
              type="button"
              class="gender-btn"
              :class="{ active: gender === 'male' }"
              @click="setGender('male')"
              title="Мужской"
            >
              <svg
                class="gender-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="14" r="5" />
                <line x1="12" y1="9" x2="12" y2="2" />
                <line x1="9" y1="5" x2="12" y2="2" />
                <line x1="12" y1="2" x2="15" y2="5" />
              </svg>
            </button>
          </div>
          <div class="tabs" :class="{ 'girls-mode': gender === 'female' }">
            <button
              type="button"
              class="tab-btn"
              :class="{ active: activeTab === 1 }"
              @click="setTab(1)"
              title="Критерии и оценка"
            >
              <svg
                class="tab-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="15" y2="16" />
              </svg>
            </button>
            <button
              type="button"
              class="tab-btn"
              :class="{ active: activeTab === 2 }"
              @click="setTab(2)"
              title="Честные вопросы о партнёре"
            >
              <svg
                class="tab-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="options-container">
          <!-- <button
            type="button"
            class="feedback-btn"
            @click="openFeedbackModal"
            title="Обратная связь"
          >
            <svg
              class="tab-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button> -->
          <button
            type="button"
            class="reset-all-btn"
            :disabled="!hasFormData"
            @click="resetAllForms"
            title="Сбросить все формы"
          >
            <svg
              class="tab-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>

      <Teleport to="body">
        <div
          v-if="showFeedbackModal"
          class="feedback-overlay"
          @click.self="closeFeedbackModal"
        >
          <div class="feedback-modal">
            <h3 class="feedback-title">Обратная связь</h3>
            <div v-if="feedbackError" class="alert alert-danger feedback-alert">
              <span class="alert-icon">❌</span>
              {{ feedbackError }}
            </div>
            <textarea
              v-model="feedbackText"
              class="feedback-textarea"
              placeholder="Напишите отзыв, предложение или сообщение об ошибке..."
              :disabled="feedbackSending"
            />
            <div class="feedback-actions">
              <button
                type="button"
                class="btn-secondary"
                :disabled="feedbackSending"
                @click="closeFeedbackModal"
              >
                Закрыть
              </button>
              <button
                type="button"
                class="btn-primary"
                :disabled="feedbackSending"
                @click="sendFeedback"
              >
                {{ feedbackSending ? "Отправляю..." : "Отправить" }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <template v-if="activeTab === 1">
        <div class="card table-card">
          <p class="form-intro">
            Проставь баллы от 0 до 10 по каждому критерию
          </p>
          <table>
            <thead>
              <tr>
                <th class="col-criteria">Критерий</th>
                <th class="col-value">Оценка</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in criteria" :key="c.id">
                <td class="col-criteria">
                  <strong>{{ c.name }}</strong>
                  <span class="desc">{{ c.description }}</span>
                </td>
                <td class="col-value">
                  <input
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="10"
                    maxlength="2"
                    :value="scores[i] === 0 ? '' : scores[i]"
                    @keydown="allowOnlyDigits"
                    @input="setScore(i, $event)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!allZeros" class="card result-card">
          <div class="result-header">
            <div class="result-item">
              <span class="label">Сумма баллов</span>
              <span class="value"
                >{{ analysis.total
                }}<span class="max">/{{ criteria.length * 10 }}</span></span
              >
            </div>
            <div class="result-item">
              <span class="label">Категория</span>
              <span class="category" :class="analysis.categoryClass">{{
                analysis.category
              }}</span>
            </div>
          </div>

          <p class="description">{{ analysis.description }}</p>

          <div v-if="analysis.penalty" class="alert alert-danger">
            <span class="alert-icon">⚠️</span>
            {{ analysis.penalty }}
          </div>

          <div v-if="analysis.redFlags.length" class="alert alert-warning">
            <span class="alert-icon">🚩</span>
            Красные флаги: низкие баллы по пунктам
            {{ analysis.redFlags.join(", ") }} (≤3)
          </div>

          <div v-if="analysis.isGoldenStandard" class="alert alert-success">
            <span class="alert-icon">⭐</span>
            Золотой стандарт: 75+ баллов и ни одного пункта ниже 6
          </div>
        </div>

        <button
          @click="getAIAnalysis"
          :disabled="isLoading || allZeros"
          class="btn-primary"
        >
          <span class="btn-glow"></span>
          {{ isLoading ? "Анализирую..." : "Анализировать" }}
        </button>

        <div v-if="error" class="alert alert-danger" style="margin-top: 1rem">
          <span class="alert-icon">❌</span>
          {{ error }}
        </div>

        <div v-if="aiResponse" ref="aiCardRef" class="card ai-card">
          <h3>
            <span class="icon">✨</span>
            Анализ
          </h3>
          <div class="ai-content">
            <p v-for="(p, i) in aiResponse.split('\n\n')" :key="i">{{ p }}</p>
          </div>
        </div>
      </template>

      <template v-if="activeTab === 2">
        <div v-if="gender === 'female'" class="card form-card">
          <p class="form-intro">Честные вопросы себе о партнёре</p>
          <div
            v-for="(q, i) in formQuestions"
            :key="'g-' + i"
            class="form-item"
          >
            <p class="form-question">{{ q.text }}</p>
            <div class="form-options">
              <button
                type="button"
                class="option-btn"
                :class="{ active: girlFormAnswers[i] === 1 }"
                @click="setGirlAnswer(i, 1)"
              >
                {{ q.options[0] }}
              </button>
              <button
                type="button"
                class="option-btn"
                :class="{ active: girlFormAnswers[i] === 0 }"
                @click="setGirlAnswer(i, 0)"
              >
                {{ q.options[1] }}
              </button>
              <button
                type="button"
                class="option-btn"
                :class="{ active: girlFormAnswers[i] === -1 }"
                @click="setGirlAnswer(i, -1)"
              >
                {{ q.options[2] }}
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="gender === 'female'"
          @click="getGirlFormAnalysis"
          :disabled="girlIsLoading || !girlFormHasAnswers"
          class="btn-primary"
        >
          <span class="btn-glow"></span>
          {{ girlIsLoading ? "Анализирую..." : "Анализировать" }}
        </button>

        <div
          v-if="gender === 'female' && girlError"
          class="alert alert-danger"
          style="margin-top: 1rem"
        >
          <span class="alert-icon">❌</span>
          {{ girlError }}
        </div>

        <div
          v-if="gender === 'female' && girlAiResponse"
          ref="girlCardRef"
          class="card ai-card"
        >
          <h3>
            <span class="icon">✨</span>
            Развёрнутый анализ
          </h3>
          <div class="ai-content">
            <p v-for="(p, i) in girlAiResponse.split('\n\n')" :key="i">
              {{ p }}
            </p>
          </div>
        </div>

        <div v-if="gender === 'male'" class="card form-card">
          <p class="form-intro">Честные вопросы себе о партнёрше</p>
          <div
            v-for="(q, i) in formQuestions"
            :key="'b-' + i"
            class="form-item"
          >
            <p class="form-question">{{ q.text }}</p>
            <div class="form-options">
              <button
                type="button"
                class="option-btn"
                :class="{ active: boyFormAnswers[i] === 1 }"
                @click="setBoyAnswer(i, 1)"
              >
                {{ q.options[0] }}
              </button>
              <button
                type="button"
                class="option-btn"
                :class="{ active: boyFormAnswers[i] === 0 }"
                @click="setBoyAnswer(i, 0)"
              >
                {{ q.options[1] }}
              </button>
              <button
                type="button"
                class="option-btn"
                :class="{ active: boyFormAnswers[i] === -1 }"
                @click="setBoyAnswer(i, -1)"
              >
                {{ q.options[2] }}
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="gender === 'male'"
          @click="getBoyFormAnalysis"
          :disabled="boyIsLoading || !boyFormHasAnswers"
          class="btn-primary"
        >
          <span class="btn-glow"></span>
          {{ boyIsLoading ? "Анализирую..." : "Анализировать" }}
        </button>

        <div
          v-if="gender === 'male' && boyError"
          class="alert alert-danger"
          style="margin-top: 1rem"
        >
          <span class="alert-icon">❌</span>
          {{ boyError }}
        </div>

        <div
          v-if="gender === 'male' && boyAiResponse"
          ref="boyCardRef"
          class="card ai-card"
        >
          <h3>
            <span class="icon">✨</span>
            Развёрнутый анализ
          </h3>
          <div class="ai-content">
            <p v-for="(p, i) in boyAiResponse.split('\n\n')" :key="i">
              {{ p }}
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --teal: #2dd4bf;
  --teal-dim: rgba(45, 212, 191, 0.15);
  --teal-glow: rgba(45, 212, 191, 0.4);
  --reset-pink: #b57d8a;
  --reset-pink-dim: rgba(181, 125, 138, 0.25);
  --reset-pink-disabled: #c9a8b0;
  --bg-dark: #09090b;
  --bg-card: rgba(20, 20, 22, 0.9);
  --border: rgba(45, 212, 191, 0.15);
  --text: #e4e4e7;
  --text-dim: #71717a;
}

body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-dark);
  min-height: 100vh;
  color: var(--text);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
  background: radial-gradient(
      ellipse at top,
      rgba(45, 212, 191, 0.06) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at bottom right,
      rgba(45, 212, 191, 0.03) 0%,
      transparent 40%
    ),
    linear-gradient(180deg, #09090b 0%, #0c0c0e 100%);
  background-attachment: fixed;
}

.app::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(
    rgba(45, 212, 191, 0.03) 1px,
    transparent 1px
  );
  background-size: 30px 30px;
  pointer-events: none;
  z-index: 0;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
  position: relative;
  z-index: 1;
}

.header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.tabs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.tabs-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tabs {
  display: flex;
  gap: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 44px;
  min-width: 52px;
  min-height: 44px;
  padding: 0;
  margin: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.tab-btn:first-child {
  border-radius: 10px 0 0 10px;
}

.tab-btn:last-child {
  border-radius: 0 10px 10px 0;
}

.tab-btn.active {
  background: var(--teal-dim);
  border-color: var(--teal);
  color: var(--teal);
}

.tab-btn:not(.active):hover {
  border-color: rgba(45, 212, 191, 0.35);
  color: var(--text);
}

.tabs.girls-mode .tab-btn.active {
  background: var(--reset-pink-dim);
  border-color: var(--reset-pink);
  color: var(--reset-pink);
}

.tabs.girls-mode .tab-btn:not(.active):hover {
  border-color: var(--reset-pink-dim);
}

.tab-icon {
  width: 22px;
  height: 22px;
  display: block;
  flex-shrink: 0;
}

.feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--teal);
  border-radius: 10px;
  color: var(--teal);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.feedback-btn:hover {
  background: var(--teal-dim);
  border-color: var(--teal);
  color: var(--teal);
}

.reset-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 1px solid #fff;
  border-radius: 10px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.reset-all-btn:hover:not(:disabled) {
  background: #fff;
  border-color: #fff;
  color: #fff;
}

.reset-all-btn:disabled {
  border-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.5);
  opacity: 0.8;
  cursor: not-allowed;
}

.feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(9, 9, 11, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
}

.feedback-modal {
  width: 100%;
  height: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.feedback-title {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
  color: var(--text);
}

.feedback-alert {
  margin-bottom: 1rem;
}

.feedback-textarea {
  flex: 1;
  width: 100%;
  min-height: 280px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
  resize: none;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

.feedback-textarea::placeholder {
  color: var(--text-dim);
}

.feedback-textarea:focus {
  outline: none;
  border-color: var(--teal);
  box-shadow: 0 0 0 2px var(--teal-dim);
}

.feedback-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 0.6rem 1.2rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  -webkit-appearance: none;
  appearance: none;
}

.btn-secondary:hover {
  border-color: var(--teal);
  color: var(--teal);
}

.gender-switch {
  display: flex;
  gap: 0;
}

.form-card {
  margin-bottom: 1.5rem;
}

.form-intro {
  text-align: center;
  color: var(--text-dim);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.form-item {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.form-item:last-child {
  border-bottom: none;
}

.form-question {
  color: var(--text);
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.form-options {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.option-btn {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-dim);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  -webkit-appearance: none;
  appearance: none;
}

.option-btn.active {
  background: var(--teal-dim);
  border-color: var(--teal);
  color: var(--teal);
}

.option-btn:not(.active):hover {
  border-color: rgba(45, 212, 191, 0.35);
  color: var(--text);
}

.gender-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 44px;
  min-width: 52px;
  min-height: 44px;
  padding: 0;
  margin: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.gender-btn:first-child {
  border-radius: 10px 0 0 10px;
}

.gender-btn:last-child {
  border-radius: 0 10px 10px 0;
}

.gender-btn.active {
  background: var(--teal-dim);
  border-color: var(--teal);
  color: var(--teal);
}

.girls-mode {
  background: var(--bg-card);
  border-radius: 10px;
  color: var(--text-dim);
}
.girls-mode.active {
  background: var(--reset-pink-dim);
  border-color: var(--reset-pink);
  color: var(--reset-pink);
}

.gender-btn:not(.active):hover {
  border-color: rgba(45, 212, 191, 0.35);
  color: var(--text);
}

.girls-mode:not(.active):hover {
  border-color: var(--reset-pink-dim);
}

.gender-icon {
  width: 24px;
  height: 24px;
  display: block;
  flex-shrink: 0;
}

h1 .by {
  font-size: 0.4em;
  font-weight: 400;
  vertical-align: middle;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #2dd4bf 0%, #5eead4 50%, #2dd4bf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.1em;
}

.subtitle {
  color: var(--text-dim);
  margin-top: 0.5rem;
  font-size: 0.95rem;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(20px);
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.05),
    0 20px 50px -20px rgba(0, 0, 0, 0.5);
}

.table-card {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 0.75rem 1rem;
  color: var(--teal);
  font-weight: 500;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}

td {
  padding: 1rem;
  border-bottom: 1px solid rgba(45, 212, 191, 0.08);
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}
tr:hover {
  background: rgba(45, 212, 191, 0.03);
}

.col-criteria strong {
  display: block;
  color: var(--text);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.col-criteria .desc {
  display: block;
  color: var(--text-dim);
  font-size: 0.8rem;
  line-height: 1.4;
}

.col-value {
  width: 100px;
  text-align: center;
}

.col-value input {
  width: 60px;
  padding: 0.5rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--teal);
  -moz-appearance: textfield;
  appearance: textfield;
}

.col-value input::-webkit-inner-spin-button,
.col-value input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.col-value input:focus {
  outline: none;
  border-color: var(--teal);
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.2);
}

.result-card {
  background: linear-gradient(
    135deg,
    var(--bg-card) 0%,
    rgba(45, 212, 191, 0.05) 100%
  );
}

.result-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.result-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  text-align: center;
}

.result-item .label {
  color: var(--text-dim);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.result-item .value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--teal);
}

.result-item .value .max {
  font-size: 1rem;
  color: var(--text-dim);
  font-weight: 400;
}

.category {
  display: inline-block;
  font-weight: 600;
  padding: 0.5rem 1.5rem;
  border-radius: 12px;
  font-size: 1.1rem;
  text-align: center;
}

.category.unicorn {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
}
.category.top {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
}
.category.gold {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}
.category.work {
  background: linear-gradient(135deg, #ca8a04, #eab308);
}
.category.risk {
  background: linear-gradient(135deg, #ea580c, #f97316);
}
.category.unfit {
  background: linear-gradient(135deg, #dc2626, #ef4444);
}

.description {
  color: var(--text);
  line-height: 1.7;
  text-align: center;
}

.alert {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  text-align: center;
}

.alert-danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.alert-warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.btn-primary {
  position: relative;
  display: block;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, var(--teal) 0%, #14b8a6 100%);
  color: #09090b;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 30px var(--teal-glow);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 50px var(--teal-glow);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.ai-card {
  border-color: var(--teal);
  margin-top: 1rem;
}

.ai-card h3 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--teal);
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.ai-content {
  text-align: center;
}

.ai-content p {
  margin-bottom: 1rem;
  color: var(--text);
  line-height: 1.8;
}

.ai-content p:last-child {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  h1 {
    font-size: 1.5rem;
  }
  .col-value {
    width: 80px;
  }
  .col-value input {
    width: 50px;
    font-size: 1rem;
  }
  .result-header {
    flex-direction: column;
    gap: 1rem;
  }
  .result-item .value {
    font-size: 2rem;
  }
  .card {
    padding: 1rem;
  }
  td,
  th {
    padding: 0.75rem 0.5rem;
  }
}
</style>
