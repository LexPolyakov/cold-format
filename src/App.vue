<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import {
  getCriteria,
  analyzeScores,
  buildPrompt,
  type AnalysisResult,
  type Gender,
} from "./composables/useScale";

const gender = ref<Gender>("female");
const criteria = computed(() => getCriteria(gender.value));

const scores = ref<number[]>(Array(10).fill(0));
const aiResponse = ref("");
const isLoading = ref(false);
const error = ref("");
const aiCardRef = ref<HTMLElement | null>(null);

const analysis = computed<AnalysisResult>(() =>
  analyzeScores(scores.value, gender.value)
);
const allZeros = computed(() => scores.value.every((s) => s === 0));
// const buildTime = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";

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
    const res = await fetch(`${apiUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildPrompt(scores.value, analysis.value, gender.value),
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

function setScore(i: number, e: Event) {
  const raw = (e.target as HTMLInputElement).value;
  if (raw === "") {
    scores.value[i] = 0;
    return;
  }
  const digits = raw.replace(/\D/g, "");
  const n =
    digits === ""
      ? 0
      : Math.min(MAX_SCORE, Math.max(MIN_SCORE, Number(digits)));
  scores.value[i] = n;
}
</script>

<template>
  <div class="app">
    <div class="container">
      <header class="header">
        <h1>COLD FORMAT <span class="by">(by Lex)</span></h1>
        <p class="subtitle">Проставь баллы от 0 до 10 по каждому критерию</p>
      </header>

      <div class="gender-switch">
        <button
          type="button"
          class="gender-btn"
          :class="{ active: gender === 'female' }"
          @click="gender = 'female'"
          title="Женский"
        >
          <svg class="gender-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="9" r="5"/>
            <line x1="12" y1="14" x2="12" y2="20"/>
            <line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
        </button>
        <button
          type="button"
          class="gender-btn"
          :class="{ active: gender === 'male' }"
          @click="gender = 'male'"
          title="Мужской"
        >
          <svg class="gender-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="14" r="5"/>
            <line x1="12" y1="9" x2="12" y2="2"/>
            <line x1="9" y1="5" x2="12" y2="2"/>
            <line x1="12" y1="2" x2="15" y2="5"/>
          </svg>
        </button>
      </div>

      <div class="card table-card">
        <table>
          <thead>
            <tr>
              <th class="col-num">№</th>
              <th class="col-criteria">Критерий</th>
              <th class="col-value">Оценка</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in criteria" :key="c.id">
              <td class="col-num">{{ c.id }}</td>
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
              >{{ analysis.total }}<span class="max">/100</span></span
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
        {{ isLoading ? "Анализирую..." : "Получить анализ и стратегию" }}
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

.gender-switch {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-bottom: 1.5rem;
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

.gender-btn:not(.active):hover {
  border-color: rgba(45, 212, 191, 0.35);
  color: var(--text);
}

.gender-icon {
  width: 24px;
  height: 24px;
  display: block;
  flex-shrink: 0;
}

/* .gender-btn.active .gender-symbol.female {
  color: #ec4899;
} */

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

.col-num {
  width: 50px;
  text-align: center;
  color: var(--teal);
  font-weight: 600;
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
    font-size: 1.75rem;
  }
  .col-num,
  th.col-num {
    display: none;
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
