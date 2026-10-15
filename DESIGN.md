# MOTORENT ĐÀ NẴNG — VESPER DESIGN SYSTEM SPECIFICATION

## 1. Theme Selection & Aesthetic Rationale
Among the 9 classic dark themes (`Default Dark`, `Catppuccin`, `Dracula`, `Gruvbox Material`, `Monokai`, `One Dark Pro`, `Tokyo Night`, `Solarized Dark`, `Vesper`), **Vesper** (created by Rauno Freiberg) is the architectural color system applied across 100% of **Motorent Đà Nẵng**.

Why **Vesper** fits Motorent best:
- **Matte Carbon & Anodized Aluminum Surfaces**: Replaces cold, generic AI blue-slate (`#0E141D`) and dark forest green (`#050D0A`) with pure matte carbon obsidian (`#101010` -> `#161616` -> `#1E1E1E` -> `#0A0A0A`).
- **Warm Coastal Champagne Amber (`#FFC799`)**: Replaces neon sky-blue (`#38BDF8`) and neon emerald (`#10B981`) with warm champagne peach/amber (`#FFC799`), evoking sunset light over Mỹ Khê Beach and mechanical brass/copper instrument dials.
- **High-Contrast Telemetry Mint (`#99FFE4`) & Soft Coral (`#FF8080`)**: Provides unmistakable semantic status indicators for live station availability, Socket.IO connection state, eKYC verification, and alerts without visual noise.

---

## 2. Surface & Color Tokens (`client/src/index.css`)

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#101010` | Main page background canvas across all routes |
| `--bg-surface` | `#161616` | Primary elevated card surface, navbar & modal shells |
| `--bg-elevated` | `#1E1E1E` | Interactive sub-cards, segmented pills, filter chips |
| `--bg-hover` | `#262626` | Hover state for cards, rows, and secondary buttons |
| `--bg-well` | `#0A0A0A` | Recessed input fields, search bars, code & signature wells |
| `--bg-studio-paper` | `#F3F2EE` | Warm studio stone backdrop for motorcycle photography |
| `--text-primary` | `#F5F5F5` | Crisp alabaster white for headings, prices, and primary labels |
| `--text-secondary` | `#A0A0A0` | Neutral pewter grey for body copy and descriptions |
| `--text-muted` | `#6E6E6E` | Muted ash grey for metadata, timestamps, and hints |
| `--accent-primary` | `#FFC799` | Primary CTA buttons (with `#101010` text), active tabs, icons, highlights |
| `--accent-hover` | `#FFD6B3` | Hover state for primary buttons and active highlights |
| `--accent-status` | `#99FFE4` | Vesper Mint for live station status dots, verified eKYC, and completed states |
| `--accent-danger` | `#FF8080` | Vesper Soft Coral for unread badges, destructive actions, and error states |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | 1px architectural hairline borders |
| `--border-strong` | `rgba(255, 199, 153, 0.35)` | Active/focused card and input borders |
