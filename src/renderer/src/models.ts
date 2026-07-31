import metaLogo from '@lobehub/icons-static-svg/icons/meta-color.svg'
import qwenLogo from '@lobehub/icons-static-svg/icons/qwen-color.svg'
import googleLogo from '@lobehub/icons-static-svg/icons/google-color.svg'
import deepseekLogo from '@lobehub/icons-static-svg/icons/deepseek-color.svg'
import microsoftLogo from '@lobehub/icons-static-svg/icons/microsoft-color.svg'
import openaiLogo from '@lobehub/icons-static-svg/icons/openai.svg'
import mistralLogo from '@lobehub/icons-static-svg/icons/mistral-color.svg'

export type Category = 'general' | 'coding' | 'reasoning' | 'vision'

export type Vendor = 'meta' | 'qwen' | 'google' | 'deepseek' | 'microsoft' | 'openai' | 'mistral'

export const VENDORS: Record<Vendor, { label: string; logo: string }> = {
  meta: { label: 'Meta', logo: metaLogo },
  qwen: { label: 'Qwen', logo: qwenLogo },
  google: { label: 'Google', logo: googleLogo },
  deepseek: { label: 'DeepSeek', logo: deepseekLogo },
  microsoft: { label: 'Microsoft', logo: microsoftLogo },
  openai: { label: 'OpenAI', logo: openaiLogo },
  mistral: { label: 'Mistral', logo: mistralLogo }
}

export const CATEGORY_LABEL: Record<Category, string> = {
  general: 'General',
  coding: 'Coding',
  reasoning: 'Reasoning',
  vision: 'Vision'
}

export interface CuratedModel {
  tag: string
  /** The same model as a HuggingFace GGUF repo (repo[:quant]) for
   * llama-server -hf, which downloads and caches it on first launch. Repos
   * verified against the HF API July 31 2026. */
  gguf: string
  title: string
  params: string
  vendor: Vendor
  category: Category
  blurb: string
  downloadGB: number
  ramGB: number
}

// Ordered smallest to largest so grouping by fit reads naturally.
export const CURATED: CuratedModel[] = [
  {
    tag: 'llama3.2:1b',
    gguf: 'bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M',
    vendor: 'meta',
    title: 'Llama 3.2',
    params: '1B',
    category: 'general',
    blurb: 'Tiny and instant, runs on almost anything',
    downloadGB: 1.3,
    ramGB: 2
  },
  {
    tag: 'llama3.2:3b',
    gguf: 'bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M',
    vendor: 'meta',
    title: 'Llama 3.2',
    params: '3B',
    category: 'general',
    blurb: 'Surprisingly capable for its size',
    downloadGB: 2.0,
    ramGB: 4
  },
  {
    tag: 'qwen3:4b',
    gguf: 'Qwen/Qwen3-4B-GGUF:Q4_K_M',
    vendor: 'qwen',
    title: 'Qwen3',
    params: '4B',
    category: 'general',
    blurb: 'Small but sharp, with a thinking mode',
    downloadGB: 2.6,
    ramGB: 5
  },
  {
    tag: 'gemma3:4b',
    gguf: 'ggml-org/gemma-3-4b-it-GGUF',
    vendor: 'google',
    title: 'Gemma 3',
    params: '4B',
    category: 'vision',
    blurb: 'Light and snappy, can look at images',
    downloadGB: 3.3,
    ramGB: 5
  },
  {
    tag: 'llama3.1:8b',
    gguf: 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF:Q4_K_M',
    vendor: 'meta',
    title: 'Llama 3.1',
    params: '8B',
    category: 'general',
    blurb: 'Fast all-rounder and a great first model',
    downloadGB: 4.9,
    ramGB: 8
  },
  {
    tag: 'qwen2.5-coder:7b',
    gguf: 'bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M',
    vendor: 'qwen',
    title: 'Qwen2.5 Coder',
    params: '7B',
    category: 'coding',
    blurb: 'Best small model for writing and explaining code',
    downloadGB: 4.7,
    ramGB: 8
  },
  {
    tag: 'deepseek-r1:8b',
    gguf: 'unsloth/DeepSeek-R1-0528-Qwen3-8B-GGUF:Q4_K_M',
    vendor: 'deepseek',
    title: 'DeepSeek-R1',
    params: '8B',
    category: 'reasoning',
    blurb: 'Thinks step by step before answering',
    downloadGB: 5.2,
    ramGB: 8
  },
  {
    tag: 'qwen3:8b',
    gguf: 'Qwen/Qwen3-8B-GGUF:Q4_K_M',
    vendor: 'qwen',
    title: 'Qwen3',
    params: '8B',
    category: 'general',
    blurb: 'Strong all-rounder with built-in reasoning',
    downloadGB: 5.2,
    ramGB: 8
  },
  {
    tag: 'gemma3:12b',
    gguf: 'ggml-org/gemma-3-12b-it-GGUF',
    vendor: 'google',
    title: 'Gemma 3',
    params: '12B',
    category: 'vision',
    blurb: 'Excellent writing, understands images',
    downloadGB: 8.1,
    ramGB: 11
  },
  {
    tag: 'phi4:14b',
    gguf: 'bartowski/phi-4-GGUF:Q4_K_M',
    vendor: 'microsoft',
    title: 'Phi-4',
    params: '14B',
    category: 'general',
    blurb: 'Punches above its weight in math and logic',
    downloadGB: 9.1,
    ramGB: 12
  },
  {
    tag: 'qwen3:14b',
    gguf: 'Qwen/Qwen3-14B-GGUF:Q4_K_M',
    vendor: 'qwen',
    title: 'Qwen3',
    params: '14B',
    category: 'general',
    blurb: 'Stronger reasoning, still quick',
    downloadGB: 9.3,
    ramGB: 13
  },
  {
    tag: 'qwen2.5-coder:14b',
    gguf: 'bartowski/Qwen2.5-Coder-14B-Instruct-GGUF:Q4_K_M',
    vendor: 'qwen',
    title: 'Qwen2.5 Coder',
    params: '14B',
    category: 'coding',
    blurb: 'Serious coding help without huge memory needs',
    downloadGB: 9.0,
    ramGB: 13
  },
  {
    tag: 'gpt-oss:20b',
    gguf: 'ggml-org/gpt-oss-20b-GGUF:MXFP4',
    vendor: 'openai',
    title: 'GPT-OSS',
    params: '20B',
    category: 'reasoning',
    blurb: "OpenAI's open-weight model, built for reasoning and tools",
    downloadGB: 14,
    ramGB: 16
  },
  {
    tag: 'mistral-small3.2:24b',
    gguf: 'unsloth/Mistral-Small-3.2-24B-Instruct-2506-GGUF:Q4_K_M',
    vendor: 'mistral',
    title: 'Mistral Small 3.2',
    params: '24B',
    category: 'general',
    blurb: 'Efficient all-rounder that also reads images',
    downloadGB: 15,
    ramGB: 18
  },
  {
    tag: 'gemma3:27b',
    gguf: 'ggml-org/gemma-3-27b-it-GGUF',
    vendor: 'google',
    title: 'Gemma 3',
    params: '27B',
    category: 'vision',
    blurb: 'Top-tier writing and image understanding',
    downloadGB: 17,
    ramGB: 21
  },
  {
    tag: 'qwen3:30b',
    gguf: 'Qwen/Qwen3-30B-A3B-GGUF:Q4_K_M',
    vendor: 'qwen',
    title: 'Qwen3',
    params: '30B MoE',
    category: 'general',
    blurb: 'Best overall quality, fast for its size (MoE)',
    downloadGB: 19,
    ramGB: 23
  },
  {
    tag: 'deepseek-r1:32b',
    gguf: 'bartowski/DeepSeek-R1-Distill-Qwen-32B-GGUF:Q4_K_M',
    vendor: 'deepseek',
    title: 'DeepSeek-R1',
    params: '32B',
    category: 'reasoning',
    blurb: 'Deep, careful reasoning for hard problems',
    downloadGB: 20,
    ramGB: 24
  },
  {
    tag: 'qwen2.5-coder:32b',
    gguf: 'bartowski/Qwen2.5-Coder-32B-Instruct-GGUF:Q4_K_M',
    vendor: 'qwen',
    title: 'Qwen2.5 Coder',
    params: '32B',
    category: 'coding',
    blurb: 'Near frontier-level coding, fully local',
    downloadGB: 20,
    ramGB: 24
  },
  {
    tag: 'llama3.3:70b',
    gguf: 'bartowski/Llama-3.3-70B-Instruct-GGUF:Q4_K_M',
    vendor: 'meta',
    title: 'Llama 3.3',
    params: '70B',
    category: 'general',
    blurb: 'Flagship quality, needs a big machine',
    downloadGB: 43,
    ramGB: 48
  },
  {
    tag: 'gpt-oss:120b',
    gguf: 'ggml-org/gpt-oss-120b-GGUF:MXFP4',
    vendor: 'openai',
    title: 'GPT-OSS',
    params: '120B MoE',
    category: 'reasoning',
    blurb: "OpenAI's largest open model, workstation class",
    downloadGB: 65,
    ramGB: 80
  }
]

export interface DeviceInfo {
  totalMemGB: number
  arch: string
  platform: string
  cpuModel: string
}

export function deviceLabel(d: DeviceInfo): string {
  const os =
    d.platform === 'darwin' ? 'macOS' : d.platform === 'win32' ? 'Windows' : 'Linux'
  const chip =
    d.platform === 'darwin' && d.arch === 'arm64'
      ? 'Apple Silicon'
      : d.cpuModel.replace(/\(R\)|\(TM\)|CPU|Processor/g, '').replace(/\s+/g, ' ').trim()
  return chip ? `${os} · ${chip}` : os
}

export type Fit = 'great' | 'slow' | 'no'

// A model needs its weights plus KV cache and OS headroom in unified memory;
// past ~75% of total RAM things start swapping and crawl.
export function fitFor(model: CuratedModel, totalMemGB: number): Fit {
  if (model.ramGB <= totalMemGB * 0.75) return 'great'
  if (model.ramGB <= totalMemGB) return 'slow'
  return 'no'
}

export function ggufFor(tag: string): string {
  return CURATED.find((m) => m.tag === tag)?.gguf ?? tag
}

export function recommendedTag(totalMemGB: number): string {
  const fits = CURATED.filter((m) => fitFor(m, totalMemGB) === 'great')
  if (fits.length === 0) return CURATED[0].tag
  return fits.reduce((a, b) => (b.ramGB > a.ramGB ? b : a)).tag
}
